export interface ParsedQuestion {
    question_number: number;
    question_text: string;
    question_type: string;
    options?: string[];
    correct_answer: string;
    part_number: number;
    is_info_row: boolean;
    table_headers?: string[];
    section_label?: string;
    value?: string;
    label?: string;
    line_index?: number;
    original_line?: string;
}

export function parsePartText(text: string, partNum: number, typeHint?: string): ParsedQuestion[] {
    if (!text.trim()) return [];

    const lines = text.split('\n');
    let questions: ParsedQuestion[] = [];
    let qStart = 1;
    let qEnd = 40;

    // Attempt to find range at top
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const rangeMatch = lines[i].match(/Questions\s+(\d+)[-–\s]+(\d+)/i);
        if (rangeMatch) {
            qStart = parseInt(rangeMatch[1]);
            qEnd = parseInt(rangeMatch[2]);
            break;
        }
    }

    // Determine type by looking for keywords or patterns
    let isTable = typeHint === 'table_completion' || text.toLowerCase().includes('table') || text.includes('\t');
    let isMCQ = typeHint === 'multiple_choice' || text.toLowerCase().includes('multiple choice') || text.toLowerCase().includes('choose the correct letter');

    if (isTable) {
        questions = parseTable(lines, partNum, qStart, qEnd);
    } else if (isMCQ) {
        questions = parseMCQ(lines, partNum, qStart, qEnd);
    } else {
        questions = parseNotes(lines, partNum, qStart, qEnd);
    }

    return questions;
}

function parseTable(lines: string[], part: number, qStart: number, qEnd: number): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    let headers: string[] = [];

    let bestHeaderIdx = -1;
    let maxTabs = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const tabs = (lines[i].match(/\t/g) || []).length;
        if (tabs > maxTabs) {
            maxTabs = tabs;
            bestHeaderIdx = i;
        }
    }

    if (bestHeaderIdx !== -1) {
        headers = lines[bestHeaderIdx].split('\t').map(h => h.trim());
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        if (i === bestHeaderIdx) continue;

        const cells = line.split('\t').map(c => c.trim());
        const hasQuestions = cells.some(c => /\(?(\d+)\)?/.test(c));

        if (hasQuestions) {
            cells.forEach((cell, cIdx) => {
                const matches = Array.from(cell.matchAll(/\(?(\d+)\)?/g));
                if (matches.length > 0) {
                    matches.forEach(match => {
                        const qNum = parseInt(match[1]);
                        if (qNum >= qStart && qNum <= qEnd) {
                            let qText = cell.trim();

                            let answer = "";
                            const ansMatch = qText.match(/\[(.*?)\]/);
                            if (ansMatch) {
                                answer = ansMatch[1].trim();
                                qText = qText.replace(/\[.*?\]/, '').trim();
                            }

                            questions.push({
                                question_number: qNum,
                                question_text: qText,
                                question_type: 'table_completion',
                                correct_answer: answer,
                                part_number: part,
                                is_info_row: false,
                                table_headers: headers,
                                label: cells[0],
                                line_index: i,
                                original_line: line
                            });
                        }
                    });
                }
            });
        } else {
            const infoText = line.includes('\t') ? cells.filter(c => c).join(' | ') : line.trim();
            questions.push({
                question_number: 0,
                question_text: infoText,
                question_type: 'table_completion',
                correct_answer: '',
                part_number: part,
                is_info_row: true,
                table_headers: headers,
                line_index: i,
                original_line: line
            });
        }
    }
    return questions;
}

function parseMCQ(lines: string[], part: number, qStart: number, qEnd: number): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    let currentQ: ParsedQuestion | null = null;

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const qMatch = trimmed.match(/^(\d+)[\.\)]?\s+(.*)$/);
        if (qMatch) {
            const num = parseInt(qMatch[1]);
            if (num >= qStart && num <= qEnd) {
                if (currentQ) questions.push(currentQ);
                let qText = qMatch[2].trim();

                let answer = "";
                const ansMatch = qText.match(/\[(.*?)\]/);
                if (ansMatch) {
                    answer = ansMatch[1].trim();
                    qText = qText.replace(/\[.*?\]/, '').trim();
                }

                currentQ = {
                    question_number: num,
                    question_text: qText,
                    question_type: 'multiple_choice',
                    correct_answer: answer,
                    options: [],
                    part_number: part,
                    is_info_row: false,
                    line_index: i,
                    original_line: line
                };
            }
        } else if (currentQ && /^[A-G][\.\)\s]/.test(trimmed)) {
            const optionText = trimmed.replace(/^[A-G][\.\)\s]/, '').trim();
            currentQ.options?.push(optionText);
        }
    });

    if (currentQ) questions.push(currentQ);
    return questions;
}

function parseNotes(lines: string[], part: number, qStart: number, qEnd: number): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    // Pre-process lines to merge "dangling" markers (often happens during copy-paste from PDF)
    const normalizedLines: { text: string, originalIndex: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const isOnlyMarker = /^\(\d+\)$/.test(line);
        if (isOnlyMarker && i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine && !/^\s*\(?\d+[\.\)]/.test(nextLine)) {
                normalizedLines.push({ text: line + " " + nextLine, originalIndex: i });
                i++; // Skip next line
                continue;
            }
        }
        normalizedLines.push({ text: line, originalIndex: i });
    }

    normalizedLines.forEach((item, i) => {
        const trimmed = item.text;
        const originalIndex = item.originalIndex;
        if (!trimmed) return;

        // Detect potential question numbers anywhere in the line: (1), 1., 1)
        const matches: { num: number, raw: string }[] = [];

        // Pattern 1: (1)
        const p1 = Array.from(trimmed.matchAll(/\((\d+)\)/g));
        p1.forEach(m => matches.push({ num: parseInt(m[1]), raw: m[0] }));

        // Pattern 2: Start of line 1. or 1)
        const p2 = trimmed.match(/^(\d+)[\.\)]\s*/);
        if (p2 && !matches.some(m => m.num === parseInt(p2[1]))) {
            matches.push({ num: parseInt(p2[1]), raw: p2[0] });
        }

        if (matches.length > 0) {
            matches.forEach(m => {
                if (m.num >= qStart && m.num <= qEnd) {
                    // Normalize the line: ensure the marker is (X) for consistent rendering
                    let lineWithNormalization = trimmed;
                    if (m.raw !== `(${m.num})`) {
                        lineWithNormalization = lineWithNormalization.replace(m.raw, `(${m.num}) `);
                    }

                    // Answer extraction (global within line for now, or could be per question)
                    let answer = "";
                    const ansMatch = lineWithNormalization.match(/\[(.*?)\]/);
                    if (ansMatch) {
                        answer = ansMatch[1].trim();
                    }

                    questions.push({
                        question_number: m.num,
                        question_text: lineWithNormalization,
                        question_type: 'note_completion',
                        correct_answer: answer,
                        part_number: part,
                        is_info_row: false,
                        line_index: originalIndex,
                        original_line: trimmed
                    });
                }
            });
        } else {
            // Treat lines with no questions as info rows
            questions.push({
                question_number: 0,
                question_text: trimmed,
                question_type: 'note_completion',
                correct_answer: '',
                part_number: part,
                is_info_row: true,
                line_index: originalIndex,
                original_line: trimmed
            });
        }
    });

    return questions;
}
