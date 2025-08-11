export type ListeningQuestionFormat = "Listening_Dictation" | "Listening_MultipleChoice";

export type NormalizedRow = {
  skill_type: "Listening for Details";
  skill_test_id: string;
  question_format: ListeningQuestionFormat;
  content: string; // instruction or question text
  correct_answer: string;
  incorrect_answers: string[]; // for dictation: acceptable variations; for MC: distractors
  explanation?: string;
  original_sentence?: string | null; // transcript
  audio_url?: string; // path within bucket, e.g., `${testId}/file.mp3`
};

export type NormalizedOutput = {
  ok: boolean;
  skill_type: "Listening for Details";
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
function csvParseLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (ch === "," && !inQuotes) { out.push(cur); cur = ""; }
    else { cur += ch; }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function detectAndNormalizeDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
  const comma = (first.match(/,/g) || []).length; const semi = (first.match(/;/g) || []).length;
  return semi > 0 && comma === 0 ? text.replace(/;/g, ",") : text;
}

function closestFormat(value: string): ListeningQuestionFormat | null {
  const v = value.replace(/[^a-z]/gi, "").toLowerCase();
  if (["listeningdictation", "dictation", "listening_shortanswer"].includes(v)) return "Listening_Dictation";
  if (["listeningmultiplechoice", "listeningmcq", "comprehension"].includes(v)) return "Listening_MultipleChoice";
  return null;
}

function truncate(s: string, n = 300) {
  if (s.length <= n) return s; const cut = s.slice(0, n);
  const last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf(","), cut.lastIndexOf(";"), cut.lastIndexOf(":"));
  return (last > 60 ? cut.slice(0, last) : cut).trim();
}

export function normalizeListeningCSV(
  file_text: string,
  skill_type: "Listening for Details",
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
      ok: false, skill_type, skill_test_id, insert: [], warnings: [], errors: [{ row: 0, message: `Missing headers. Expected: ${REQUIRED_HEADERS.join(",")}`, raw: {} }],
      summary: { rows_received: 0, rows_valid: 0, rows_with_warnings: 0, rows_with_errors: 0 },
    };
  }

  // Header handling with flexible aliases (case-insensitive, ignores spaces/underscores/dashes)
  const canon = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const ALIASES: Partial<Record<(typeof REQUIRED_HEADERS)[number] | "audio_url", string[]>> = {
    QuestionFormat: ["format", "type", "qformat"],
    audio_url: ["audio", "audiourl", "audiofile", "file", "filename", "audiofilename", "mp3"],
    original_sentence: ["transcript", "transcription", "original", "sentence", "audiotranscript"],
    WordOrSentence: ["instruction", "prompt", "question", "questiontext", "stem"],
    CorrectAnswer: ["answer", "correct", "key"],
    IncorrectAnswer1: ["incorrect1", "wrong1", "distractor1", "option2", "choiceb", "b"],
    IncorrectAnswer2: ["incorrect2", "wrong2", "distractor2", "option3", "choicec", "c"],
    IncorrectAnswer3: ["incorrect3", "wrong3", "distractor3", "option4", "choiced", "d"],
    Explanation: ["rationale", "why", "notes", "feedback"],
  };

  const rawHeader = csvParseLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const headerCanonMap: Record<string, number> = {};
  rawHeader.forEach((h, idx) => { headerCanonMap[canon(h)] = idx; });

  const findIndexFor = (name: (typeof REQUIRED_HEADERS)[number]): number | undefined => {
    const primary = canon(name as string);
    const aliases = [primary, ...(ALIASES[name]?.map(canon) || [])];
    for (const a of aliases) {
      if (headerCanonMap[a] !== undefined) return headerCanonMap[a];
    }
    return undefined;
  };

  const missing: string[] = [];
  (REQUIRED_HEADERS as readonly string[]).forEach((h) => {
    if (findIndexFor(h as (typeof REQUIRED_HEADERS)[number]) === undefined) missing.push(h);
  });
  if (missing.length > 0) {
    return {
      ok: false, skill_type, skill_test_id, insert: [], warnings: [],
      errors: [{ row: 0, message: `Missing required headers: ${missing.join("; ")}. Expected: ${REQUIRED_HEADERS.join(",")}`, raw: Object.fromEntries(rawHeader.map((h,i)=>[i.toString(), h])) }],
      summary: { rows_received: 0, rows_valid: 0, rows_with_warnings: 0, rows_with_errors: 0 },
    };
  }

  const rows = lines.slice(1);
  rows.forEach((line, idx) => {
    const rowNumber = idx + 1;
    const cols = csvParseLine(line);
    const get = (name: (typeof REQUIRED_HEADERS)[number] | "audio_url") => {
      const idx = findIndexFor(name as any);
      const val = idx !== undefined ? cols[idx] : "";
      return truncate(collapseWhitespace(sanitizeHTML(val || "")));
    };
    const getNoTrunc = (name: (typeof REQUIRED_HEADERS)[number]) => {
      const idx = findIndexFor(name);
      const val = idx !== undefined ? cols[idx] : "";
      return sanitizeHTML(val || "").replace(/\r?\n/g, "\n").trim();
    };
    let QuestionFormat = get("QuestionFormat");
    const audioFile = get("audio_url");
    const original_sentence = getNoTrunc("original_sentence");
    const WordOrSentence = getNoTrunc("WordOrSentence");
    const CorrectAnswer = get("CorrectAnswer");
    const IncorrectAnswer1 = get("IncorrectAnswer1");
    const IncorrectAnswer2 = get("IncorrectAnswer2");
    const IncorrectAnswer3 = get("IncorrectAnswer3");
    const Explanation = get("Explanation");

    const rawObj = { QuestionFormat, audio_url: audioFile, original_sentence, WordOrSentence, CorrectAnswer, IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3, Explanation };
    if (!QuestionFormat || !WordOrSentence || !CorrectAnswer) {
      errors.push({ row: rowNumber, message: "Missing critical fields", raw: rawObj });
      return;
    }

    if (!(QuestionFormat === "Listening_Dictation" || QuestionFormat === "Listening_MultipleChoice")) {
      const guessed = closestFormat(QuestionFormat);
      if (guessed) { QuestionFormat = guessed; warnings.push({ row: rowNumber, message: `Corrected QuestionFormat to ${guessed}` }); }
      else { errors.push({ row: rowNumber, message: `Unrecognized QuestionFormat: ${QuestionFormat}`, raw: rawObj }); return; }
    }

    const content = WordOrSentence;
    const correct = CorrectAnswer;
    const incorrects = [IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3].filter(Boolean) as string[];

    // Build audio path within bucket by testId folder (optional)
    let audio_url: string | undefined;
    if (audioFile) {
      const filename = audioFile.split("/").pop() || audioFile;
      audio_url = `${skill_test_id}/${filename}`; // path inside 'listening-audio' bucket
    }

    insert.push({
      skill_type,
      skill_test_id,
      question_format: QuestionFormat as ListeningQuestionFormat,
      content,
      correct_answer: correct,
      incorrect_answers: incorrects,
      explanation: Explanation || undefined,
      original_sentence: original_sentence || null,
      audio_url,
    });
  });

  const output: NormalizedOutput = {
    ok: insert.length > 0,
    skill_type,
    skill_test_id,
    insert,
    warnings,
    errors,
    summary: {
      rows_received: rows.length,
      rows_valid: insert.length,
      rows_with_warnings: new Set(warnings.map(w=>w.row)).size,
      rows_with_errors: errors.length,
    },
  };
  return output;
}
