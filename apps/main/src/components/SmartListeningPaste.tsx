
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, FileText, Table as TableIcon, List, Eye, Edit2, X, ClipboardList } from "lucide-react";
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
import { ListeningTableBuilder } from "./ListeningTableBuilder";

interface Question {
    question_number: number;
    question_text: string;
    question_type: string;
    part_number: number;
    label?: string;
    value?: string;
    correct_answer?: string;
    options?: string[];
    is_info_row?: boolean;
    section_header?: string;
    table_headers?: string[];
    passage_text?: string | null;
    question_image_url?: string | null;
}

interface SmartListeningPasteProps {
    onImport: (questions: Question[]) => void;
    onUploadImage: (file: File) => Promise<{ url: string }>;
}

// Internal structure for the Preview
interface ParsedSection {
    id: string;
    part: number;
    title: string; // e.g. "Questions 1-10"
    instruction: string; // e.g. "Complete the table below..."
    type: 'table' | 'notes' | 'mcq' | 'matching' | 'short_answer';
    content: any; // Type-specific content
    questions: Question[]; // Flat list of questions derived from content
}

export function SmartListeningPaste({ onImport, onUploadImage }: SmartListeningPasteProps) {
    const [open, setOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    const [sections, setSections] = useState<ParsedSection[]>([]);
    const [activeTab, setActiveTab] = useState("input");
    const [partImage, setPartImage] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [targetPart, setTargetPart] = useState<number>(1);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setRawText('');
            setSections([]);
            setActiveTab('input');
        }
    }, [open]);

    const [showTableBuilder, setShowTableBuilder] = useState(false);

    // Answer Import State
    const [showAnswerDialog, setShowAnswerDialog] = useState(false);
    const [rawAnswers, setRawAnswers] = useState("");

    const parseAndApplyAnswers = () => {
        const answerMap = new Map<number, string>();
        const lines = rawAnswers.split('\n');

        let appliedCount = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Match start with number, optional dot/paren, then whitespace, then rest
            const match = trimmed.match(/^(\d+)[.)]?\s+(.*)$/);
            if (match) {
                const qNum = parseInt(match[1]);
                const text = match[2].trim();
                answerMap.set(qNum, text);
            }
        });

        if (answerMap.size === 0) {
            toast.error("No valid answers found. Check format e.g. '1. Answer'");
            return;
        }

        const newSections = sections.map(sec => ({
            ...sec,
            questions: sec.questions.map(q => {
                const qNum = typeof q.question_number === 'number' ? q.question_number : parseInt(q.question_number);

                if (answerMap.has(qNum)) {
                    appliedCount++;
                    return { ...q, correct_answer: answerMap.get(qNum) };
                }
                return q;
            })
        }));

        setSections(newSections);
        setShowAnswerDialog(false);
        setRawAnswers(""); // Clear input
        if (appliedCount > 0) {
            toast.success(`Applied ${appliedCount} answers to questions!`);
        } else {
            toast.warning(`Parsed ${answerMap.size} answers but found no matching Question Numbers in the current sections.`);
        }
    };

    const parseContent = () => {
        if (!rawText.trim()) return;

        const newSections: ParsedSection[] = [];
        const lines = rawText.split('\n');

        // Pattern Matchers
        const partRegex = /Part\s+(\d+)/i;
        const sectionRegex = /Questions\s+(\d+)[-–](\d+)/i;

        let currentPart = targetPart; // Default to selected part
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();

            if (!line) {
                i++;
                continue;
            }

            // 1. Detect Part
            const partMatch = line.match(partRegex);
            if (partMatch) {
                currentPart = parseInt(partMatch[1]);
            }

            // 2. Detect Section
            const sectionMatch = line.match(sectionRegex);
            const isInstruction = /^(Complete|Write|Choose|Label)\s+/i.test(line);

            if (sectionMatch || isInstruction) {
                const rangeTitle = sectionMatch ? `Questions ${sectionMatch[1]}-${sectionMatch[2]}` : `Questions (Part ${currentPart})`;
                let instruction = "";

                let currentLineIndex = i;
                const firstLine = lines[i].trim();
                const isFirstLineCmd = /^(Complete|Write|Choose|Label|No more than|Look at|Read the|Circle|Tick|Match|List|Select|Write no more)/i.test(firstLine);
                const isFirstLineRange = /^Questions\s+\d+[-–]\d+/i.test(firstLine);

                // Content detection for progress
                const isFirstLineContent = /^\d+[.)]/.test(firstLine) || /\(\d+\)/.test(firstLine) || /\t/.test(firstLine) || /\.{3,}/.test(firstLine) || /____/.test(firstLine);

                if ((isFirstLineCmd || isFirstLineRange) && !isFirstLineContent) {
                    instruction = firstLine;
                    currentLineIndex = i + 1; // Advance
                } else {
                    currentLineIndex = i + 1;
                }

                // Look ahead for additional instruction lines
                while (currentLineIndex < lines.length) {
                    const nextLine = lines[currentLineIndex].trim();
                    if (!nextLine) { currentLineIndex++; continue; }

                    const isCommandVerb = /^(Complete|Write|Choose|Label|No more than|Look at|Read the|Circle|Tick|Match|List|Select|Write no more)/i.test(nextLine);
                    const isRangeHeader = /^Questions\s+\d+[-–]\d+/i.test(nextLine);
                    const isInst = isCommandVerb || isRangeHeader;

                    const isContent = /^\d+[.)]/.test(nextLine) ||
                        /\(\d+\)/.test(nextLine) ||
                        /\t/.test(nextLine) ||
                        /\.{3,}/.test(nextLine) ||
                        /____/.test(nextLine) ||
                        /^[A-Z]\s+[A-Z]/.test(nextLine) ||
                        /[a-zA-Z]+:\s/.test(nextLine);

                    if (isInst && !isContent) {
                        instruction += (instruction ? "\n" : "") + nextLine;
                        currentLineIndex++;
                    } else {
                        break;
                    }
                }

                const startBodyIndex = currentLineIndex;
                let type: ParsedSection['type'] = 'notes'; // default

                let looksLikeTable = false;
                let looksLikeMCQ = false;

                for (let k = startBodyIndex; k < Math.min(lines.length, startBodyIndex + 8); k++) {
                    const checkLine = lines[k].trim();
                    if (!checkLine) continue;
                    if (checkLine.includes('\t') || (checkLine.match(/\s{3,}/) && checkLine.match(/\(.*\)/))) looksLikeTable = true;
                    if (/^\d+[.)]/.test(checkLine)) {
                        let nextK = k + 1;
                        while (nextK < lines.length && nextK < k + 5) {
                            const l = lines[nextK].trim();
                            if (/^[A-C][.)\s]/.test(l)) { looksLikeMCQ = true; break; }
                            if (/^\d+[.)]/.test(l)) { break; }
                            nextK++;
                        }
                    }
                }

                if (instruction.toLowerCase().includes('table')) looksLikeTable = true;
                if (instruction.toLowerCase().includes('multiple choice') || instruction.toLowerCase().includes('choose the correct letter')) looksLikeMCQ = true;
                if (instruction.toLowerCase().includes('notes')) {
                    looksLikeTable = false;
                }

                if (looksLikeMCQ) type = 'mcq';
                else if (looksLikeTable) type = 'table';
                else type = 'notes';

                const contentLines: string[] = [];
                while (currentLineIndex < lines.length) {
                    const l = lines[currentLineIndex];
                    if (l.match(partRegex)) break;
                    if (l.match(/^Questions\s+\d+[-–]\d+/i)) break;

                    contentLines.push(l);
                    currentLineIndex++;
                }

                let qStart = 1;
                let qEnd = 40;
                const rangeMatch = instruction.match(/Questions\s+(\d+)[-–\s]+(\d+)/i);
                if (rangeMatch) {
                    qStart = parseInt(rangeMatch[1]);
                    qEnd = parseInt(rangeMatch[2]);
                } else if (sectionMatch) {
                    qStart = parseInt(sectionMatch[1]);
                    qEnd = parseInt(sectionMatch[2]);
                }

                let parsedContent: any = null;
                let parsedQuestions: Question[] = [];

                if (type === 'table') {
                    const { tableStructure, questions } = parseTable(contentLines, currentPart, instruction, qStart, qEnd);
                    parsedContent = tableStructure;
                    parsedQuestions = questions;
                } else if (type === 'mcq') {
                    parsedQuestions = parseMCQ(contentLines, currentPart, instruction, qStart, qEnd);
                    parsedContent = parsedQuestions;
                } else {
                    parsedQuestions = parseNotes(contentLines, currentPart, instruction, qStart, qEnd);
                    parsedContent = contentLines.join('\n');
                }

                parsedQuestions = parsedQuestions.map(q => ({
                    ...q,
                    question_type: type === 'table' ? 'table_completion' : (type === 'mcq' ? 'multiple_choice' : 'note_completion')
                }));

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

    const parseTable = (lines: string[], part: number, sectionHeader: string, qStart: number, qEnd: number) => {
        const rows: any[] = [];
        let headers: string[] = [];
        const questions: Question[] = [];

        const nonEmptyLines = lines.filter(l => l.trim().length > 0);
        if (nonEmptyLines.length === 0) return { tableStructure: { headers: [], rows: [] }, questions: [] };

        const firstLine = nonEmptyLines[0];
        const isTabbed = firstLine.includes('\t');
        const cleanup = (s: string) => s.trim();
        const splitter = isTabbed ? '\t' : /\s{3,}/;

        headers = firstLine.split(splitter).map(cleanup).filter(Boolean);

        for (let j = 1; j < nonEmptyLines.length; j++) {
            const line = nonEmptyLines[j];
            const cols = line.split(splitter).map(s => s.trim());

            const rowData = cols.map((colText, colIdx) => {
                const qMatches = Array.from(colText.matchAll(/\(?(\d+)\)?(?:[\s._…]+|$)/g)).filter(m => {
                    const n = parseInt(m[1]);
                    return n >= qStart && n <= qEnd;
                });

                if (qMatches.length > 0) {
                    const match = qMatches[0];
                    const qNum = parseInt(match[1]);
                    const qLabel = headers[colIdx] || `Column ${colIdx + 1}`;
                    const preText = colText.substring(0, match.index).trim();

                    questions.push({
                        question_number: qNum,
                        question_text: `${qLabel}: ________________`,
                        question_type: 'table_completion',
                        part_number: part,
                        label: qLabel,
                        value: preText,
                        is_info_row: false,
                        section_header: sectionHeader,
                        table_headers: headers,
                        passage_text: null
                    });

                    return { type: 'question', num: qNum, text: preText, raw: colText };
                } else {
                    return { type: 'text', text: colText, raw: colText };
                }
            });

            rows.push(rowData);

            if (!rowData.some(c => c.type === 'question') && rowData.some(c => c.text)) {
                questions.push({
                    question_number: 0,
                    question_text: rowData.map(c => c.text).join(' | '),
                    question_type: 'table_completion',
                    part_number: part,
                    is_info_row: true,
                    section_header: sectionHeader,
                    table_headers: headers
                });
            }
        }

        return { tableStructure: { headers, rows }, questions };
    };

    const parseMCQ = (lines: string[], part: number, sectionHeader: string, qStart: number, qEnd: number) => {
        const qs: Question[] = [];
        let currentQ: Question | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const qMatch = trimmed.match(/^(\d+)[.)]?\s+(.+)/);
            const optMatch = trimmed.match(/^([A-Z])([.)]|\s)\s*(.+)/);

            if (qMatch) {
                const qNum = parseInt(qMatch[1]);
                if (qNum < qStart || qNum > qEnd) {
                    if (currentQ) currentQ.question_text += " " + trimmed;
                    continue;
                }

                if (currentQ) qs.push(currentQ);
                currentQ = {
                    question_number: parseInt(qMatch[1]),
                    question_text: qMatch[2],
                    question_type: 'multiple_choice',
                    options: [],
                    part_number: part,
                    section_header: sectionHeader,
                    correct_answer: ''
                };
                continue;
            }

            if (optMatch && currentQ) {
                currentQ.options.push(optMatch[3]);
                continue;
            }

            if (currentQ && !optMatch) {
                currentQ.question_text += " " + trimmed;
            }
        }
        if (currentQ) qs.push(currentQ);
        return qs;
    };

    const parseNotes = (lines: string[], part: number, sectionHeader: string, qStart: number, qEnd: number) => {
        const qs: Question[] = [];
        let lastInfoRow: Question | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let lineHandled = false;

            const embeddedMatches = Array.from(trimmed.matchAll(/\((\d+)\)/g)).filter(m => {
                const n = parseInt(m[1]);
                return n >= qStart && n <= qEnd;
            });

            if (embeddedMatches.length > 0) {
                for (let j = 0; j < embeddedMatches.length; j++) {
                    const m = embeddedMatches[j];
                    const qNum = parseInt(m[1]);

                    const startPos = j === 0 ? 0 : embeddedMatches[j - 1].index! + embeddedMatches[j - 1][0].length;
                    const endPos = j === embeddedMatches.length - 1 ? trimmed.length : embeddedMatches[j + 1].index;

                    const segment = trimmed.substring(startPos, endPos);
                    let qText = segment.replace(m[0], '______').trim();

                    if (qText.replace(/[._\s]+/g, '').length === 0 && lastInfoRow) {
                        qText = lastInfoRow.question_text + " " + qText;
                        const idx = qs.indexOf(lastInfoRow);
                        if (idx > -1) qs.splice(idx, 1);
                        lastInfoRow = null;
                    }

                    qs.push({
                        question_number: qNum,
                        question_text: qText,
                        question_type: 'note_completion',
                        part_number: part,
                        label: 'Note',
                        value: '',
                        section_header: sectionHeader
                    });
                }
                lineHandled = true;
                lastInfoRow = null;
            }

            if (!lineHandled) {
                const listMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
                if (listMatch) {
                    const qNum = parseInt(listMatch[1]);
                    if (qNum >= qStart && qNum <= qEnd) {
                        let content = listMatch[2].trim();

                        if (content.replace(/[._\s]+/g, '').length === 0 && lastInfoRow) {
                            content = lastInfoRow.question_text + " " + (content || "______");
                            const idx = qs.indexOf(lastInfoRow);
                            if (idx > -1) qs.splice(idx, 1);
                            lastInfoRow = null;
                        } else if (!/[._–-]{3,}/.test(content)) {
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
                        lineHandled = true;
                        lastInfoRow = null;
                    }
                }
            }

            if (!lineHandled) {
                const looseMatches = Array.from(trimmed.matchAll(/(\d+)[._…–-]+/g)).filter(m => {
                    const n = parseInt(m[1]);
                    return n >= qStart && n <= qEnd;
                });
                if (looseMatches.length > 0) {
                    for (let j = 0; j < looseMatches.length; j++) {
                        const m = looseMatches[j];
                        const qNum = parseInt(m[1]);

                        const startPos = j === 0 ? 0 : looseMatches[j - 1].index! + looseMatches[j - 1][0].length;
                        const endPos = j === looseMatches.length - 1 ? trimmed.length : looseMatches[j + 1].index;

                        const segment = trimmed.substring(startPos, endPos);
                        let qText = segment.replace(m[0], '______').trim();

                        if (qText.replace(/[._\s]+/g, '').length === 0 && lastInfoRow) {
                            qText = lastInfoRow.question_text + " " + qText;
                            const idx = qs.indexOf(lastInfoRow);
                            if (idx > -1) qs.splice(idx, 1);
                            lastInfoRow = null;
                        }

                        qs.push({
                            question_number: qNum,
                            question_text: qText,
                            question_type: 'note_completion',
                            part_number: part,
                            label: 'Note',
                            value: '',
                            section_header: sectionHeader
                        });
                    }
                    lineHandled = true;
                    lastInfoRow = null;
                }
            }

            if (!lineHandled && trimmed.length > 0) {
                const newInfo = {
                    question_number: 0,
                    question_text: trimmed,
                    question_type: 'note_completion',
                    part_number: part,
                    is_info_row: true,
                    section_header: sectionHeader
                };
                qs.push(newInfo);
                lastInfoRow = newInfo;
            }
        }
        return qs;
    };

    const flattenAndExport = () => {
        const allQs = sections.flatMap(s => s.questions.map(q => ({
            ...q,
            question_image_url: partImage || q.question_image_url
        })));

        allQs.sort((a, b) => {
            const numA = typeof a.question_number === 'number' ? a.question_number : 0;
            const numB = typeof b.question_number === 'number' ? b.question_number : 0;
            return numA - numB;
        });

        const finalQs = allQs.map(q => ({
            ...q,
            part_number: targetPart
        }));

        onImport(finalQs);
        setOpen(false);
        setPartImage(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingImage(true);
            const res = await onUploadImage(file);
            setPartImage(res.url);
            toast.success("Image uploaded!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload image");
        } finally {
            setIsUploadingImage(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <Button onClick={() => setOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md border-amber-500">
                    <Sparkles className="w-4 h-4" />
                    Smart Paste Questions
                </Button>

                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 bg-[#fdfaf3]">
                    <div className="p-6 border-b flex items-start justify-between bg-amber-50/50 border-amber-100 shrink-0">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-amber-900 font-serif">Smart Content Parser</DialogTitle>
                            <DialogDescription className="mt-1 text-amber-800/80">
                                Paste your Listening Test content. The AI will preserve tables, formatting, and sections.
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="border-amber-200 text-amber-900 hover:bg-amber-100" onClick={() => setRawText(`Part 1: Questions 1-10\nComplete the table below. Write NO MORE THAN ONE WORD OR A NUMBER.\n\nHOLIDAY RENTALS DATES (EXAMPLE) : 10 – 22 JULY\nName of property\tLocation\tFeatures\tDisadvantages\nKingfisher\tRural\tApartment\tDistance from (1)........\nSunnybanks\tVillage\tHouse\tNo (2)........`)}>
                                Load Table Example
                            </Button>
                            <Button variant="outline" size="sm" className="border-amber-200 text-amber-900 hover:bg-amber-100" onClick={() => setRawText(`Part 2: Questions 11-16\nComplete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.\n\nStart of the project:\n11. The original plan was to build a ....................\n12. The location was chosen because of the ....................\n\nCosts:\n13. Total estimated cost: $ ....................\n14. Main expense: ....................`)}>
                                Load Note Example
                            </Button>
                        </div>
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

                            <TabsContent value="input" className="flex-1 flex flex-col min-h-0 m-0 p-6 space-y-4 overflow-y-auto">
                                <Alert className="bg-amber-50 border-amber-200 text-amber-900 shrink-0">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <AlertTitle>Format Tips</AlertTitle>
                                    <AlertDescription className="text-xs text-amber-800/80 mt-1">
                                        Paste directly from PDF. Ensure "Part X" and "Questions X-Y" lines are included for best structure detection.
                                    </AlertDescription>
                                </Alert>

                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 flex flex-col gap-4">
                                        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-amber-200">
                                            <label className="text-sm font-bold text-amber-900 shrink-0">Target Part:</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4].map(p => (
                                                    <Button
                                                        key={p}
                                                        variant={targetPart === p ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setTargetPart(p)}
                                                        className={targetPart === p ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-200 text-amber-800"}
                                                    >
                                                        Part {p}
                                                    </Button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-amber-600 italic">Questions will be imported into Part {targetPart}</p>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-amber-900">1. Paste Questions Text</label>
                                            <Textarea
                                                value={rawText}
                                                onChange={(e) => setRawText(e.target.value)}
                                                rows={12}
                                                placeholder="Paste part content here..."
                                                className="font-mono text-sm focus-visible:ring-amber-500 border-amber-200 bg-white text-stone-900 shadow-sm p-4 leading-relaxed min-h-[300px]"
                                            />
                                            <Button variant="outline" onClick={() => setShowTableBuilder(true)} className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-100 bg-white shadow-sm self-start mt-2">
                                                <TableIcon className="w-4 h-4" /> Open Table Builder
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-[350px] flex flex-col gap-2 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-amber-100 md:pl-6">
                                        <label className="text-sm font-semibold text-amber-900 block">2. Attach Reference Image (Optional)</label>

                                        <div className="bg-white rounded-lg border-2 border-dashed border-amber-200 flex flex-col items-center justify-center p-6 relative min-h-[250px] shadow-sm">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />

                                            {partImage ? (
                                                <div className="flex flex-col items-center w-full h-full gap-4">
                                                    <div className="relative w-full h-40 bg-stone-50 rounded border border-stone-200 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={partImage}
                                                            className="h-full object-contain"
                                                            alt="Test Preview"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 w-full">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={triggerFileInput}
                                                            className="flex-1 border-amber-200 text-amber-900 bg-white hover:bg-amber-50"
                                                        >
                                                            Change
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setPartImage(null)}
                                                            className="px-3"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-6">
                                                    <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-amber-500 border border-amber-100 shadow-sm">
                                                        <Eye className="w-10 h-10" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="font-semibold text-amber-900 text-base">Upload Map or Diagram</p>
                                                        <p className="text-xs text-stone-500 max-w-[220px] mx-auto leading-relaxed">
                                                            This image will be displayed alongside <strong>every question</strong> in this batch.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        onClick={triggerFileInput}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-md border-amber-500 w-full"
                                                        disabled={isUploadingImage}
                                                    >
                                                        {isUploadingImage ? (
                                                            <>Uploading...</>
                                                        ) : (
                                                            <><Sparkles className="w-4 h-4 mr-2" /> Choose Image</>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 flex justify-end pt-6 border-t border-amber-100 mt-4">
                                    <Button onClick={parseContent} size="lg" className="w-full sm:w-auto gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-lg text-base px-8 py-6 h-auto">
                                        Parse Content <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="preview" className="flex-1 min-h-0 m-0 relative bg-[#fdfaf3] flex flex-col">
                                <ScrollArea className="flex-1 w-full">
                                    <div className="p-6 space-y-6 w-full">
                                        {/* Show Part Image in Preview */}
                                        {partImage && (
                                            <div className="rounded-lg overflow-hidden border border-amber-200 bg-white/50 shadow-sm max-w-sm mx-auto">
                                                <div className="bg-amber-50/50 p-2 text-center text-xs text-amber-800 font-medium border-b border-amber-100">
                                                    Reference Image (Applied to all)
                                                </div>
                                                <img src={partImage} className="w-full h-auto max-h-[300px] object-contain p-2" alt="Preview" />
                                            </div>
                                        )}
                                        {sections.length === 0 ? (
                                            <div className="text-center py-12 text-stone-500 italic">
                                                No sections detected. Check input format.
                                            </div>
                                        ) : (
                                            sections.map((section, idx) => (
                                                <div key={idx} className="space-y-4">
                                                    <div className="border-b-2 border-amber-200 pb-2">
                                                        <h3 className="text-xl font-bold text-amber-900">{section.title}</h3>
                                                        {section.instruction && (
                                                            <p className="text-stone-800 font-medium mt-1 whitespace-pre-wrap">{section.instruction}</p>
                                                        )}
                                                    </div>

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
                                                            <div className="space-y-6">
                                                                {section.questions.map((q, qIdx) => (
                                                                    <div key={qIdx} className="flex gap-4 group">
                                                                        <div className="shrink-0 flex items-start pt-1">
                                                                            {q.question_number > 0 ? (
                                                                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 group-hover:bg-amber-200 transition-colors shadow-sm">
                                                                                    {q.question_number}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-8" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 space-y-1">
                                                                            <p className={`text-[#1a1a1a] leading-relaxed ${q.is_info_row ? (q.question_text.length < 40 ? 'font-bold text-lg text-amber-900 mt-2' : 'italic text-stone-600') : 'font-medium text-lg'}`}>
                                                                                {q.question_text}
                                                                            </p>
                                                                            {q.question_type === 'multiple_choice' && (
                                                                                <div className="space-y-1 ml-1 mt-2">
                                                                                    {q.options?.map((opt: string, oIdx: number) => (
                                                                                        <div key={oIdx} className="flex gap-3 items-center text-stone-700">
                                                                                            <div className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center text-[10px] font-bold bg-white text-stone-900 shadow-sm">
                                                                                                {String.fromCharCode(65 + oIdx)}
                                                                                            </div>
                                                                                            <span className="text-base">{opt}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                            {q.question_type === 'note_completion' && !q.is_info_row && (
                                                                                <div className="h-0.5 border-b-2 border-dotted border-stone-300 w-full max-w-[200px] mt-1 mb-4 opacity-50"></div>
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
                                <div className="shrink-0 bg-[#fdfaf3]/95 backdrop-blur border-t border-[#e0d6c7] p-4 flex justify-end gap-2 z-10 relative">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAnswerDialog(true)}
                                        className="absolute left-4 gap-2 border-amber-200 text-amber-900 bg-white hover:bg-amber-50 shadow-sm"
                                    >
                                        <ClipboardList className="w-4 h-4" /> Import Answers
                                    </Button>
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

            {/* Answer Import Dialog */}
            <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
                <DialogContent className="max-w-2xl bg-white border-stone-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-stone-900">Import Answers</DialogTitle>
                        <DialogDescription className="text-stone-500">
                            Paste the answer key list below. Format: "1. Answer" or "1 Answer".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            value={rawAnswers}
                            onChange={(e) => setRawAnswers(e.target.value)}
                            placeholder={`1. Saturday 25\n2. 55\n3. knives/ forks...`}
                            className="min-h-[300px] font-mono text-sm bg-white text-stone-900 border-stone-300 focus:border-amber-500"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowAnswerDialog(false)}>Cancel</Button>
                        <Button onClick={parseAndApplyAnswers} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Apply Answers
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Table Builder Dialog */}
            <Dialog open={showTableBuilder} onOpenChange={setShowTableBuilder}>
                <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-white border-stone-200 shadow-xl">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-2xl text-stone-900">Table Builder</DialogTitle>
                        <DialogDescription className="text-stone-500">
                            Create a structured table for your listening test. Questions will be automatically formatted.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-4">
                        <ListeningTableBuilder
                            onInsert={({ headers, rows }) => {
                                const headerLine = headers.map(h => h.trim()).join('\t');
                                const rowLines = rows.map(row => row.map(c => c || '').join('\t').trim()).filter(l => l.length > 0 && l.replace(/\t/g, '').length > 0);
                                const tableText = `\n\nPart X: Questions Y-Z\nComplete the table below.\n\n${headerLine}\n${rowLines.join('\n')}\n`;
                                setRawText(prev => prev + tableText);
                                setShowTableBuilder(false);
                                toast.success("Table appended to input text!");
                            }}
                            onCancel={() => setShowTableBuilder(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

