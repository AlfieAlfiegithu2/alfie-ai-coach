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
        <div className="border rounded-xl border-[#E8D5A3] overflow-hidden shadow-sm bg-white mb-6">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-[#FFFAF0]">
                        <TableRow className="border-b border-[#E8D5A3]">
                            {headers.map((h, i) => (
                                <TableHead key={i} className="font-bold font-serif text-[#5d4e37] border-r border-[#E8D5A3] last:border-r-0 h-12 uppercase tracking-tight text-xs">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, rIdx) => (
                            <TableRow key={rIdx} className="border-b border-[#E8D5A3]/40 last:border-b-0 hover:bg-[#FFFAF0]/20 transition-colors">
                                {row.map((cell, cIdx) => {
                                    // Check for question marker like (1), (12), etc.
                                    const qMatch = cell.match(/\((\d+)\)/);

                                    if (qMatch) {
                                        const qNum = parseInt(qMatch[1]);
                                        const qId = questionMap[qNum];
                                        const val = qId ? (answers[qId] || '') : '';
                                        const isCorrect = isSubmitted && qId ? val.trim().toLowerCase() === (correctAnswers[qId] || '').trim().toLowerCase() : null;

                                        // Split cell content by the marker
                                        const parts = cell.split(qMatch[0]);
                                        const preText = parts[0];
                                        const postText = parts[1];

                                        return (
                                            <TableCell key={cIdx} className="p-4 border-r border-[#E8D5A3]/40 last:border-r-0 align-top">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-relaxed">
                                                    {preText && <span className="text-[#5d4e37] font-medium">{preText}</span>}

                                                    <div className="inline-flex items-center gap-1.5 min-w-[140px]">
                                                        <span className="font-bold text-sm text-[#5d4e37] shrink-0">
                                                            ({qNum})
                                                        </span>
                                                        {qId ? (
                                                            <div className="flex-1 min-w-[100px] relative">
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    onChange={(e) => onAnswerChange?.(qId, e.target.value)}
                                                                    disabled={isSubmitted}
                                                                    placeholder=".........................."
                                                                    className={`
                                                                      w-full h-7 bg-transparent border-t-0 border-l-0 border-r-0 border-b-2 
                                                                      transition-all focus:outline-none focus:ring-0
                                                                      text-sm font-serif font-medium placeholder:text-[#E8D5A3]
                                                                      ${isSubmitted
                                                                            ? isCorrect
                                                                                ? 'border-green-500 text-green-700 bg-green-50/30'
                                                                                : 'border-red-500 text-red-700 bg-red-50/30'
                                                                            : 'border-[#E8D5A3] hover:border-[#5d4e37] text-[#5d4e37]'
                                                                        }
                                                                  `}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 min-w-[100px] relative opacity-50">
                                                                <input
                                                                    type="text"
                                                                    disabled
                                                                    placeholder=".........................."
                                                                    className="w-full h-7 bg-transparent border-t-0 border-l-0 border-r-0 border-b-2 border-[#E8D5A3] text-sm font-serif font-medium text-[#5d4e37]"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {postText && <span className="text-[#5d4e37] font-medium">{postText}</span>}
                                                </div>
                                                {isSubmitted && !isCorrect && qId && correctAnswers[qId] && (
                                                    <div className="text-[10px] text-green-700 mt-2 font-bold bg-green-50 px-2 py-0.5 inline-block rounded border border-green-100">
                                                        Ans: {correctAnswers[qId]}
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    }

                                    return (
                                        <TableCell key={cIdx} className="p-4 border-r border-[#E8D5A3]/40 last:border-r-0 text-[#5d4e37] font-medium">
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
