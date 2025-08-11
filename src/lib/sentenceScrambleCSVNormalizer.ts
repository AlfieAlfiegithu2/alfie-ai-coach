export type NormalizedRow = {
  skill_type: "Sentence Structure Scramble";
  skill_test_id: string;
  question_format: "SentenceScramble";
  content: string; // instruction or prompt (WordOrSentence)
  correct_answer: string; // first chunk
  incorrect_answers: string[]; // remaining chunks (up to 3)
  explanation?: string;
  original_sentence: string; // full correct sentence
};

export type NormalizedOutput = {
  ok: boolean;
  skill_type: "Sentence Structure Scramble";
  skill_test_id: string;
  insert: NormalizedRow[];
  warnings: { row: number; message: string }[];
  errors: { row: number; message: string; raw: Record<string, string> }[];
  summary: {
    rows_received: number;
    rows_valid: number;
    rows_with_warnings: number;
    rows_with_errors: number;
  };
};

const REQUIRED_HEADERS = [
  "QuestionFormat",
  "original_sentence",
  "WordOrSentence",
  "CorrectAnswer",
  "IncorrectAnswer1",
  "IncorrectAnswer2",
  "IncorrectAnswer3",
  "Explanation",
] as const;

function stripBOM(s: string) { return s.replace(/^\uFEFF/, ""); }
function normalizeQuotes(s: string) { return s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'"); }
function sanitizeHTML(s: string) { return s.replace(/<[^>]*>/g, ""); }
function collapseWhitespace(s: string) { return s.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim(); }
function truncate180(s: string) { if (s.length <= 180) return s; const cut = s.slice(0, 180); const last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf(","), cut.lastIndexOf(";"), cut.lastIndexOf(":")); return (last > 60 ? cut.slice(0, last) : cut).trim(); }

function csvParseLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (ch === "," && !inQuotes) { out.push(cur); cur = ""; } else { cur += ch; }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectAndNormalizeDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
  const comma = (first.match(/,/g) || []).length;
  const semi = (first.match(/;/g) || []).length;
  return semi > 0 && comma === 0 ? text.replace(/;/g, ",") : text;
}

function isSentenceScramble(fmt: string): boolean {
  const v = fmt.replace(/[^a-z]/gi, "").toLowerCase();
  return ["sentencescramble", "sentencestructure", "sentencestructure scramble".replace(/\s/g, "")].includes(v);
}

export function normalizeSentenceScrambleCSV(
  file_text: string,
  skill_type: "Sentence Structure Scramble",
  skill_test_id: string
): NormalizedOutput {
  const warnings: { row: number; message: string }[] = [];
  const errors: { row: number; message: string; raw: Record<string, string> }[] = [];
  const insert: NormalizedRow[] = [];

  let text = stripBOM(file_text || "");
  text = normalizeQuotes(text);
  text = detectAndNormalizeDelimiter(text);

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      ok: false,
      skill_type,
      skill_test_id,
      insert: [],
      warnings: [],
      errors: [{ row: 0, message: `Missing headers. Expected: ${REQUIRED_HEADERS.join(",")}`, raw: {} }],
      summary: { rows_received: 0, rows_valid: 0, rows_with_warnings: 0, rows_with_errors: 0 },
    };
  }

  const rawHeader = csvParseLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const headerMap: Record<string, number> = {};
  rawHeader.forEach((h, idx) => (headerMap[h] = idx));
  const missing = REQUIRED_HEADERS.filter((h) => headerMap[h] === undefined);
  if (missing.length > 0) {
    return {
      ok: false,
      skill_type,
      skill_test_id,
      insert: [],
      warnings: [],
      errors: [{ row: 0, message: `Missing required headers: ${missing.join("; ")}. Expected: ${REQUIRED_HEADERS.join(",")}`, raw: Object.fromEntries(rawHeader.map((h,i)=>[i.toString(),h])) }],
      summary: { rows_received: 0, rows_valid: 0, rows_with_warnings: 0, rows_with_errors: 0 },
    };
  }

  const rows = lines.slice(1);
  rows.forEach((line, idx) => {
    const rowNumber = idx + 1;
    const cols = csvParseLine(line);
    const get = (name: (typeof REQUIRED_HEADERS)[number]) => collapseWhitespace(sanitizeHTML(cols[headerMap[name]] || ""));

    const QuestionFormat = get("QuestionFormat");
    const original_sentence = truncate180(get("original_sentence"));
    let WordOrSentence = truncate180(get("WordOrSentence"));
    const CorrectAnswer = truncate180(get("CorrectAnswer"));
    const IncorrectAnswer1 = truncate180(get("IncorrectAnswer1"));
    const IncorrectAnswer2 = truncate180(get("IncorrectAnswer2"));
    const IncorrectAnswer3 = truncate180(get("IncorrectAnswer3"));
    const Explanation = truncate180(get("Explanation"));

    const rawObj = { QuestionFormat, original_sentence, WordOrSentence, CorrectAnswer, IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3, Explanation };

    if (!QuestionFormat || !original_sentence || !CorrectAnswer) {
      errors.push({ row: rowNumber, message: "Missing critical fields (QuestionFormat, original_sentence, or CorrectAnswer)", raw: rawObj });
      return;
    }

    if (!isSentenceScramble(QuestionFormat)) {
      errors.push({ row: rowNumber, message: `Unrecognized QuestionFormat: ${QuestionFormat} (expected SentenceScramble)`, raw: rawObj });
      return;
    }

    const chunks = [CorrectAnswer, IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3].filter(Boolean);
    if (chunks.length < 2) {
      warnings.push({ row: rowNumber, message: "Fewer than 2 chunks provided; skipping" });
      return;
    }

    if (!WordOrSentence) {
      WordOrSentence = "Unscramble the sentence.";
    }

    insert.push({
      skill_type,
      skill_test_id,
      question_format: "SentenceScramble",
      content: WordOrSentence,
      correct_answer: chunks[0],
      incorrect_answers: chunks.slice(1, 4),
      explanation: Explanation || undefined,
      original_sentence,
    });
  });

  const rows_with_warnings = new Set(warnings.map((w) => w.row)).size;
  return {
    ok: insert.length > 0,
    skill_type,
    skill_test_id,
    insert,
    warnings,
    errors,
    summary: {
      rows_received: rows.length,
      rows_valid: insert.length,
      rows_with_warnings,
      rows_with_errors: errors.length,
    },
  };
}
