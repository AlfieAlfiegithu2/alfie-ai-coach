export type ParsedListeningQuestion = {
  question_number: number;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  section_header?: string;
  section_instruction?: string;
  part_number?: number;
  question_number_in_part?: number;
};

export type ParseListeningResult = {
  questions: ParsedListeningQuestion[];
  warnings: string[];
};

const SECTION_REGEX = /questions?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i;
const INLINE_NUMBER_REGEX = /\(?(\d{1,3})\)?/g;

function normalize(text: string) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0 && l.toLowerCase() !== "click to edit");
}

function looksLikeInstruction(line: string) {
  const lower = line.toLowerCase();
  return (
    lower.includes("no more than") ||
    lower.includes("write your answers") ||
    lower.includes("answer the questions") ||
    lower.includes("complete") ||
    lower.includes("summary") ||
    lower.includes("choose") ||
    lower.includes("matching")
  );
}

function detectType(instruction: string, line: string): string {
  const combo = `${instruction} ${line}`.toLowerCase();
  if (combo.includes("table") || combo.includes("form")) return "table_completion";
  if (combo.includes("map") || combo.includes("diagram")) return "map_labeling";
  if (combo.includes("plan")) return "plan_labeling";
  if (combo.includes("flowchart")) return "flowchart_completion";
  if (combo.includes("matching") || combo.includes("match")) return "multiple_choice_matching";
  if (combo.includes("choose the correct letter") || combo.match(/\([abc]\)/)) return "multiple_choice";
  if (combo.includes("summary") || combo.includes("note")) return "note_completion";
  if (combo.includes("sentence")) return "sentence_completion";
  return "fill_blank";
}

function makeSnippet(line: string, start: number, end: number) {
  const before = line.slice(Math.max(0, start - 50), start).trimStart();
  const after = line.slice(end, Math.min(line.length, end + 50)).trimEnd();
  return `${before} _____ ${after}`.replace(/\s+/g, " ").trim();
}

function parseInlineBlanks(
  line: string,
  instruction: string,
  header?: string,
  seen?: Set<number>
): ParsedListeningQuestion[] {
  const questions: ParsedListeningQuestion[] = [];
  const matches = [...line.matchAll(INLINE_NUMBER_REGEX)];
  if (matches.length === 0) return questions;

  matches.forEach((match) => {
    const rawNum = match[1];
    const num = Number(rawNum);
    if (!Number.isFinite(num)) return;
    if (seen && seen.has(num)) return;
    const partNumber = Math.max(1, Math.floor((num - 1) / 10) + 1);
    const questionInPart = ((num - 1) % 10) + 1;
    const snippet = makeSnippet(line, match.index || 0, (match.index || 0) + match[0].length);
    questions.push({
      question_number: num,
      question_text: snippet || line,
      question_type: detectType(instruction, line),
      correct_answer: "",
      section_header: header,
      section_instruction: instruction || undefined,
      part_number: partNumber,
      question_number_in_part: questionInPart,
    });
    if (seen) seen.add(num);
  });

  return questions;
}

function parseExplicitQuestionLine(
  line: string,
  instruction: string,
  header?: string
): ParsedListeningQuestion | null {
  const match = line.match(/^(\d{1,3})[).:-]?\s+(.*)$/);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;
  const partNumber = Math.max(1, Math.floor((num - 1) / 10) + 1);
  const questionInPart = ((num - 1) % 10) + 1;
  const text = match[2].trim();
  return {
    question_number: num,
    question_text: text,
    question_type: detectType(instruction, line),
    correct_answer: "",
    section_header: header,
    section_instruction: instruction || undefined,
    part_number: partNumber,
    question_number_in_part: questionInPart,
  };
}

export function parseListeningText(raw: string): ParseListeningResult {
  const lines = normalize(raw);
  const questions: ParsedListeningQuestion[] = [];
  const warnings: string[] = [];
  let currentHeader: string | undefined;
  let currentInstruction = "";
  const seenNumbers = new Set<number>();

  lines.forEach((line) => {
    const sectionMatch = line.match(SECTION_REGEX);
    if (sectionMatch) {
      currentHeader = line;
      currentInstruction = "";
      return;
    }

    if (looksLikeInstruction(line)) {
      currentInstruction = currentInstruction
        ? `${currentInstruction} ${line}`
        : line;
      return;
    }

    // Inline blanks inside a sentence (e.g., summary completion)
    if (line.includes("_") || line.match(/\(\d{1,3}\)/)) {
      const inlineQs = parseInlineBlanks(line, currentInstruction, currentHeader, seenNumbers);
      if (inlineQs.length > 0) {
        questions.push(...inlineQs);
        return;
      }
    }

    // Standard numbered question line
    const explicit = parseExplicitQuestionLine(line, currentInstruction, currentHeader);
    if (explicit) {
      if (seenNumbers.has(explicit.question_number)) {
        warnings.push(`Duplicate question number ${explicit.question_number} skipped.`);
        return;
      }
      seenNumbers.add(explicit.question_number);
      questions.push(explicit);
      return;
    }

    // Ignore lines that are just a number (common in pasted docs)
    if (/^\d{1,3}$/.test(line)) return;
  });

  if (questions.length === 0) {
    warnings.push("No questions detected. Check formatting or add numbering.");
  }

  // Ensure questions are sorted by number
  questions.sort((a, b) => a.question_number - b.question_number);

  return { questions, warnings };
}
