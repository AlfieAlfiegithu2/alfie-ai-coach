import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Trash2, X, Highlighter, Minus, Plus } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DrawingCanvasProps {
    isOpen: boolean;
    onClose: () => void;
    containerRef: React.RefObject<HTMLElement>;
}

type Tool = 'pen' | 'highlighter' | 'eraser';

// Predefined colors
const HIGHLIGHTER_COLORS = [
    { name: 'Orange', value: '#FFB74D' },
    { name: 'Yellow', value: '#FFE082' },
    { name: 'Green', value: '#A5D6A7' },
    { name: 'Blue', value: '#90CAF9' },
    { name: 'Pink', value: '#F48FB1' },
];

const PEN_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#F44336' },
    { name: 'Brown', value: '#8B4513' },
    { name: 'Blue', value: '#1976D2' },
];

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    isOpen,
    onClose,
    containerRef
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('highlighter');
    const [color, setColor] = useState('#FFB74D'); // Orange default
    const [lineWidth, setLineWidth] = useState(20);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

    // Get drawing color based on tool
    const getDrawColor = useCallback(() => {
        if (tool === 'highlighter') {
            return `${color}40`; // 25% opacity for highlighter
        }
        return color;
    }, [tool, color]);

    // Resize canvas to match container
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Store current drawing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx?.drawImage(canvas, 0, 0);

        // Resize to match container's scroll dimensions
        const rect = container.getBoundingClientRect();
        const scrollHeight = container.scrollHeight;
        canvas.width = rect.width;
        canvas.height = scrollHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${scrollHeight}px`;

        // Restore drawing
        const ctx = canvas.getContext('2d');
        if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0) {
            ctx.drawImage(tempCanvas, 0, 0);
        }
    }, [containerRef]);

    useEffect(() => {
        if (isOpen) {
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            return () => window.removeEventListener('resize', resizeCanvas);
        }
    }, [isOpen, resizeCanvas]);

    // Handle keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'h':
                    selectTool('highlighter');
                    break;
                case 'p':
                    selectTool('pen');
                    break;
                case 'e':
                    selectTool('eraser');
                    break;
                case 'c':
                    if (!e.ctrlKey && !e.metaKey) {
                        clearCanvas();
                    }
                    break;
                case 'escape':
                    onClose();
                    break;
                case '[':
                    setLineWidth(prev => Math.max(tool === 'pen' ? 1 : 10, prev - 5));
                    break;
                case ']':
                    setLineWidth(prev => Math.min(50, prev + 5));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, tool, onClose]);

    // Get canvas coordinates from mouse/touch event
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return null;

        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;

        let clientX: number, clientY: number;

        if ('touches' in e) {
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - containerRect.left + scrollLeft,
            y: clientY - containerRect.top + scrollTop
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getCoordinates(e);
        if (!coords) return;

        setIsDrawing(true);
        setLastPoint(coords);

        // Draw a dot for single clicks
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, lineWidth / 2, 0, Math.PI * 2);
            if (tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = getDrawColor();
            }
            ctx.fill();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !lastPoint) return;

        const coords = getCoordinates(e);
        if (!coords) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = getDrawColor();
        }

        ctx.stroke();
        setLastPoint(coords);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        setLastPoint(null);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const selectTool = (newTool: Tool) => {
        setTool(newTool);
        if (newTool === 'highlighter') {
            setLineWidth(20);
            if (!HIGHLIGHTER_COLORS.find(c => c.value === color)) {
                setColor('#FFB74D');
            }
        } else if (newTool === 'pen') {
            setLineWidth(3);
            if (!PEN_COLORS.find(c => c.value === color)) {
                setColor('#000000');
            }
        } else {
            setLineWidth(30);
        }
    };

    if (!isOpen) return null;

    const currentColors = tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;

    return (
        <TooltipProvider delayDuration={200}>
            {/* Drawing Canvas - positioned over the scrollable content */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 z-10"
                style={{
                    touchAction: 'none',
                    pointerEvents: 'auto',
                    cursor: tool === 'eraser' ? 'crosshair' : 'crosshair'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />

            {/* Floating Toolbar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-[#E8D5A3] p-3 flex items-center gap-3">
                {/* Tool Selection */}
                <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectTool('highlighter')}
                                className={`p-2 rounded-lg transition-all ${tool === 'highlighter' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}
                            >
                                <Highlighter className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Highlighter</p>
                            <p className="text-xs text-white/70">Press H</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectTool('pen')}
                                className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}
                            >
                                <Pencil className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Pen</p>
                            <p className="text-xs text-white/70">Press P</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectTool('eraser')}
                                className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}
                            >
                                <Eraser className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Eraser</p>
                            <p className="text-xs text-white/70">Press E</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Color Selection */}
                {tool !== 'eraser' && (
                    <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-3">
                        {currentColors.map((c) => (
                            <Tooltip key={c.value}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setColor(c.value)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${color === c.value
                                                ? 'border-[#8B4513] scale-110 ring-2 ring-[#8B4513]/30'
                                                : 'border-gray-200 hover:scale-105'
                                            }`}
                                        style={{
                                            backgroundColor: tool === 'highlighter' ? `${c.value}60` : c.value
                                        }}
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                                    <p className="font-medium">{c.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                )}

                {/* Size Adjustment */}
                <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLineWidth(Math.max(tool === 'pen' ? 1 : 10, lineWidth - 5))}
                                className="p-2 text-[#5c4b37] hover:bg-[#FEF9E7]"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Smaller</p>
                            <p className="text-xs text-white/70">Press [</p>
                        </TooltipContent>
                    </Tooltip>

                    <div className="w-8 text-center text-sm font-medium text-[#5c4b37]">{lineWidth}</div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLineWidth(Math.min(50, lineWidth + 5))}
                                className="p-2 text-[#5c4b37] hover:bg-[#FEF9E7]"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Larger</p>
                            <p className="text-xs text-white/70">Press ]</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Clear & Close */}
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearCanvas}
                                className="p-2 text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Clear all</p>
                            <p className="text-xs text-white/70">Press C</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="p-2 text-[#5c4b37] hover:bg-[#FEF9E7]"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Exit</p>
                            <p className="text-xs text-white/70">Press Esc</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default DrawingCanvas;
