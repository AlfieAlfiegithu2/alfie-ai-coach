export type NormalizedRow = {
  skill_type: "Grammar Fix-it";
  skill_test_id: string;
  question_format: "DefinitionMatch" | "SentenceFillIn";
  content: string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
};

export type NormalizedOutput = {
  ok: boolean;
  skill_type: "Grammar Fix-it";
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
  "WordOrSentence",
  "CorrectAnswer",
  "IncorrectAnswer1",
  "IncorrectAnswer2",
  "IncorrectAnswer3",
  "Explanation",
] as const;

function stripBOM(s: string) {
  return s.replace(/^\uFEFF/, "");
}

function normalizeQuotes(s: string) {
  return s
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function sanitizeHTML(s: string) {
  return s.replace(/<[^>]*>/g, "");
}

function collapseWhitespace(s: string) {
  return s.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function truncate180(s: string) {
  if (s.length <= 180) return s;
  const cut = s.slice(0, 180);
  const lastPunct = Math.max(cut.lastIndexOf("."), cut.lastIndexOf(","), cut.lastIndexOf(";"), cut.lastIndexOf(":"));
  return (lastPunct > 60 ? cut.slice(0, lastPunct) : cut).trim();
}

function csvParseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectAndNormalizeDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  if (semiCount > 0 && commaCount === 0) {
    return text.replace(/;/g, ",");
  }
  return text;
}

function closestFormat(value: string): "DefinitionMatch" | "SentenceFillIn" | null { const v = value.replace(/[^a-z]/gi, "").toLowerCase();
  const def = ["definitionmatch","definitionmatching","defmatch","definition","def"]; 
  const fill = ["sentencefillin","sentencefill","fillintheblank","fillblanks","fillblank","blank","cloze","clozetest","grammarfixit","grammarfixitquestions","grammarfix"];
  if (def.includes(v)) return "DefinitionMatch";
  if (fill.includes(v)) return "SentenceFillIn";
  return null; }

function ensureBlank(content: string, correct: string, warnings: string[]): { content: string; error?: string } {
  const blanks = (content.match(/_+/g) || []).filter((s) => s.length >= 2);
  if (blanks.length > 1) return { content, error: "Multiple blanks detected" };
  if (blanks.length === 0) {
    const re = new RegExp(`\\b${correct.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(content)) {
      warnings.push("Inserted blank by replacing the correct answer occurrence");
      return { content: content.replace(re, "_______") };
    }
    const idx = Math.max(content.lastIndexOf(" "), 0);
    warnings.push("Inserted a blank at a natural position");
    return { content: content.slice(0, idx) + " _______" + content.slice(idx) };
  }
  return { content: content.replace(/_+/g, "_______") };
}

function isSingleWord(s: string) {
  return /^[A-Za-z][A-Za-z\-']*$/.test(s.trim());
}

function guessPOS(word: string): "verb" | "noun" | "adjective" | "adverb" {
  const w = word.toLowerCase();
  if (/ly$/.test(w)) return "adverb";
  if (/(tion|ment|ness|ity|ance|ence|ship|ism)$/.test(w)) return "noun";
  if (/(ous|ive|able|ible|al|ic|ical|ary|ory)$/.test(w)) return "adjective";
  return "verb";
}

const POS_FALLBACKS: Record<string, string[]> = {
  verb: ["mitigate", "undermine", "amplify", "circumvent", "invalidate", "corroborate", "repudiate"],
  noun: ["anomaly", "paradigm", "tenet", "conjecture", "impetus", "nuance", "rebuttal"],
  adjective: ["pervasive", "tentative", "redundant", "spurious", "intrinsic", "ambiguous", "salient"],
  adverb: ["ostensibly", "tangentially", "inadvertently", "inherently", "predominantly", "marginally"],
};

function makeWrongWord(pos: string, avoid: Set<string>): string {
  const list = POS_FALLBACKS[pos] || POS_FALLBACKS["verb"];
  for (const w of list) {
    if (!avoid.has(w)) return w;
  }
  let i = 1;
  while (avoid.has(`option${i}`)) i++;
  return `option${i}`;
}

const GENERIC_DEF_DISTRACTORS = [
  "A temporary or short-lived occurrence",
  "An idea that lacks practical application",
  "Something rare or infrequently encountered",
  "A minor detail with little significance",
  "A device used to measure performance",
];

function makeWrongDefinition(correct: string, avoid: Set<string>): string {
  for (const d of GENERIC_DEF_DISTRACTORS) {
    if (!avoid.has(d) && d.toLowerCase() !== correct.toLowerCase()) return d;
  }
  let i = 1;
  while (avoid.has(`Unrelated definition ${i}`)) i++;
  return `Unrelated definition ${i}`;
}

export function normalizeGrammarCSV(
  file_text: string,
  skill_type: "Grammar Fix-it",
  skill_test_id: string
): NormalizedOutput {
  const warnings: { row: number; message: string }[] = [];
  const errors: { row: number; message: string; raw: Record<string, string> }[] = [];
  const insert: NormalizedRow[] = [];

  let text = stripBOM(file_text || "");
  text = normalizeQuotes(text);
  text = detectAndNormalizeDelimiter(text);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      skill_type,
      skill_test_id,
      insert: [],
      warnings: [],
      errors: [
        {
          row: 0,
          message: `Missing headers. Expected: ${REQUIRED_HEADERS.join(",")}`,
          raw: {},
        },
      ],
      summary: {
        rows_received: 0,
        rows_valid: 0,
        rows_with_warnings: 0,
        rows_with_errors: 0,
      },
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
      errors: [
        {
          row: 0,
          message: `Missing required headers: ${missing.join("; ")}. Expected: ${REQUIRED_HEADERS.join(",")}`,
          raw: Object.fromEntries(rawHeader.map((h, i) => [i.toString(), h])),
        },
      ],
      summary: {
        rows_received: 0,
        rows_valid: 0,
        rows_with_warnings: 0,
        rows_with_errors: 0,
      },
    };
  }

  const rows = lines.slice(1);

  rows.forEach((line, idx) => {
    const rowNumber = idx + 1;
    const cols = csvParseLine(line);
    const get = (name: (typeof REQUIRED_HEADERS)[number]) => collapseWhitespace(sanitizeHTML(cols[headerMap[name]] || ""));

    let QuestionFormat = get("QuestionFormat");
    const WordOrSentence = truncate180(get("WordOrSentence"));
    let CorrectAnswer = truncate180(get("CorrectAnswer"));
    let IncorrectAnswer1 = truncate180(get("IncorrectAnswer1"));
    let IncorrectAnswer2 = truncate180(get("IncorrectAnswer2"));
    let IncorrectAnswer3 = truncate180(get("IncorrectAnswer3"));
    let Explanation = truncate180(get("Explanation"));

    const rawObj = {
      QuestionFormat,
      WordOrSentence,
      CorrectAnswer,
      IncorrectAnswer1,
      IncorrectAnswer2,
      IncorrectAnswer3,
      Explanation,
    };

    if (!QuestionFormat || !WordOrSentence || !CorrectAnswer) {
      errors.push({ row: rowNumber, message: "Missing critical fields", raw: rawObj });
      return;
    }

if (!(QuestionFormat === "DefinitionMatch" || QuestionFormat === "SentenceFillIn")) {
      const guessed = closestFormat(QuestionFormat);
      if (guessed) { warnings.push({ row: rowNumber, message: `Corrected QuestionFormat to ${guessed}` }); QuestionFormat = guessed; }
      else {
        const hasBlank = /_{2,}/.test(WordOrSentence); const contentIsWord = isSingleWord(WordOrSentence); const correctLooksDef = CorrectAnswer.split(" ").length >= 3;
        const heuristic = hasBlank ? "SentenceFillIn" : (contentIsWord && correctLooksDef ? "DefinitionMatch" : "SentenceFillIn");
        warnings.push({ row: rowNumber, message: `Guessed QuestionFormat as ${heuristic} from data` });
        QuestionFormat = heuristic;
      }
    }

    let content = WordOrSentence;
    let correct = CorrectAnswer;
    let incorrects = [IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3].filter((x) => x !== undefined && x !== null) as string[];

    if (QuestionFormat === "DefinitionMatch") {
      if (!isSingleWord(content)) {
        const head = content.split(/[^A-Za-z\-']/).filter(Boolean)[0] || content.split(" ")[0];
        if (head && isSingleWord(head)) {
          warnings.push({ row: rowNumber, message: `Extracted headword '${head}' from phrase` });
          content = head;
        } else {
          warnings.push({ row: rowNumber, message: "Content appears to be a phrase; accepted as-is" });
        }
      }
      const set = new Set<string>([correct.toLowerCase(), ...incorrects.map((i) => i.toLowerCase())]);
      incorrects = incorrects.map((d) => d || "");
      for (let i = 0; i < incorrects.length; i++) {
        let d = incorrects[i];
        if (!d || d.length < 2) {
          const rep = makeWrongDefinition(correct, set);
          incorrects[i] = rep;
          set.add(rep.toLowerCase());
          warnings.push({ row: rowNumber, message: "Replaced trivial/empty distractor with plausible definition" });
        }
      }
    } else if (QuestionFormat === "SentenceFillIn") {
      const ensure = ensureBlank(content, correct, []);
      if (ensure.error) {
        errors.push({ row: rowNumber, message: ensure.error, raw: rawObj });
        return;
      }
      content = ensure.content;
      if (!isSingleWord(correct)) {
        const head = correct.split(/[^A-Za-z\-']/).filter(Boolean)[0] || correct.split(" ")[0];
        if (head && isSingleWord(head)) {
          warnings.push({ row: rowNumber, message: `Reduced correct answer to headword '${head}'` });
          correct = head;
        } else {
          errors.push({ row: rowNumber, message: "CorrectAnswer must be a single word", raw: rawObj });
          return;
        }
      }
      const pos = guessPOS(correct);
      let pool = incorrects.map((w) => (isSingleWord(w) ? w : ""));
      const avoid = new Set<string>([correct.toLowerCase(), ...pool.map((x) => x.toLowerCase()).filter(Boolean)]);
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i]) {
          const rep = makeWrongWord(pos, avoid);
          pool[i] = rep;
          avoid.add(rep.toLowerCase());
          warnings.push({ row: rowNumber, message: "Replaced non-word distractor with POS-matched alternative" });
        }
      }
      incorrects = pool;
    }

    const options = [correct, ...incorrects].map((o) => collapseWhitespace(o));
    const seen = new Set<string>();
    let unique = options.filter((o) => {
      const k = o.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (unique.length < 4) {
      const avoid = new Set<string>(unique.map((x) => x.toLowerCase()));
      const need = 4 - unique.length;
      for (let i = 0; i < need; i++) {
        if (QuestionFormat === "SentenceFillIn") {
          const rep = makeWrongWord(guessPOS(correct), avoid);
          unique.push(rep);
          avoid.add(rep.toLowerCase());
        } else {
          const rep = makeWrongDefinition(correct, avoid);
          unique.push(rep);
          avoid.add(rep.toLowerCase());
        }
        warnings.push({ row: rowNumber, message: "Added synthesized distractor to ensure 4 unique options" });
      }
    }

    const finalCorrect = unique[0];
    const finalIncorrects = unique.slice(1, 4);

    insert.push({
      skill_type,
      skill_test_id,
      question_format: QuestionFormat as "DefinitionMatch" | "SentenceFillIn",
      content: truncate180(content),
      correct_answer: truncate180(finalCorrect),
      incorrect_answers: finalIncorrects.map(truncate180),
      explanation: truncate180(Explanation || ""),
    });
  });

  const rows_with_warnings = new Set(warnings.map((w) => w.row)).size;
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
      rows_with_warnings,
      rows_with_errors: errors.length,
    },
  };

  return output;
}
