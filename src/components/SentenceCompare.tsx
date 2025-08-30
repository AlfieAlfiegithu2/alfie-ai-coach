import React from "react";
import { Span } from "./CorrectionVisualizer";

interface SentenceCompareProps {
  originalSpans: Span[];
  correctedSpans: Span[];
  dimNeutral?: boolean;
}

// Utilities mirroring backend tokenization/diff to align corrected text to original sentences
const TOKEN_REGEX = /\w+|\s+|[^\w\s]/g;

type Token = { t: string; start: number; end: number };

function tokenizeWithPos(input: string): Token[] {
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_REGEX);
  re.lastIndex = 0;
  while ((m = re.exec(input)) !== null) {
    const t = m[0];
    tokens.push({ t, start: m.index, end: m.index + t.length });
  }
  return tokens;
}

// Classic LCS-based diff over token strings
function diffTokens(a: string[], b: string[]) {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  type Op = { type: 'equal' | 'insert' | 'delete'; a?: string[]; b?: string[] };
  const ops: Op[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      const tk = a[i];
      if (!ops.length || ops[ops.length - 1].type !== 'equal') ops.push({ type: 'equal', a: [], b: [] });
      ops[ops.length - 1].a!.push(tk);
      ops[ops.length - 1].b!.push(tk);
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      const tk = a[i];
      if (!ops.length || ops[ops.length - 1].type !== 'delete') ops.push({ type: 'delete', a: [], b: [] });
      ops[ops.length - 1].a!.push(tk);
      i++;
    } else {
      const tk = b[j];
      if (!ops.length || ops[ops.length - 1].type !== 'insert') ops.push({ type: 'insert', a: [], b: [] });
      ops[ops.length - 1].b!.push(tk);
      j++;
    }
  }
  while (i < n) { const tk = a[i++]; if (!ops.length || ops[ops.length - 1].type !== 'delete') ops.push({ type: 'delete', a: [], b: [] }); ops[ops.length - 1].a!.push(tk); }
  while (j < m) { const tk = b[j++]; if (!ops.length || ops[ops.length - 1].type !== 'insert') ops.push({ type: 'insert', a: [], b: [] }); ops[ops.length - 1].b!.push(tk); }
  return ops;
}

// Build alignment from A tokens to B tokens using diff ops
function buildAlignment(aTokens: Token[], bTokens: Token[]) {
  const ops = diffTokens(aTokens.map(t => t.t), bTokens.map(t => t.t));
  const insertsBefore: number[][] = Array.from({ length: aTokens.length + 1 }, () => []);
  const equalMap = new Map<number, number>(); // A index -> B index
  let iA = 0, iB = 0;
  for (const op of ops) {
    if (op.type === 'equal') {
      const len = op.a!.length;
      for (let k = 0; k < len; k++) {
        equalMap.set(iA, iB);
        iA++; iB++;
      }
    } else if (op.type === 'delete') {
      const len = op.a!.length;
      for (let k = 0; k < len; k++) {
        iA++;
      }
    } else if (op.type === 'insert') {
      const len = op.b!.length;
      for (let k = 0; k < len; k++) {
        insertsBefore[iA].push(iB);
        iB++;
      }
    }
  }
  return { insertsBefore, equalMap };
}

// Compute sentence boundaries (original only)
function sentenceRanges(text: string) {
  const ranges: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isEnd = ch === '.' || ch === '!' || ch === '?' || ch === '\n';
    const atEnd = i === text.length - 1;
    if (isEnd || atEnd) {
      const end = atEnd && !isEnd ? i + 1 : i + 1;
      ranges.push({ start, end });
      let j = end;
      while (j < text.length && /\s/.test(text[j])) j++;
      start = j;
      i = j - 1;
    }
  }
  if (!ranges.length && text.length === 0) ranges.push({ start: 0, end: 0 });
  return ranges;
}

function buildIndex(spans: Span[]) {
  const map: { start: number; end: number; span: Span }[] = [];
  let pos = 0;
  for (const s of spans) {
    const len = (s.text || '').length;
    map.push({ start: pos, end: pos + len, span: s });
    pos += len;
  }
  return { map, length: pos };
}

function sliceSpans(spans: Span[], start: number, end: number): Span[] {
  const { map } = buildIndex(spans);
  const out: Span[] = [];
  for (const rec of map) {
    const a = Math.max(rec.start, start);
    const b = Math.min(rec.end, end);
    if (b > a) {
      const offset = a - rec.start;
      const text = (rec.span.text || '').slice(offset, offset + (b - a));
      const last = out[out.length - 1];
      if (last && last.status === rec.span.status) last.text += text;
      else out.push({ text, status: rec.span.status });
    }
  }
  return out;
}

const spanClass = (status: Span['status'], side: 'left' | 'right', dimNeutral = false) => {
  if (side === 'left') {
    if (status === 'error') return 'bg-brand-red/10 text-brand-red border-b-2 border-brand-red/50';
    return dimNeutral ? 'text-text-primary opacity-50' : 'text-text-primary';
  }
  if (status === 'improvement') return 'bg-brand-green/10 text-brand-green border-b-2 border-brand-green/50';
  return dimNeutral ? 'text-text-primary opacity-50' : 'text-text-primary';
};

const SentenceCompare: React.FC<SentenceCompareProps> = ({ originalSpans, correctedSpans, dimNeutral = false }) => {
  const originalText = originalSpans.map(s => s.text).join('');
  const correctedText = correctedSpans.map(s => s.text).join('');

  const aTokens = tokenizeWithPos(originalText);
  const bTokens = tokenizeWithPos(correctedText);
  const { insertsBefore, equalMap } = buildAlignment(aTokens, bTokens);

  const ranges = sentenceRanges(originalText);

  const rows = ranges.map((rng, idx) => {
    // Find A token index range overlapping this sentence
    let aStartIdx = -1, aEndIdx = -1;
    for (let i = 0; i < aTokens.length; i++) {
      const tk = aTokens[i];
      if (tk.end > rng.start && tk.start < rng.end) {
        if (aStartIdx === -1) aStartIdx = i;
        aEndIdx = i;
      }
    }

    // Slice original spans by char range
    const oSegs = sliceSpans(originalSpans, rng.start, rng.end);

    // Build B token index list aligned to this sentence
    const bIdxs: number[] = [];
    const pushIns = (iA: number) => {
      const arr = insertsBefore[iA] || [];
      for (const bi of arr) bIdxs.push(bi);
    };

    if (aStartIdx !== -1 && aEndIdx !== -1) {
      pushIns(aStartIdx);
      for (let ai = aStartIdx; ai <= aEndIdx; ai++) {
        const bi = equalMap.get(ai);
        if (typeof bi === 'number') bIdxs.push(bi);
        pushIns(ai + 1);
      }
    }

    // Determine corrected char range
    let cSegs: Span[] = [];
    if (bIdxs.length) {
      const cStart = bTokens[bIdxs[0]].start;
      const cEnd = bTokens[bIdxs[bIdxs.length - 1]].end;
      cSegs = sliceSpans(correctedSpans, cStart, cEnd);
    }

    return (
      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface-3 p-4 border border-border">
          <div className="text-caption mb-2 text-text-tertiary">Original – sentence {idx + 1}</div>
          <div className="text-sm leading-relaxed text-text-secondary">
            {oSegs.length ? oSegs.map((s, i) => (
              <span key={`o-${idx}-${i}`} className={spanClass(s.status, 'left', dimNeutral)}>{s.text}</span>
            )) : <span className="text-text-tertiary">—</span>}
          </div>
        </div>
        <div className="rounded-2xl bg-surface-3 p-4 border border-border">
          <div className="text-caption mb-2 text-text-tertiary">Improved – sentence {idx + 1}</div>
          <div className="text-sm leading-relaxed text-text-secondary">
            {bIdxs.length && cSegs.length ? cSegs.map((s, i) => (
              <span key={`c-${idx}-${i}`} className={spanClass(s.status, 'right', dimNeutral)}>{s.text}</span>
            )) : <span className="text-text-tertiary">—</span>}
          </div>
        </div>
      </div>
    );
  });

  return <div className="space-y-3">{rows}</div>;
};

export default SentenceCompare;
