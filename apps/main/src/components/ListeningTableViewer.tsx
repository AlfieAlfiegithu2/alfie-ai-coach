import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ListeningTableViewerProps {
    headers: string[];
    rows: string[][];
    answers?: Record<string, string>;
    onAnswerChange?: (questionId: string, value: string) => void;
    // Map question number to Question ID
    questionMap?: Record<number, string>;
    isSubmitted?: boolean;
    correctAnswers?: Record<string, string>;
}

export function ListeningTableViewer({
    headers,
    rows,
    answers = {},
    onAnswerChange,
    questionMap = {},
    isSubmitted = false,
    correctAnswers = {}
}: ListeningTableViewerProps) {

    return (
        <div className="border rounded-xl border-stone-200 overflow-hidden shadow-sm bg-white mb-6">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-stone-50">
                        <TableRow>
                            {headers.map((h, i) => (
                                <TableHead key={i} className="font-bold text-stone-900 border-b border-r border-stone-200 last:border-r-0">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, rIdx) => (
                            <TableRow key={rIdx} className="hover:bg-slate-50/50">
                                {row.map((cell, cIdx) => {
                                    // Check for question marker like (1), (12), etc.
                                    const qMatch = cell.match(/\((\d+)\)/);

                                    if (qMatch) {
                                        const qNum = parseInt(qMatch[1]);
                                        const qId = questionMap[qNum];
                                        const val = qId ? (answers[qId] || '') : '';
                                        const isCorrect = isSubmitted && qId ? val.trim().toLowerCase() === (correctAnswers[qId] || '').trim().toLowerCase() : null;

                                        return (
                                            <TableCell key={cIdx} className="p-3 border-r border-stone-100 last:border-r-0 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-stone-500 shrink-0">
                                                        {qNum}
                                                    </span>
                                                    {qId ? (
                                                        <div className="flex-1 min-w-[120px]">
                                                            <Input
                                                                value={val}
                                                                onChange={(e) => onAnswerChange?.(qId, e.target.value)}
                                                                disabled={isSubmitted}
                                                                className={`
                                                                    h-8 bg-white border-stone-300 focus:ring-amber-500
                                                                    ${isSubmitted
                                                                        ? isCorrect
                                                                            ? 'border-green-500 bg-green-50 text-green-900'
                                                                            : 'border-red-500 bg-red-50 text-red-900'
                                                                        : ''
                                                                    }
                                                                `}
                                                            />
                                                            {isSubmitted && !isCorrect && correctAnswers[qId] && (
                                                                <div className="text-[10px] text-green-600 mt-1 font-medium">
                                                                    {correctAnswers[qId]}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-red-500 text-xs">ID Missing</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    }

                                    return (
                                        <TableCell key={cIdx} className="p-3 border-r border-stone-100 last:border-r-0 text-stone-700">
                                            {cell}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
