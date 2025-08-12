import React from "react";
import { Span } from "./CorrectionVisualizer";

interface SentenceCompareProps {
  originalSpans: Span[];
  correctedSpans: Span[];
  dimNeutral?: boolean;
}

// Local span class logic to avoid coupling
const spanClass = (status: Span["status"], side: "left" | "right", dimNeutral = false) => {
  if (side === "left") {
    if (status === "error") return "bg-brand-red/10 text-brand-red border-b-2 border-brand-red/50";
    return dimNeutral ? "text-text-primary opacity-50" : "text-text-primary";
  }
  if (status === "improvement") return "bg-brand-green/10 text-brand-green border-b-2 border-brand-green/50";
  return dimNeutral ? "text-text-primary opacity-50" : "text-text-primary";
};

// Build an index map of spans to slice by character ranges
function buildIndex(spans: Span[]) {
  const map: { start: number; end: number; span: Span }[] = [];
  let pos = 0;
  for (const s of spans) {
    const len = (s.text || "").length;
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
      const text = (rec.span.text || "").slice(offset, offset + (b - a));
      const last = out[out.length - 1];
      if (last && last.status === rec.span.status) last.text += text;
      else out.push({ text, status: rec.span.status });
    }
  }
  return out;
}

// Simple sentence boundary detection: split on ., !, ? or newline
function sentenceRanges(text: string) {
  const ranges: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isEnd = ch === "." || ch === "!" || ch === "?" || ch === "\n";
    const atEnd = i === text.length - 1;
    if (isEnd || atEnd) {
      const end = atEnd && !isEnd ? i + 1 : i + 1; // include terminator
      // Trim leading/trailing spaces from the slice but keep indices aligned by expanding to next non-space
      // For visual clarity, we keep as-is to preserve highlights accurately
      ranges.push({ start, end });
      // Next sentence starts at next non-space char
      let j = end;
      while (j < text.length && /\s/.test(text[j])) j++;
      start = j;
      i = j - 1;
    }
  }
  // Fallback if text empty
  if (!ranges.length && text.length === 0) ranges.push({ start: 0, end: 0 });
  return ranges;
}

const SentenceCompare: React.FC<SentenceCompareProps> = ({ originalSpans, correctedSpans, dimNeutral = false }) => {
  const originalText = originalSpans.map(s => s.text).join("");
  const correctedText = correctedSpans.map(s => s.text).join("");

  const oRanges = sentenceRanges(originalText);
  const cRanges = sentenceRanges(correctedText);
  const rows = Math.max(oRanges.length, cRanges.length);

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => {
        const o = oRanges[idx];
        const c = cRanges[idx];
        const oSegs = o ? sliceSpans(originalSpans, o.start, o.end) : [];
        const cSegs = c ? sliceSpans(correctedSpans, c.start, c.end) : [];
        return (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-surface-3 p-4 border border-border">
              <div className="text-caption mb-2 text-text-tertiary">Original – sentence {idx + 1}</div>
              <div className="text-sm leading-relaxed text-text-secondary">
                {oSegs.length ? oSegs.map((s, i) => (
                  <span key={`o-${idx}-${i}`} className={spanClass(s.status, "left", dimNeutral)}>{s.text}</span>
                )) : <span className="text-text-tertiary">—</span>}
              </div>
            </div>
            <div className="rounded-2xl bg-surface-3 p-4 border border-border">
              <div className="text-caption mb-2 text-text-tertiary">Improved – sentence {idx + 1}</div>
              <div className="text-sm leading-relaxed text-text-secondary">
                {cSegs.length ? cSegs.map((s, i) => (
                  <span key={`c-${idx}-${i}`} className={spanClass(s.status, "right", dimNeutral)}>{s.text}</span>
                )) : <span className="text-text-tertiary">—</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SentenceCompare;
