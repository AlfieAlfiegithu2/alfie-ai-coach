import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, List, Table as TableIcon } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';

interface ListeningTableBuilderProps {
    onInsert: (config: { headers: string[], rows: string[][] }) => void;
    onCancel: () => void;
    initialData?: { headers: string[], rows: string[][] };
}

export function ListeningTableBuilder({ onInsert, onCancel, initialData }: ListeningTableBuilderProps) {
    const [tbHeaders, setTbHeaders] = useState<string[]>(initialData?.headers || ["Column 1", "Column 2", "Column 3"]);
    const [tbRows, setTbRows] = useState<string[][]>(initialData?.rows || [["", "", ""], ["", "", ""]]);

    const addColumn = () => {
        setTbHeaders([...tbHeaders, `Col ${tbHeaders.length + 1}`]);
        setTbRows(tbRows.map(r => [...r, '']));
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

    const updateCell = (rIdx: number, cIdx: number, val: string) => {
        let finalVal = val;
        // If it's just a number like "1", transform it to "(1)" (IELTS requirement)
        if (/^\d+$/.test(val.trim())) {
            finalVal = `(${val.trim()})`;
        }

        const newRows = [...tbRows];
        if (!newRows[rIdx]) {
            newRows[rIdx] = Array(tbHeaders.length).fill('');
        }
        newRows[rIdx][cIdx] = finalVal;
        setTbRows(newRows);
    };

    const addRow = () => {
        setTbRows([...tbRows, Array(tbHeaders.length).fill('')]);
    };

    const removeRow = (rIdx: number) => {
        const newRows = [...tbRows];
        newRows.splice(rIdx, 1);
        setTbRows(newRows);
    };

    const handleInsert = () => {
        onInsert({ headers: tbHeaders, rows: tbRows });
    };

    const questionCount = tbRows.flat().filter(c => /\(?(\d+)\)?/.test(c || '')).length;

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                    <h4 className="font-bold text-lg text-stone-900">Interactive Table Preview</h4>
                    <p className="text-sm text-stone-500">
                        Edit headers directly. Add rows/columns as needed. Use <b>(1)</b> for questions.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                        {questionCount} Questions Detected
                    </Badge>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={addColumn} className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2">
                            <List className="w-4 h-4" /> Add Column
                        </Button>
                        <Button variant="outline" size="sm" onClick={addRow} className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-2">
                            <TableIcon className="w-4 h-4" /> Add Row
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 border rounded-lg border-stone-200 overflow-auto shadow-sm bg-white min-h-[400px]">
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
                                {tbHeaders.map((_, cIdx) => {
                                    const cellValue = row[cIdx] || '';
                                    const qMatch = cellValue.match(/\(?(\d+)\)?/);
                                    const isQuestion = !!qMatch;
                                    const qNum = qMatch ? qMatch[1] : null;

                                    return (
                                        <TableCell key={cIdx} className="p-2 border-r border-stone-100 last:border-0 align-top min-w-[150px]">
                                            <div className="relative group">
                                                <Input
                                                    value={cellValue}
                                                    onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                                                    className={`h-9 border-stone-200 bg-white text-stone-900 focus-visible:ring-amber-500 focus-visible:border-amber-500 ${isQuestion ? 'pr-12 text-green-700 font-medium border-green-200 ring-1 ring-green-100' : ''}`}
                                                    placeholder={cIdx === 0 ? "Content..." : "(1)"}
                                                />
                                                {isQuestion && (
                                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                                        <Badge className="h-5 px-1.5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] font-bold shadow-none">
                                                            Q{qNum}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="p-2 align-middle text-center w-[50px]">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeRow(rIdx)}>
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

            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleInsert} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm px-8">
                    {initialData ? 'Update Table' : 'Insert Table'}
                </Button>
            </div>
        </div>
    );
}
