import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2, Plus, Settings2, GripVertical } from "lucide-react";
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
        <Card className="border-2 border-dashed border-slate-300 bg-white">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <GripVertical className="h-5 w-5 text-slate-400" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={section.title}
                                            onChange={(e) => onChange({ ...section, title: e.target.value })}
                                            placeholder="Questions 11-14"
                                            className="h-8 w-48 font-semibold"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Badge variant="secondary" className="text-xs">
                                            {QUESTION_TYPE_OPTIONS.find(t => t.value === section.questionType)?.label || section.questionType}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {section.questions.length} Q
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete();
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                        </div>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                        {/* Section Settings */}
                        <div className="grid gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Question Type</Label>
                                    <Select value={section.questionType} onValueChange={handleTypeChange}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUESTION_TYPE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div>
                                                        <div className="font-medium">{opt.label}</div>
                                                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Starting Question #</Label>
                                    <Input value={startingQuestionNumber} disabled className="bg-slate-100" />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Instruction Text</Label>
                                <Textarea
                                    value={section.instruction}
                                    onChange={(e) => onChange({ ...section, instruction: e.target.value })}
                                    placeholder="e.g., Choose the correct letter A, B or C."
                                    className="min-h-[60px] bg-white"
                                />
                            </div>
                        </div>

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
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
