
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, FileText, Table as TableIcon, List, Eye, Edit2, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SmartListeningPasteProps {
    onImport: (questions: any[]) => void;
}

// Internal structure for the Preview
interface ParsedSection {
    id: string;
    part: number;
    title: string; // e.g. "Questions 1-10"
    instruction: string; // e.g. "Complete the table below..."
    type: 'table' | 'notes' | 'mcq' | 'matching' | 'short_answer';
    content: any; // Type-specific content
    questions: any[]; // Flat list of questions derived from content
}

export function SmartListeningPaste({ onImport }: SmartListeningPasteProps) {
    const [open, setOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    const [sections, setSections] = useState<ParsedSection[]>([]);
    const [activeTab, setActiveTab] = useState("input");

    // Table Builder State
    const [showTableBuilder, setShowTableBuilder] = useState(false);
    const [tbHeaders, setTbHeaders] = useState<string[]>(['Item', 'Code', 'Color', 'Quantity']);
    const [tbRows, setTbRows] = useState<string[][]>([['', '', '', ''], ['', '', '', ''], ['', '', '', '']]);

    const addColumn = () => {
        setTbHeaders([...tbHeaders, `Col ${tbHeaders.length + 1}`]);
    };

    const removeColumn = (index: number) => {
        if (tbHeaders.length <= 1) {
            toast.error("Table must have at least one column");
            return;
        }
        const newHeaders = [...tbHeaders];
        newHeaders.splice(index, 1);
        setTbHeaders(newHeaders);

        const newRows = tbRows.map(row => {
            const r = [...row];
            r.splice(index, 1);
            return r;
        });
        setTbRows(newRows);
    };

    const updateHeader = (index: number, val: string) => {
        const newHeaders = [...tbHeaders];
        newHeaders[index] = val;
        setTbHeaders(newHeaders);
    };

    const insertBuiltTable = () => {
        // Convert table to text format that our parser understands (Tab Separated)
        const headerLine = tbHeaders.map(h => h.trim()).join('\t');
        const rowLines = tbRows.map(row => row.map(c => c || '').join('\t').trim()).filter(l => l.length > 0 && l.replace(/\t/g, '').length > 0);

        const tableText = `\n\nPart X: Questions Y-Z\nComplete the table below.\n\n${headerLine}\n${rowLines.join('\n')}\n`;

        setRawText(prev => prev + tableText);
        setShowTableBuilder(false);
        toast.success("Table appended to input text!");
    };

    const parseContent = () => {
        if (!rawText.trim()) return;

        const newSections: ParsedSection[] = [];
        const lines = rawText.split('\n');

        let currentPart = 1;

        // Pattern Matchers
        // Relaxed to find "Part X" anywhere in line or start
        const partRegex = /Part\s+(\d+)/i;
        const sectionRegex = /Questions\s+(\d+)[-–](\d+)/i;

        let i = 0;
        while (i < lines.length) {
            let line = lines[i].trim();

            if (!line) {
                i++;
                continue;
            }

            // 1. Detect Part
            const partMatch = line.match(partRegex);
            if (partMatch) {
                currentPart = parseInt(partMatch[1]);
                // Don't continue yet; this line might also be "Part 2: Questions 11-14"
            }

            // 2. Detect Section
            const sectionMatch = line.match(sectionRegex);
            const isInstruction = /^(Complete|Write|Choose|Label)\s+/i.test(line);

            // If it's a section header OR an instruction line (implicit section)
            // Note: If we just matched "Part 2" but no Questions/Instruction, we skip to next line
            if (sectionMatch || isInstruction) {
                let rangeTitle = sectionMatch ? `Questions ${sectionMatch[1]}-${sectionMatch[2]}` : `Questions (Part ${currentPart})`;
                let instruction = "";

                let currentLineIndex = i;

                // If the current line is the Section Header (Questions 11-14), 
                // we might also have instruction on SAME line (unlikely for IELTS) or next lines

                // Consolidate instructions
                // If the line ITSELF is an instruction (and not just Questions 11-14), add it.
                // "Part 2: Questions 11-14" -> Not instruction.
                // "Complete the table" -> Instruction.
                if (isInstruction) {
                    // If line is ONLY instruction, take it.
                    // If it has Part/Questions info, strip them? 
                    // Usually inputs are: "Questions 11-14\nChoose..."
                    instruction = line.replace(partRegex, '').replace(sectionRegex, '').trim();
                    // If we stripped everything, look to next line?
                } else {
                    // Line was just "Part 2: Questions 11-14". Move to next for instruction.
                    currentLineIndex++;
                }

                // Look ahead for more instruction lines
                // We stop when we hit something that looks like Q content or next section
                while (currentLineIndex < lines.length) {
                    const nextLine = lines[currentLineIndex].trim();
                    if (!nextLine) { currentLineIndex++; continue; }

                    // Heuristics for "Instruction Lines"
                    const isInst = /^(Complete|Write|Choose|Label|No more than|Look at|Read the|Circle|Tick|Match|List)/i.test(nextLine);
                    // Heuristics for "End of Instruction" (Start of Content)
                    // e.g. "11. Why...", "Name ... Location", "(1)..."
                    const isContent = /^\d+[.)]/.test(nextLine) || // 11. 
                        /\t/.test(nextLine) || // Tabbed table
                        /\.{3,}/.test(nextLine) || // Dots ...
                        /^[A-Z]\s+[A-Z]/.test(nextLine); // Table header maybe?

                    if (isInst && !isContent) {
                        instruction += (instruction ? "\n" : "") + nextLine;
                        currentLineIndex++;
                    } else {
                        // If we haven't found ANY instruction yet, and this line doesn't definitively look like content?
                        // Maybe it's a title header? e.g. "HOLIDAY RENTALS"
                        // Assume it is instruction/context if it's strictly uppercase or doesn't look like Q.
                        if (!instruction && nextLine === nextLine.toUpperCase() && !isContent && nextLine.length < 50) {
                            instruction += (instruction ? "\n" : "") + nextLine;
                            currentLineIndex++;
                        } else {
                            break;
                        }
                    }
                }

                // Now determine type and parse body
                // Look ahead at the content to guess type
                const startBodyIndex = currentLineIndex;
                let type: ParsedSection['type'] = 'notes'; // default

                let looksLikeTable = false;
                let looksLikeMCQ = false;

                for (let k = startBodyIndex; k < Math.min(lines.length, startBodyIndex + 8); k++) {
                    const checkLine = lines[k].trim();
                    if (!checkLine) continue;
                    if (checkLine.includes('\t') || (checkLine.match(/\s{3,}/) && checkLine.match(/\(.*\)/))) looksLikeTable = true;
                    // MCQ Pattern: Line starts with Number, followed by lines starting with Letters
                    if (/^\d+[.)]/.test(checkLine)) {
                        // Check subsequent lines for A, B, C
                        let nextK = k + 1;
                        while (nextK < lines.length && nextK < k + 5) {
                            const l = lines[nextK].trim();
                            if (/^[A-C][.)\s]/.test(l)) { looksLikeMCQ = true; break; }
                            if (/^\d+[.)]/.test(l)) { break; } // Next question
                            nextK++;
                        }
                    }
                }

                if (instruction.toLowerCase().includes('table')) looksLikeTable = true;
                if (instruction.toLowerCase().includes('multiple choice') || instruction.toLowerCase().includes('choose the correct letter')) looksLikeMCQ = true;

                if (looksLikeMCQ) type = 'mcq';
                else if (looksLikeTable) type = 'table';

                // consume content until next section or part
                const contentLines: string[] = [];
                while (currentLineIndex < lines.length) {
                    const l = lines[currentLineIndex];
                    // Stop if new Part or Section (but be careful not to trigger on "Question 11" inside a list of questions)
                    // "Questions 11-14" is a header. "11. What is..." is a question.
                    if (l.match(partRegex)) break;

                    // Strict section check: must match "Questions X-Y" pattern, not just "Question 1"
                    if (l.match(/^Questions\s+\d+[-–]\d+/i)) break;

                    contentLines.push(l);
                    currentLineIndex++;
                }

                // PARSE SPECIFIC TYPE
                let parsedContent: any = null;
                let parsedQuestions: any[] = [];

                if (type === 'table') {
                    const { tableStructure, questions } = parseTable(contentLines, currentPart, instruction);
                    parsedContent = tableStructure;
                    parsedQuestions = questions;
                } else if (type === 'mcq') {
                    parsedQuestions = parseMCQ(contentLines, currentPart, instruction);
                    parsedContent = parsedQuestions;
                } else {
                    parsedQuestions = parseNotes(contentLines, currentPart, instruction);
                    parsedContent = contentLines.join('\n');
                }

                if (parsedQuestions.length > 0) {
                    newSections.push({
                        id: Math.random().toString(36).substr(2, 9),
                        part: currentPart,
                        title: rangeTitle,
                        instruction: instruction.trim(),
                        type: type,
                        content: parsedContent,
                        questions: parsedQuestions
                    });
                }

                i = currentLineIndex;
                continue;
            }

            i++;
        }

        setSections(newSections);
        setActiveTab("preview");
    };

    // --- Type Specific Parsers ---

    const parseTable = (lines: string[], part: number, sectionHeader: string) => {
        // 1. Identify Headers (first line with substantial text usually)
        const rows: any[] = [];
        let headers: string[] = [];
        const questions: any[] = [];

        // Filter empty lines but keep them if they signify separation? No, aggressive trim.
        const nonEmptyLines = lines.filter(l => l.trim().length > 0);
        if (nonEmptyLines.length === 0) return { tableStructure: { headers: [], rows: [] }, questions: [] };

        // Make a guess: tab separated or multi-space separated?
        // Check first line
        const firstLine = nonEmptyLines[0];
        const isTabbed = firstLine.includes('\t');
        const cleanup = (s: string) => s.trim();
        const splitter = isTabbed ? '\t' : /\s{3,}/;

        headers = firstLine.split(splitter).map(cleanup).filter(Boolean);

        // Process remaining lines as rows
        // We need to robustly map columns. Simple index mapping.
        for (let j = 1; j < nonEmptyLines.length; j++) {
            const line = nonEmptyLines[j];
            const cols = line.split(splitter).map(s => s.trim()); // Don't filter Boolean yet, empty cols exist

            const rowData = cols.map((colText, colIdx) => {
                // Check for questions in this cell
                // Pattern: (1)..... or (1)____
                const qMatches = Array.from(colText.matchAll(/\(?(\d+)\)?[\s\._…]+/g));

                if (qMatches.length > 0) {
                    // It's an input cell
                    const match = qMatches[0]; // Assume 1 q per cell usually
                    const qNum = parseInt(match[1]);
                    const qLabel = headers[colIdx] || `Column ${colIdx + 1}`;
                    // If text before match exists, it's label context. e.g. "Distance: (1)..."
                    const preText = colText.substring(0, match.index).trim();

                    const fullLabel = preText ? `${qLabel} (${preText})` : qLabel;

                    // Add to flat list
                    questions.push({
                        question_number: qNum,
                        question_text: `${qLabel}: ________________`, // Placeholder representation
                        question_type: 'table_completion',
                        part_number: part,
                        label: qLabel,
                        value: preText,
                        is_info_row: false,
                        section_header: sectionHeader,
                        table_headers: headers, // Pass headers!
                        passage_text: null
                    });

                    return { type: 'question', num: qNum, text: preText, raw: colText };
                } else {
                    // Info cell
                    return { type: 'text', text: colText, raw: colText };
                }
            });

            rows.push(rowData);

            // Add info rows for this row's non-question content
            if (!rowData.some(c => c.type === 'question') && rowData.some(c => c.text)) {
                questions.push({
                    question_number: 0,
                    question_text: rowData.map(c => c.text).join(' | '),
                    question_type: 'table_completion',
                    part_number: part,
                    is_info_row: true,
                    section_header: sectionHeader,
                    table_headers: headers // Pass headers!
                });
            }
        }

        return { tableStructure: { headers, rows }, questions };
    };

    const parseMCQ = (lines: string[], part: number, sectionHeader: string) => {
        const qs: any[] = [];
        let currentQ: any = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Match Question: "11. Text" or "11 Text"
            const qMatch = trimmed.match(/^(\d+)[.)]?\s+(.+)/);

            // Match Option: "A Text" or "A. Text" or "A) Text"
            // Must start with single uppercase letter, optional dot/paren, then space
            const optMatch = trimmed.match(/^([A-Z])([.)]|\s)\s*(.+)/);

            // Logic: It's a Question IF it matches qMatch AND NOT optMatch (unless the question text starts with A?)
            // But optMatch requires ^[A-Z]. qMatch requires ^\d+. They are mutually exclusive.

            if (qMatch) {
                if (currentQ) qs.push(currentQ);
                currentQ = {
                    question_number: parseInt(qMatch[1]),
                    question_text: qMatch[2],
                    question_type: 'multiple_choice',
                    options: [],
                    part_number: part,
                    section_header: sectionHeader,
                    correct_answer: '' // Default
                };
                continue;
            }

            if (optMatch && currentQ) {
                // Found option
                currentQ.options.push(optMatch[3]); // Group 3 is the text
                continue;
            }

            // Continuation?
            // If it doesn't match Q or Opt, append to previous Q text? 
            // Careful not to append options if they just failed regex.
            // But our opt regex is pretty broad.
            if (currentQ && !optMatch) {
                // Only append if it looks like sentence continuation (start with lower case or just text)
                // and NOT a new question number (already checked qMatch)
                currentQ.question_text += " " + trimmed;
            }
        }
        if (currentQ) qs.push(currentQ);
        return qs;
    };

    const parseNotes = (lines: string[], part: number, sectionHeader: string) => {
        const qs: any[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Strategy: Check for "embedded" blanks first (e.g. "(11) ...")
            // If strictly parenthesized numbers found, assume embedded.
            const embeddedMatches = Array.from(trimmed.matchAll(/\((\d+)\)/g));

            if (embeddedMatches.length > 0) {
                // Parse as Embedded/Gap-fill
                // We split the string by the matches to reconstruct the question text with blanks
                // But complex to do multiple in one line clearly. 
                // Let's iterate matches.
                for (const m of embeddedMatches) {
                    const qNum = parseInt(m[1]);
                    // Logic: Get context around this number? 
                    // Simple approach: The whole line IS the question text, but replace (11) with ______
                    // But we want to preserve the specific context for THIS question if possible.
                    // For now, let's essentially return the whole line with the blank focused.

                    // Actually, let's use the old approach for embedded but cleaned up:
                    // Find text strictly before and after this specific match instance?
                    // It's tricky if multiple exist.

                    // Fallback to simple replace for visual correctness relative to this Q?

                    const textBefore = trimmed.substring(0, m.index).trim();
                    const textAfter = trimmed.substring(m.index! + m[0].length).trim();

                    // Allow simple splitting if multiple per line? 
                    // Usually lines are short in notes.

                    qs.push({
                        question_number: qNum,
                        question_text: `${textBefore} ______ ${textAfter}`.trim(),
                        question_type: 'note_completion',
                        part_number: part,
                        label: 'Note',
                        value: '',
                        section_header: sectionHeader
                    });
                }
                continue; // Done with this line
            }

            // Strategy: Check for "List" style (e.g. "11. Name: ......")
            const listMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
            if (listMatch) {
                const qNum = parseInt(listMatch[1]);
                let content = listMatch[2].trim();

                // If content contains dots/underscores, replace them with clean blank
                if (/[\._–-]{3,}/.test(content)) {
                    // It has explicit blank
                    // e.g. "Name: ...................." -> "Name: ______"
                } else {
                    // No formatting, append blank at end?
                    // "11. Name" -> "Name ______"
                    content = content + " ______";
                }

                qs.push({
                    question_number: qNum,
                    question_text: content,
                    question_type: 'note_completion',
                    part_number: part,
                    label: 'Note',
                    value: '',
                    section_header: sectionHeader
                });
                continue;
            }

            // Fallback: Check for loose numbers?
            // Reuse old "loose match" regex if strict checks fail
            const looseMatches = Array.from(trimmed.matchAll(/(\d+)[\._…]+/g));
            if (looseMatches.length > 0) {
                for (const m of looseMatches) {
                    const qNum = parseInt(m[1]);
                    const textBefore = trimmed.substring(0, m.index).trim();
                    const textAfter = trimmed.substring(m.index! + m[0].length).trim();
                    qs.push({
                        question_number: qNum,
                        question_text: `${textBefore} ______ ${textAfter}`.trim(),
                        question_type: 'note_completion',
                        part_number: part,
                        label: 'Note',
                        value: '',
                        section_header: sectionHeader
                    });
                }
            }
        }
        return qs;
    };

    const flattenAndExport = () => {
        const allQs = sections.flatMap(s => s.questions);
        // Sort
        allQs.sort((a, b) => {
            if (a.question_number === 0) return 999;
            if (b.question_number === 0) return 999;
            return a.question_number - b.question_number;
        });
        onImport(allQs);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md border-amber-500">
                <Sparkles className="w-4 h-4" />
                Smart Paste Questions
            </Button>

            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#fdfaf3]">
                <div className="p-6 border-b flex items-start justify-between bg-amber-50/50 border-amber-100">
                    <div>
                        <DialogTitle className="text-2xl font-bold text-amber-900 font-serif">Smart Content Parser</DialogTitle>
                        <DialogDescription className="mt-1 text-amber-800/80">
                            Paste your Listening Test content. The AI will preserve tables, formatting, and sections.
                        </DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" className="border-amber-200 text-amber-900 hover:bg-amber-100" onClick={() => setRawText(`Part 1: Questions 1-10
Complete the table below. Write NO MORE THAN ONE WORD OR A NUMBER.

HOLIDAY RENTALS DATES (EXAMPLE) : 10 – 22 JULY
Name of property	Location	Features	Disadvantages
Kingfisher	Rural	Apartment	Distance from (1)........
Sunnybanks	Village	House	No (2)........`)}>
                        Load Table Example
                    </Button>
                    <Button variant="outline" size="sm" className="border-amber-200 text-amber-900 hover:bg-amber-100" onClick={() => setRawText(`Part 2: Questions 11-16
Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.

Start of the project:
11. The original plan was to build a ....................
12. The location was chosen because of the ....................

Costs:
13. Total estimated cost: $ ....................
14. Main expense: ....................`)}>
                        Load Note Example
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-6 border-b bg-amber-50/30 border-amber-100">
                            <TabsList className="bg-transparent p-0 h-auto gap-4">
                                <TabsTrigger value="input" className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:text-amber-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-amber-900/60 flex gap-2">
                                    <Edit2 className="w-4 h-4" /> Input Text
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:text-amber-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-amber-900/60 flex gap-2" disabled={sections.length === 0}>
                                    <Eye className="w-4 h-4" /> Student Preview ({sections.reduce((acc, s) => acc + s.questions.filter(q => q.question_number !== 0).length, 0)} Qs)
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="input" className="flex-1 flex flex-col min-h-0 m-0 p-6 space-y-4">
                            <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <AlertTitle>Format Tips</AlertTitle>
                                <AlertDescription className="text-xs text-amber-800/80 mt-1">
                                    Paste directly from PDF. Ensure "Part X" and "Questions X-Y" lines are included for best structure detection.
                                </AlertDescription>
                            </Alert>
                            <Textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Paste part content here...
Part 1: Questions 1-5
Complete the table..."
                                className="flex-1 font-mono text-sm resize-none focus-visible:ring-amber-500 border-amber-200 bg-white text-stone-900"
                            />
                            <div className="flex justify-between items-center">
                                <Button variant="outline" onClick={() => setShowTableBuilder(true)} className="gap-2 border-amber-200 text-amber-900 hover:bg-amber-100">
                                    <TableIcon className="w-4 h-4" /> Table Builder
                                </Button>
                                <Button onClick={parseContent} size="lg" className="w-full sm:w-auto gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                                    Parse Content <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </TabsContent>

                        <Dialog open={showTableBuilder} onOpenChange={setShowTableBuilder}>
                            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-white border-stone-200 shadow-xl">
                                <DialogHeader className="border-b pb-4">
                                    <DialogTitle className="text-2xl text-stone-900">Table Builder</DialogTitle>
                                    <DialogDescription className="text-stone-500">
                                        Create a structured table for your listening test. Questions will be automatically formatted.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-auto p-1 space-y-6">
                                    <div className="bg-brand-50/50 p-6 rounded-lg border border-brand-100 flex flex-col h-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-lg text-stone-900">Interactive Table Preview</h4>
                                                <p className="text-sm text-stone-500">
                                                    Edit headers directly. Add rows/columns as needed. Use <b>(1)</b> for questions.
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={addColumn} className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2">
                                                    <List className="w-4 h-4" /> Add Column
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => setTbRows([...tbRows, Array(tbHeaders.length).fill('')])} className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2">
                                                    <TableIcon className="w-4 h-4" /> Add Row
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex-1 border rounded-lg border-stone-200 overflow-auto shadow-sm bg-white">
                                            <Table>
                                                <TableHeader className="bg-stone-50 sticky top-0 z-10 shadow-sm">
                                                    <TableRow>
                                                        {tbHeaders.map((h, i) => (
                                                            <TableHead key={i} className="min-w-[150px] p-2 border-r border-b border-stone-200 bg-stone-50">
                                                                <div className="flex items-center gap-1 group">
                                                                    <Input
                                                                        value={h}
                                                                        onChange={(e) => updateHeader(i, e.target.value)}
                                                                        className="h-8 text-sm font-bold bg-white border-stone-200 text-stone-900 focus-visible:ring-amber-500"
                                                                        placeholder={`Column ${i + 1}`}
                                                                    />
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity"
                                                                        onClick={() => removeColumn(i)}
                                                                        title="Remove Column"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableHead>
                                                        ))}
                                                        <TableHead className="w-[50px] bg-stone-50 border-b border-stone-200"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {tbRows.map((row, rIdx) => (
                                                        <TableRow key={rIdx} className="hover:bg-stone-50">
                                                            {tbHeaders.map((_, cIdx) => (
                                                                <TableCell key={cIdx} className="p-2 border-r border-stone-100 last:border-0 align-top min-w-[150px]">
                                                                    <Input
                                                                        value={row[cIdx] || ''}
                                                                        onChange={(e) => {
                                                                            const newRows = [...tbRows];
                                                                            if (!newRows[rIdx]) {
                                                                                newRows[rIdx] = Array(tbHeaders.length).fill('');
                                                                            }
                                                                            newRows[rIdx][cIdx] = e.target.value;
                                                                            setTbRows(newRows);
                                                                        }}
                                                                        className="h-9 border-stone-200 bg-white text-stone-900 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                                                                        placeholder={cIdx === 0 ? "Content..." : "(1)..."}
                                                                    />
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="p-2 align-middle text-center w-[50px]">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50" onClick={() => {
                                                                    const newRows = [...tbRows];
                                                                    newRows.splice(rIdx, 1);
                                                                    setTbRows(newRows);
                                                                }}>
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            {tbRows.length === 0 && (
                                                <div className="p-12 text-center text-stone-400 bg-stone-50/20 italic">
                                                    Start adding content to build your table.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 bg-stone-50/50 p-4 -mx-6 -mb-6 mt-4">
                                    <Button variant="outline" onClick={() => setShowTableBuilder(false)} className="bg-white border-stone-300 text-stone-700">Cancel</Button>
                                    <Button onClick={insertBuiltTable} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm px-8">
                                        Insert Table
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <TabsContent value="preview" className="flex-1 min-h-0 m-0 relative bg-[#fdfaf3] flex flex-col">
                            <ScrollArea className="flex-1">
                                <div className="p-8 mx-auto space-y-8">
                                    {sections.length === 0 ? (
                                        <div className="text-center py-12 text-stone-500 italic">
                                            No sections detected. Check input format.
                                        </div>
                                    ) : (
                                        sections.map((section, idx) => (
                                            <div key={idx} className="space-y-4">
                                                {/* Section Header */}
                                                <div className="border-b-2 border-amber-200 pb-2">
                                                    <h3 className="text-xl font-bold text-amber-900">{section.title}</h3>
                                                    {section.instruction && (
                                                        <p className="text-stone-800 font-medium mt-1 whitespace-pre-wrap">{section.instruction}</p>
                                                    )}
                                                </div>

                                                {/* Section Content */}
                                                <div className="bg-white p-6 rounded-xl border border-[#e0d6c7] shadow-sm">
                                                    {section.type === 'table' ? (
                                                        <div className="overflow-x-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent border-amber-100">
                                                                        {section.content.headers.map((h: string, i: number) => (
                                                                            <TableHead key={i} className="text-amber-900 font-bold bg-amber-50">{h}</TableHead>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {section.content.rows.map((row: any[], rIdx: number) => (
                                                                        <TableRow key={rIdx} className="hover:bg-amber-50/30 border-amber-100">
                                                                            {row.map((cell, cIdx) => (
                                                                                <TableCell key={cIdx} className="align-top py-3">
                                                                                    {cell.type === 'question' ? (
                                                                                        <div className="flex items-baseline gap-2">
                                                                                            {cell.text && <span className="text-stone-900">{cell.text}</span>}
                                                                                            <div className="flex items-center">
                                                                                                <span className="font-bold text-red-600 mr-1">({cell.num})</span>
                                                                                                <div className="w-24 h-6 border-b-2 border-dotted border-stone-400 bg-stone-50/50"></div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-stone-800">{cell.text}</span>
                                                                                    )}
                                                                                </TableCell>
                                                                            ))}
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    ) : (
                                                        /* Standard List / MCQ View */
                                                        <div className="space-y-6">
                                                            {section.questions.map((q, qIdx) => (
                                                                <div key={qIdx} className="flex gap-4 group">
                                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 group-hover:bg-amber-200 transition-colors">
                                                                        {q.question_number}
                                                                    </div>
                                                                    <div className="flex-1 space-y-2">
                                                                        <p className="text-lg text-stone-900 font-medium">{q.question_text}</p>
                                                                        {q.question_type === 'multiple_choice' && (
                                                                            <div className="space-y-1 ml-1">
                                                                                {q.options?.map((opt: string, oIdx: number) => (
                                                                                    <div key={oIdx} className="flex gap-2 items-center text-stone-700">
                                                                                        <div className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center text-xs font-bold bg-white text-stone-900">
                                                                                            {String.fromCharCode(65 + oIdx)}
                                                                                        </div>
                                                                                        <span>{opt}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {q.question_type === 'note_completion' && (
                                                                            <div className="h-8 border-b border-stone-300 bg-stone-50 w-full max-w-xs mt-2"></div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="shrink-0 bg-[#fdfaf3]/95 backdrop-blur border-t border-[#e0d6c7] p-4 flex justify-end gap-2 z-10">
                                <Button variant="ghost" onClick={() => setActiveTab("input")} className="text-amber-900 hover:bg-amber-100">Back to Input</Button>
                                <Button onClick={flattenAndExport} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Save Questions
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
