import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table as TableIcon, Plus, FileText } from "lucide-react";

interface PartDocumentEditorProps {
    part: number;
    initialText: string;
    onTextChange: (text: string) => void;
}

export function PartDocumentEditor({ part, initialText, onTextChange }: PartDocumentEditorProps) {
    const [text, setText] = useState(initialText);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setText(initialText);
    }, [initialText]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);
        onTextChange(val);
    };

    const insertTableTemplate = () => {
        const template = "\nHeader 1\tHeader 2\tHeader 3\nData 1\t(1)\tData 3\nData 4\tData 5\t(2)\n";
        const cursorLimit = textareaRef.current?.selectionStart || text.length;
        const newText = text.slice(0, cursorLimit) + template + text.slice(cursorLimit);
        setText(newText);
        onTextChange(newText);

        // Focus back
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    const insertQuestionMarker = () => {
        // Find next question number (naive)
        const matches = text.match(/\((\d+)\)/g);
        let nextNum = 1;
        if (matches) {
            const numbers = matches.map(m => parseInt(m.replace(/[()]/g, '')));
            nextNum = Math.max(...numbers) + 1;
        }

        const marker = `(${nextNum}) `;
        const cursorLimit = textareaRef.current?.selectionStart || text.length;
        const newText = text.slice(0, cursorLimit) + marker + text.slice(cursorLimit);
        setText(newText);
        onTextChange(newText);
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    return (
        <div className="w-full max-w-4xl mx-auto my-4 flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-1">
                <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={insertQuestionMarker}
                    className="h-8 text-xs gap-1.5 border-stone-200 bg-white hover:bg-stone-50 text-stone-600 shadow-sm"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={insertTableTemplate}
                    className="h-8 text-xs gap-1.5 border-stone-200 bg-white hover:bg-stone-50 text-stone-600 shadow-sm"
                >
                    <TableIcon className="w-3.5 h-3.5" /> Add Table
                </Button>
                <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-stone-400 p-2">
                    <FileText className="w-3 h-3 text-stone-300" /> Part {part} Draft
                </div>
            </div>

            {/* Paper Container */}
            <div className="relative bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-sm border border-stone-100 flex flex-col min-h-[700px] transition-all duration-300">
                <div className="flex-1 p-16 md:p-20">
                    <Textarea
                        ref={textareaRef}
                        value={text}
                        onChange={handleChange}
                        placeholder={`Start writing Part ${part} content...
Use (1) for blanks.
Use Square brackets for answers: (1) [Answer]
Use Tabs for table columns.`}
                        className="w-full h-full min-h-[600px] border-none focus-visible:ring-0 p-0 text-lg leading-relaxed font-serif text-stone-800 placeholder:text-stone-300 resize-none bg-transparent"
                        spellCheck={false}
                    />
                </div>

                {/* Subtle vertical line to mimic paper margin (hidden on mobile) */}
                <div className="absolute left-12 top-0 bottom-0 w-[1px] bg-red-50 hidden md:block" />
            </div>

            <div className="flex justify-between items-center px-1 text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                <span>IELTS listening • Section {part}</span>
                <span>Auto-parsing active</span>
            </div>
        </div>
    );
}
