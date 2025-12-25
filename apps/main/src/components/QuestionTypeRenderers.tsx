import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GripVertical, Check } from "lucide-react";

// Types
export type QuestionType =
    | 'multiple_choice'      // Single answer A/B/C
    | 'multiple_select_2'    // TWO letters A-E
    | 'multiple_select_4'    // FOUR answers from list
    | 'gap_completion'       // Fill in blank with words
    | 'note_completion'      // Note format with blanks
    | 'table_completion'     // Table with blanks
    | 'matching';            // Match items to options

export interface QuestionData {
    id: string;
    questionNumber: number;
    questionText: string;
    questionType: QuestionType;
    options?: string[];
    correctAnswer: string;
    correctAnswers?: string[]; // For multiple select
    explanation?: string;
}

// Props interfaces
interface MultipleChoiceEditorProps {
    question: QuestionData;
    onChange: (question: QuestionData) => void;
    onDelete: () => void;
}

interface MultipleSelectEditorProps {
    question: QuestionData;
    selectCount: 2 | 4;
    onChange: (question: QuestionData) => void;
    onDelete: () => void;
}

interface GapCompletionEditorProps {
    question: QuestionData;
    onChange: (question: QuestionData) => void;
    onDelete: () => void;
}

interface MatchingEditorProps {
    question: QuestionData;
    onChange: (question: QuestionData) => void;
    onDelete: () => void;
}

// Multiple Choice Editor (A/B/C)
export function MultipleChoiceEditor({ question, onChange, onDelete }: MultipleChoiceEditorProps) {
    const options = question.options || ['', '', ''];
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange({ ...question, options: newOptions });
    };

    const addOption = () => {
        if (options.length < 6) {
            onChange({ ...question, options: [...options, ''] });
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            // Update correct answer if it was the removed option
            const removedLabel = optionLabels[index];
            if (question.correctAnswer === removedLabel) {
                onChange({ ...question, options: newOptions, correctAnswer: '' });
            } else {
                onChange({ ...question, options: newOptions });
            }
        }
    };

    return (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
            <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 shrink-0 mt-1">
                        Q{question.questionNumber}
                    </Badge>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground w-20">Question #:</span>
                            <Input
                                type="number"
                                value={question.questionNumber}
                                onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-white text-stone-900"
                            />
                        </div>
                        <Textarea
                            value={question.questionText}
                            onChange={(e) => onChange({ ...question, questionText: e.target.value })}
                            placeholder="Enter the question text..."
                            className="min-h-[60px] bg-white text-stone-900"
                        />

                        <div className="grid gap-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Badge
                                        variant={question.correctAnswer === optionLabels[idx] ? "default" : "outline"}
                                        className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-all ${question.correctAnswer === optionLabels[idx]
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "hover:bg-green-100"
                                            }`}
                                        onClick={() => onChange({ ...question, correctAnswer: optionLabels[idx] })}
                                    >
                                        {optionLabels[idx]}
                                    </Badge>
                                    <Input
                                        value={opt}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${optionLabels[idx]}...`}
                                        className="flex-1 bg-white"
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => removeOption(idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {options.length < 6 && (
                                <Button size="sm" variant="outline" onClick={addOption} className="text-blue-600">
                                    <Plus className="h-4 w-4 mr-1" /> Add Option
                                </Button>
                            )}
                            <div className="flex-1" />
                            <span className="text-sm text-muted-foreground">
                                Correct: {question.correctAnswer || 'Click letter to set'}
                            </span>
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Multiple Select Editor (TWO or FOUR letters)
export function MultipleSelectEditor({ question, selectCount, onChange, onDelete }: MultipleSelectEditorProps) {
    const options = question.options || ['', '', '', '', ''];
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const correctAnswers = question.correctAnswers || [];

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange({ ...question, options: newOptions });
    };

    const toggleCorrectAnswer = (label: string) => {
        let newAnswers = [...correctAnswers];
        if (newAnswers.includes(label)) {
            newAnswers = newAnswers.filter(a => a !== label);
        } else if (newAnswers.length < selectCount) {
            newAnswers.push(label);
            newAnswers.sort();
        }
        onChange({
            ...question,
            correctAnswers: newAnswers,
            correctAnswer: newAnswers.join(', ')
        });
    };

    const addOption = () => {
        if (options.length < 8) {
            onChange({ ...question, options: [...options, ''] });
        }
    };

    return (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
            <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 shrink-0 mt-1">
                        Q{question.questionNumber}
                    </Badge>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-600">Select {selectCount}</Badge>
                            <span className="text-sm text-muted-foreground">
                                Selected: {correctAnswers.length}/{selectCount}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground w-20">Question #:</span>
                            <Input
                                type="number"
                                value={question.questionNumber}
                                onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-white text-stone-900"
                            />
                        </div>

                        <Textarea
                            value={question.questionText}
                            onChange={(e) => onChange({ ...question, questionText: e.target.value })}
                            placeholder="Enter the question text (e.g., 'What TWO pieces of advice does the speaker give?')"
                            className="min-h-[60px] bg-white text-stone-900"
                        />

                        <div className="grid gap-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Badge
                                        variant={correctAnswers.includes(optionLabels[idx]) ? "default" : "outline"}
                                        className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-all ${correctAnswers.includes(optionLabels[idx])
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "hover:bg-green-100"
                                            }`}
                                        onClick={() => toggleCorrectAnswer(optionLabels[idx])}
                                    >
                                        {correctAnswers.includes(optionLabels[idx]) ? (
                                            <Check className="h-3 w-3" />
                                        ) : (
                                            optionLabels[idx]
                                        )}
                                    </Badge>
                                    <Input
                                        value={opt}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${optionLabels[idx]}...`}
                                        className="flex-1 bg-white"
                                    />
                                </div>
                            ))}
                        </div>

                        {options.length < 8 && (
                            <Button size="sm" variant="outline" onClick={addOption} className="text-purple-600">
                                <Plus className="h-4 w-4 mr-1" /> Add Option
                            </Button>
                        )}
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Gap/Note Completion Editor
export function GapCompletionEditor({ question, onChange, onDelete }: GapCompletionEditorProps) {
    return (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
            <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 shrink-0 mt-1">
                        Q{question.questionNumber}
                    </Badge>
                    <div className="flex-1 space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                                Question/Context (use blank markers like _____ or leave empty)
                            </Label>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Question #:</span>
                                <Input
                                    type="number"
                                    value={question.questionNumber}
                                    onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                    className="w-20 bg-white text-stone-900"
                                />
                            </div>
                            <Textarea
                                value={question.questionText}
                                onChange={(e) => onChange({ ...question, questionText: e.target.value })}
                                placeholder="e.g., 'Sheep skin: white in color and _____' or just the context description"
                                className="min-h-[60px] bg-white text-stone-900"
                            />
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                                Correct Answer (NO MORE THAN TWO WORDS)
                            </Label>
                            <Input
                                value={question.correctAnswer}
                                onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
                                placeholder="Enter the correct answer..."
                                className="bg-white"
                            />
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Matching Question Editor
export function MatchingQuestionEditor({ question, onChange, onDelete }: MatchingEditorProps) {
    const options = question.options || ['helpful illustrations', 'easy to understand', 'up to date', 'comprehensive', 'specialized', 'useful case studies'];
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange({ ...question, options: newOptions });
    };

    const addOption = () => {
        if (options.length < 8) {
            onChange({ ...question, options: [...options, ''] });
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 3) {
            const newOptions = options.filter((_, i) => i !== index);
            onChange({ ...question, options: newOptions });
        }
    };

    return (
        <Card className="border-l-4 border-l-teal-500 bg-teal-50/30">
            <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                    <Badge variant="outline" className="bg-teal-100 text-teal-800 shrink-0 mt-1">
                        Q{question.questionNumber}
                    </Badge>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Question #:</span>
                            <Input
                                type="number"
                                value={question.questionNumber}
                                onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-white text-stone-900"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                                Item to match (e.g., book title)
                            </Label>
                            <Input
                                value={question.questionText}
                                onChange={(e) => onChange({ ...question, questionText: e.target.value })}
                                placeholder="e.g., 'The Science of Materials'"
                                className="bg-white text-stone-900"
                            />
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                                Correct Answer (letter)
                            </Label>
                            <Select
                                value={question.correctAnswer}
                                onValueChange={(v) => onChange({ ...question, correctAnswer: v })}
                            >
                                <SelectTrigger className="w-24 bg-white">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map((_, idx) => (
                                        <SelectItem key={idx} value={optionLabels[idx]}>
                                            {optionLabels[idx]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Shared Options Panel for Matching Questions
interface MatchingOptionsPanelProps {
    options: string[];
    onChange: (options: string[]) => void;
}

export function MatchingOptionsPanel({ options, onChange }: MatchingOptionsPanelProps) {
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange(newOptions);
    };

    const addOption = () => {
        if (options.length < 8) {
            onChange([...options, '']);
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 3) {
            onChange(options.filter((_, i) => i !== index));
        }
    };

    return (
        <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Matching Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center shrink-0">
                            {optionLabels[idx]}
                        </Badge>
                        <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            placeholder={`Option ${optionLabels[idx]}...`}
                            className="flex-1 bg-white text-sm"
                        />
                        {options.length > 3 && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-500"
                                onClick={() => removeOption(idx)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
                {options.length < 8 && (
                    <Button size="sm" variant="outline" onClick={addOption} className="w-full mt-2">
                        <Plus className="h-4 w-4 mr-1" /> Add Option
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
