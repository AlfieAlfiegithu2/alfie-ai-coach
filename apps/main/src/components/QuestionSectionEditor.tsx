import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2, Plus, Settings2, GripVertical, Table as TableIcon, Eye, PenTool } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListeningTableViewer } from "./ListeningTableViewer";
import {
    QuestionData,
    QuestionType,
    MultipleChoiceEditor,
    MultipleSelectEditor,
    GapCompletionEditor,
    MatchingQuestionEditor,
    MatchingOptionsPanel
} from './QuestionTypeRenderers';
import { ListeningTableBuilder } from './ListeningTableBuilder';

export interface SectionData {
    id: string;
    title: string;           // e.g., "Questions 11-14"
    instruction: string;     // e.g., "Choose the correct letter A, B or C."
    questionType: QuestionType;
    questions: QuestionData[];
    matchingOptions?: string[]; // For matching type sections
    tableConfig?: { headers: string[], rows: string[][] };
}

interface QuestionSectionEditorProps {
    section: SectionData;
    onChange: (section: SectionData) => void;
    onDelete: () => void;
    startingQuestionNumber: number;
}

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string; description: string }[] = [
    { value: 'multiple_choice', label: 'Multiple Choice (A/B/C)', description: 'Choose ONE correct answer' },
    { value: 'multiple_select_2', label: 'Multiple Select (TWO)', description: 'Choose TWO letters' },
    { value: 'multiple_select_4', label: 'Multiple Select (FOUR)', description: 'Choose FOUR answers' },
    { value: 'gap_completion', label: 'Gap/Note Completion', description: 'Write NO MORE THAN TWO WORDS' },
    { value: 'table_completion', label: 'Table Completion', description: 'Fill in table cells' },
    { value: 'matching', label: 'Matching', description: 'Match items to options' },
];

function generateId(): string {
    return Math.random().toString(36).substring(2, 11);
}

export function QuestionSectionEditor({
    section,
    onChange,
    onDelete,
    startingQuestionNumber
}: QuestionSectionEditorProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [showTableBuilder, setShowTableBuilder] = useState(false);

    const updateQuestion = (index: number, question: QuestionData) => {
        const newQuestions = [...section.questions];
        newQuestions[index] = question;
        onChange({ ...section, questions: newQuestions });
    };

    const deleteQuestion = (index: number) => {
        const newQuestions = section.questions.filter((_, i) => i !== index);
        // Renumber questions
        const renumbered = newQuestions.map((q, i) => ({
            ...q,
            questionNumber: startingQuestionNumber + i
        }));
        onChange({ ...section, questions: renumbered });
    };

    const addQuestion = () => {
        const nextNumber = startingQuestionNumber + section.questions.length;
        const newQuestion: QuestionData = {
            id: generateId(),
            questionNumber: nextNumber,
            questionText: '',
            questionType: section.questionType,
            options: section.questionType === 'multiple_choice' ? ['', '', ''] :
                section.questionType.startsWith('multiple_select') ? ['', '', '', '', ''] :
                    section.questionType === 'matching' ? section.matchingOptions || [] : undefined,
            correctAnswer: '',
            correctAnswers: section.questionType.startsWith('multiple_select') ? [] : undefined,
        };
        onChange({ ...section, questions: [...section.questions, newQuestion] });
    };

    const handleTypeChange = (newType: QuestionType) => {
        // Clear questions when type changes as the structure is different
        onChange({
            ...section,
            questionType: newType,
            questions: [],
            tableConfig: newType === 'table_completion' ? { headers: ['Column 1', 'Column 2'], rows: [['', '']] } : undefined,
            matchingOptions: newType === 'matching' ? ['', '', '', '', '', ''] : undefined
        });
    };

    const handleTableInsert = (config: { headers: string[], rows: string[][] }) => {
        // Extract questions from table cells that contain (number) markers
        const questions: QuestionData[] = [];
        let qNum = startingQuestionNumber;

        config.rows.forEach((row, rowIdx) => {
            row.forEach((cell, cellIdx) => {
                const match = cell.match(/\((\d+)\)/);
                if (match) {
                    questions.push({
                        id: generateId(),
                        questionNumber: parseInt(match[1]) || qNum,
                        questionText: `Row ${rowIdx + 1}, ${config.headers[cellIdx] || 'Column ' + (cellIdx + 1)}`,
                        questionType: 'table_completion',
                        correctAnswer: '',
                    });
                    qNum++;
                }
            });
        });

        onChange({
            ...section,
            tableConfig: config,
            questions
        });
        setShowTableBuilder(false);
    };

    const renderQuestionEditor = (question: QuestionData, index: number) => {
        const q = { ...question, questionNumber: startingQuestionNumber + index };

        switch (section.questionType) {
            case 'multiple_choice':
                return (
                    <MultipleChoiceEditor
                        key={question.id}
                        question={q}
                        onChange={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                    />
                );
            case 'multiple_select_2':
                return (
                    <MultipleSelectEditor
                        key={question.id}
                        question={q}
                        selectCount={2}
                        onChange={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                    />
                );
            case 'multiple_select_4':
                return (
                    <MultipleSelectEditor
                        key={question.id}
                        question={q}
                        selectCount={4}
                        onChange={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                    />
                );
            case 'gap_completion':
            case 'note_completion':
                return (
                    <GapCompletionEditor
                        key={question.id}
                        question={q}
                        onChange={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                    />
                );
            case 'matching':
                return (
                    <MatchingQuestionEditor
                        key={question.id}
                        question={q}
                        onChange={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                    />
                );
            default:
                return (
                    <GapCompletionEditor
                        key={question.id}
                        question={q}
                        onChange={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                    />
                );
        }
    };

    return (
        <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="py-4 px-6 cursor-pointer hover:bg-[#FFFAF0]/20 transition-colors border-b border-[#E8D5A3]/30">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <GripVertical className="h-5 w-5 text-[#A68B5B]" />
                                <div className="flex items-center gap-3">
                                    <div className="h-10 px-6 bg-[#0c0c0c] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-4 ring-[#FFFAF0]">
                                        {section.title || "New Section"}
                                    </div>
                                    <div className="h-10 px-6 border-2 border-[#5d4e37] text-[#5d4e37] rounded-full flex items-center justify-center font-bold text-xs uppercase tracking-widest bg-white">
                                        {QUESTION_TYPE_OPTIONS.find(t => t.value === section.questionType)?.label || section.questionType}
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-[#FFFAF0] border border-[#E8D5A3] flex items-center justify-center text-[#5D4E37] font-bold text-xs">
                                        {section.questions.length}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete();
                                    }}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                                <div className="h-10 w-10 rounded-full bg-[#FFFAF0] border border-[#E8D5A3] flex items-center justify-center text-[#5d4e37]">
                                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </div>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="pt-6 px-6 pb-8 space-y-8">
                        {/* Section Settings */}
                        <div className="grid gap-6 p-6 bg-[#FFFAF0]/30 border border-[#E8D5A3] rounded-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-widest pl-1">Question Type</Label>
                                    <Select value={section.questionType} onValueChange={handleTypeChange}>
                                        <SelectTrigger className="h-12 bg-white border-[#E8D5A3] text-[#5d4e37] rounded-xl focus:ring-[#5d4e37]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-[#E8D5A3]">
                                            {QUESTION_TYPE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value} className="focus:bg-[#FFFAF0] rounded-lg">
                                                    <div className="py-1">
                                                        <div className="font-bold text-[#5d4e37]">{opt.label}</div>
                                                        <div className="text-[10px] text-[#A68B5B] uppercase font-bold tracking-tighter">{opt.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-widest pl-1">Quick Actions</Label>
                                    <div className="flex items-center gap-2">
                                        {section.questionType !== 'table_completion' && (
                                            <Button
                                                variant="outline"
                                                className="h-12 w-full text-[#5d4e37] bg-white hover:bg-[#FFFAF0] border-[#E8D5A3] rounded-xl font-bold gap-2 text-sm shadow-sm transition-all active:scale-95"
                                                onClick={() => {
                                                    handleTypeChange('table_completion');
                                                    setShowTableBuilder(true);
                                                }}
                                            >
                                                <TableIcon className="w-4 h-4 text-[#A68B5B]" />
                                                Create Table
                                            </Button>
                                        )}
                                        <Input value={startingQuestionNumber} disabled className="hidden" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-widest pl-1">Section Title (e.g. Questions 1-5)</Label>
                                <Input
                                    value={section.title}
                                    onChange={(e) => onChange({ ...section, title: e.target.value })}
                                    placeholder="Questions 11-14"
                                    className="h-12 bg-white border-[#E8D5A3] text-[#5d4e37] rounded-xl focus:ring-[#5d4e37] font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-widest pl-1">Instruction Text</Label>

                                <Textarea
                                    value={section.instruction}
                                    onChange={(e) => onChange({ ...section, instruction: e.target.value })}
                                    placeholder="e.g., Choose the correct letter A, B or C."
                                    className="min-h-[80px] bg-white border-[#E8D5A3] text-[#5d4e37] rounded-xl focus:ring-[#5d4e37]"
                                />
                            </div>
                        </div>

                        <Tabs defaultValue="edit" className="w-full">
                            <div className="flex items-center justify-between mb-6">
                                <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-widest">
                                    Content ({section.questions.length} questions)
                                </Label>
                                <TabsList className="bg-[#0c0c0c] p-1 h-11 rounded-full border border-black shadow-lg">
                                    <TabsTrigger
                                        value="edit"
                                        className="rounded-full px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-black text-white/60 font-bold text-xs uppercase transition-all"
                                    >
                                        <PenTool className="w-3 h-3 mr-2" /> Edit
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="preview"
                                        className="rounded-full px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-black text-white/60 font-bold text-xs uppercase transition-all"
                                    >
                                        <Eye className="w-3 h-3 mr-2" /> Preview
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="preview" className="mt-0">
                                <div className="p-6 border rounded-2xl bg-[#FFFAF0] border-[#E8D5A3] shadow-sm">
                                    <div className="space-y-4">
                                        <div className="border-l-4 border-[#5d4e37] pl-4 py-1">
                                            <h4 className="font-bold text-xl text-[#5d4e37] font-serif">
                                                {section.title || (section.questions.length > 0
                                                    ? `Questions ${section.questions[0]?.questionNumber}${section.questions.length > 1 ? `-${section.questions[section.questions.length - 1]?.questionNumber}` : ''}`
                                                    : 'Questions')}
                                            </h4>
                                            {section.instruction && (
                                                <p className="text-sm font-bold text-[#5d4e37] uppercase tracking-tight mt-1">
                                                    {section.instruction}
                                                </p>
                                            )}
                                        </div>

                                        {section.questionType === 'table_completion' && section.tableConfig ? (
                                            <ListeningTableViewer
                                                headers={section.tableConfig.headers}
                                                rows={section.tableConfig.rows}
                                                questionMap={section.questions.reduce((acc, q) => ({ ...acc, [q.questionNumber]: q.id }), {} as Record<number, string>)}
                                                answers={section.questions.reduce((acc, q) => ({ ...acc, [q.id]: `(${q.correctAnswer || 'Answer'})` }), {})}
                                                isSubmitted={true}
                                                correctAnswers={section.questions.reduce((acc, q) => ({ ...acc, [q.id]: q.correctAnswer }), {})}
                                            />
                                        ) : (
                                            <div className="space-y-6 pt-4">
                                                {section.questions.map((q) => (
                                                    <div key={q.id} className="flex items-start gap-5">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded bg-[#5d4e37] text-white flex items-center justify-center font-bold shadow-md">
                                                            {q.questionNumber}
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div className="text-lg font-medium text-[#5d4e37] leading-relaxed">
                                                                {/* Replace markers with dotted lines if gap completion */}
                                                                {section.questionType.includes('gap') || section.questionType.includes('note')
                                                                    ? q.questionText.split(/(\(.*?\)|_{2,})/).map((part, i) => (
                                                                        part.match(/(\(.*?\)|_{2,})/)
                                                                            ? <span key={i} className="inline-block border-b-2 border-dotted border-[#E8D5A3] min-w-[120px] h-6 mx-1 translate-y-1"></span>
                                                                            : <span key={i}>{part}</span>
                                                                    ))
                                                                    : q.questionText
                                                                }
                                                            </div>
                                                            <div className="max-w-md">
                                                                <div className="w-full px-5 py-3 rounded-2xl bg-white border-2 border-[#E8D5A3] text-[#5d4e37] font-serif italic text-sm shadow-sm flex items-center justify-between">
                                                                    <span>{q.correctAnswer || "No answer set"}</span>
                                                                    <Badge className="bg-[#FFFAF0] text-[#A68B5B] border-[#E8D5A3] rounded-lg text-[10px]">Correct</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-6 pt-4 border-t border-[#E8D5A3]/50">
                                            <p className="text-[10px] text-[#5d4e37]/60 text-center italic font-medium uppercase tracking-widest">
                                                Preview Mode: High-Fidelity IELTS Student View
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="edit" className="mt-0 space-y-6">
                                {/* Matching Options Panel */}
                                {section.questionType === 'matching' && (
                                    <MatchingOptionsPanel
                                        options={section.matchingOptions || ['', '', '', '', '', '']}
                                        onChange={(options) => onChange({ ...section, matchingOptions: options })}
                                    />
                                )}

                                {/* Table Builder */}
                                {section.questionType === 'table_completion' && (
                                    <div>
                                        {showTableBuilder ? (
                                            <ListeningTableBuilder
                                                onInsert={handleTableInsert}
                                                onCancel={() => setShowTableBuilder(false)}
                                                initialData={section.tableConfig}
                                            />
                                        ) : (
                                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                                                {section.tableConfig ? (
                                                    <div>
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            Table configured with {section.questions.length} questions
                                                        </p>
                                                        <Button onClick={() => setShowTableBuilder(true)} variant="outline">
                                                            Edit Table
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button onClick={() => setShowTableBuilder(true)}>
                                                        <Settings2 className="h-4 w-4 mr-2" /> Configure Table
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Questions List */}
                                {section.questionType !== 'table_completion' && (
                                    <div className="space-y-3">
                                        {section.questions.map((q, idx) => renderQuestionEditor(q, idx))}

                                        <Button
                                            onClick={addQuestion}
                                            variant="outline"
                                            className="w-full border-dashed hover:border-solid"
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Add Question
                                        </Button>
                                    </div>
                                )}

                                {/* Table Questions (read-only list) */}
                                {section.questionType === 'table_completion' && section.questions.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <Label className="text-sm font-medium">Table Questions - Set Answers:</Label>
                                        {section.questions.map((q, idx) => (
                                            <div key={q.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded border border-amber-200">
                                                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                                    Q{q.questionNumber}
                                                </Badge>
                                                <span className="flex-1 text-sm text-muted-foreground">{q.questionText}</span>
                                                <Input
                                                    value={q.correctAnswer}
                                                    onChange={(e) => updateQuestion(idx, { ...q, correctAnswer: e.target.value })}
                                                    placeholder="Answer"
                                                    className="w-48 bg-white"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
