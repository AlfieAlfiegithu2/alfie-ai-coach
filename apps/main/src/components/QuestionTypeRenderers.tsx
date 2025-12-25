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
        <Card className="border rounded-2xl border-[#E8D5A3] border-l-4 border-l-[#5d4e37] bg-[#FEF9E7]/30 shadow-sm overflow-hidden group">
            <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-[#E8D5A3] bg-white flex items-center justify-center text-[#5d4e37] font-bold text-sm shadow-sm group-hover:border-[#5d4e37] transition-colors">
                        Q{question.questionNumber}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Number</Label>
                                <Input
                                    type="number"
                                    value={question.questionNumber}
                                    onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                    className="h-10 bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
                                />
                            </div>
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
                            <span className="text-sm text-stone-600">
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
        <Card className="border rounded-2xl border-[#E8D5A3] border-l-4 border-l-[#5d4e37] bg-[#FEF9E7]/30 shadow-sm overflow-hidden group">
            <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-[#E8D5A3] bg-white flex items-center justify-center text-[#5d4e37] font-bold text-sm shadow-sm group-hover:border-[#5d4e37] transition-colors">
                        Q{question.questionNumber}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-[#5d4e37] text-white">Select {selectCount}</Badge>
                            <span className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">
                                {correctAnswers.length}/{selectCount} Selected
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Number</Label>
                            <Input
                                type="number"
                                value={question.questionNumber}
                                onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                className="w-20 h-10 bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
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
        <Card className="border rounded-2xl border-[#E8D5A3] border-l-4 border-l-[#5d4e37] bg-[#FEF9E7]/30 shadow-sm overflow-hidden group">
            <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-[#E8D5A3] bg-white flex items-center justify-center text-[#5d4e37] font-bold text-sm shadow-sm group-hover:border-[#5d4e37] transition-colors">
                        Q{question.questionNumber}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Number</Label>
                                <Input
                                    type="number"
                                    value={question.questionNumber}
                                    onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                    className="w-20 h-10 bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Question / Context</Label>
                            <Textarea
                                value={question.questionText}
                                onChange={(e) => onChange({ ...question, questionText: e.target.value })}
                                placeholder="Enter question context... use ( ) for gaps"
                                className="min-h-[80px] bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Correct Answer (NO MORE THAN THREE WORDS)</Label>
                            <Input
                                value={question.correctAnswer}
                                onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
                                placeholder="Enter the correct answer..."
                                className="h-10 bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
                            />
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 mt-1"
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
    const options = question.options || [];
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    return (
        <Card className="border rounded-2xl border-[#E8D5A3] border-l-4 border-l-[#5d4e37] bg-[#FEF9E7]/30 shadow-sm overflow-hidden group">
            <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-[#E8D5A3] bg-white flex items-center justify-center text-[#5d4e37] font-bold text-sm shadow-sm group-hover:border-[#5d4e37] transition-colors">
                        Q{question.questionNumber}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Number</Label>
                                <Input
                                    type="number"
                                    value={question.questionNumber}
                                    onChange={(e) => onChange({ ...question, questionNumber: parseInt(e.target.value) || 0 })}
                                    className="w-20 h-10 bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Item to match (e.g., book title)</Label>
                            <Input
                                value={question.questionText}
                                onChange={(e) => onChange({ ...question, questionText: e.target.value })}
                                placeholder="e.g. 'The Science of Materials'"
                                className="h-10 bg-white border-[#E8D5A3] text-[#5d4e37] focus:ring-[#5d4e37]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#5d4e37] uppercase tracking-wider">Correct Answer (letter)</Label>
                            <Select
                                value={question.correctAnswer}
                                onValueChange={(val) => onChange({ ...question, correctAnswer: val })}
                            >
                                <SelectTrigger className="w-40 h-10 bg-white border-[#E8D5A3] text-[#5d4e37]">
                                    <SelectValue placeholder="Select letter" />
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
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 mt-1"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

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
        <Card className="border rounded-2xl border-[#E8D5A3] shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-[#FEF9E7]/50 border-b border-[#E8D5A3] py-3">
                <CardTitle className="text-sm font-bold text-[#5d4e37] uppercase tracking-wider">Matching Options (A-H)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#5d4e37] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {optionLabels[idx]}
                        </div>
                        <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            placeholder={`Option ${optionLabels[idx]}...`}
                            className="flex-1 h-10 bg-white border-[#E8D5A3] text-[#5d4e37]"
                        />
                        {options.length > 3 && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => removeOption(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
                {options.length < 8 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={addOption}
                        className="w-full mt-2 border-dashed border-[#E8D5A3] text-[#5d4e37] hover:bg-[#FEF9E7]"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
