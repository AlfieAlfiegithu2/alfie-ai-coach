import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Trash2, X, Highlighter, Minus, Plus, Type, MousePointer } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnnotationToolsProps {
    isOpen: boolean;
    onClose: () => void;
    passageRef: React.RefObject<HTMLElement>;
    questionsRef: React.RefObject<HTMLElement>;
}

type Tool = 'normal' | 'text-select' | 'pen' | 'highlighter' | 'eraser';

// Lighter pastel highlight colors - work with darken blend mode (won't get darker when overlapped)
const HIGHLIGHT_COLORS = [
    { name: 'Blue', value: '#B3E5FC' },
    { name: 'Yellow', value: '#FFF9C4' },
    { name: 'Green', value: '#C8E6C9' },
    { name: 'Pink', value: '#F8BBD9' },
    { name: 'Orange', value: '#FFE0B2' },
    { name: 'Purple', value: '#E1BEE7' },
    { name: 'Cyan', value: '#B2EBF2' },
    { name: 'Lime', value: '#DCEDC8' },
    { name: 'Red', value: '#FFCDD2' },
];

const PEN_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Blue', value: '#1565C0' },
    { name: 'Red', value: '#C62828' },
    { name: 'Green', value: '#2E7D32' },
    { name: 'Brown', value: '#5D4037' },
];

const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
    isOpen,
    onClose,
    passageRef,
    questionsRef
}) => {
    const passageCanvasRef = useRef<HTMLCanvasElement>(null);
    const questionsCanvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('text-select');
    const [color, setColor] = useState('#B3E5FC'); // Default pastel blue
    const [lineWidth, setLineWidth] = useState(20);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
    const [hasMoved, setHasMoved] = useState(false);
    const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);
    const [, forceUpdate] = useState(0);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);

    const isCanvasTool = tool === 'pen' || tool === 'highlighter' || tool === 'eraser';

    // Force re-render when refs are available
    useEffect(() => {
        const timer = setTimeout(() => forceUpdate(n => n + 1), 100);
        return () => clearTimeout(timer);
    }, []);

    const getTempCanvas = useCallback((targetCanvas: HTMLCanvasElement | null) => {
        if (!targetCanvas) return null;

        if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
        }

        const tempCanvas = tempCanvasRef.current;
        tempCanvas.width = targetCanvas.width;
        tempCanvas.height = targetCanvas.height;

        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        return tempCanvas;
    }, []);

    const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, container: HTMLElement | null) => {
        if (!canvas || !container) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx?.drawImage(canvas, 0, 0);

        const scrollWidth = container.scrollWidth;
        const scrollHeight = container.scrollHeight;

        canvas.width = scrollWidth;
        canvas.height = scrollHeight;
        canvas.style.width = `${scrollWidth}px`;
        canvas.style.height = `${scrollHeight}px`;

        const ctx = canvas.getContext('2d');
        if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0) {
            ctx.drawImage(tempCanvas, 0, 0);
        }
    }, []);

    const resizeAllCanvases = useCallback(() => {
        resizeCanvas(passageCanvasRef.current, passageRef.current);
        resizeCanvas(questionsCanvasRef.current, questionsRef.current);
    }, [resizeCanvas, passageRef, questionsRef]);

    useEffect(() => {
        const timer = setTimeout(resizeAllCanvases, 200);
        window.addEventListener('resize', resizeAllCanvases);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', resizeAllCanvases);
        };
    }, [resizeAllCanvases]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): { x: number; y: number } | null => {
        const canvasRect = canvas.getBoundingClientRect();

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
            x: clientX - canvasRect.left,
            y: clientY - canvasRect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        if (!isCanvasTool || !isOpen) return;

        const coords = getCoordinates(e, canvas);
        if (!coords) return;

        if (tool === 'highlighter') {
            getTempCanvas(canvas);
        }

        setActiveCanvas(canvas);
        startPointRef.current = coords;
        setIsDrawing(true);
        setLastPoint(coords);
        setHasMoved(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !lastPoint || !isCanvasTool || !isOpen || !activeCanvas) return;

        const coords = getCoordinates(e, activeCanvas);
        if (!coords) return;

        const distance = Math.sqrt(
            Math.pow(coords.x - (startPointRef.current?.x || 0), 2) +
            Math.pow(coords.y - (startPointRef.current?.y || 0), 2)
        );

        if (distance < 5 && !hasMoved) {
            return;
        }

        e.preventDefault();
        setHasMoved(true);

        // Draw directly to main canvas (with darken blend, no stacking issues)
        const ctx = activeCanvas?.getContext('2d');
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
            ctx.globalAlpha = 1;
        } else if (tool === 'highlighter') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
        }

        ctx.stroke();
        setLastPoint(coords);
    };

    const stopDrawing = () => {
        // No need to composite temp canvas - we draw directly with darken blend
        setIsDrawing(false);
        setLastPoint(null);
        setActiveCanvas(null);
        startPointRef.current = null;
        setHasMoved(false);
    };

    const clearCanvas = () => {
        [passageCanvasRef.current, questionsCanvasRef.current].forEach(canvas => {
            const ctx = canvas?.getContext('2d');
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    };

    const highlightSelection = useCallback(() => {
        if (tool !== 'text-select' || !isOpen) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        if (!selectedText) return;

        const rects = range.getClientRects();
        if (rects.length === 0) return;

        const firstRect = rects[0];

        let targetCanvas: HTMLCanvasElement | null = null;

        if (passageRef.current && passageCanvasRef.current) {
            const passageRect = passageRef.current.getBoundingClientRect();
            if (firstRect.left >= passageRect.left && firstRect.right <= passageRect.right + 50) {
                targetCanvas = passageCanvasRef.current;
            }
        }

        if (!targetCanvas && questionsRef.current && questionsCanvasRef.current) {
            const questionsRect = questionsRef.current.getBoundingClientRect();
            if (firstRect.left >= questionsRect.left - 50 && firstRect.right <= questionsRect.right + 50) {
                targetCanvas = questionsCanvasRef.current;
            }
        }

        if (!targetCanvas) return;

        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;

        const canvasRect = targetCanvas.getBoundingClientRect();

        const tempCanvas = getTempCanvas(targetCanvas);
        if (!tempCanvas) return;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.globalAlpha = 1;
        tempCtx.fillStyle = color;

        // Only draw rectangles that contain actual text (have meaningful size)
        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            // Skip rectangles that are too small (likely whitespace, empty lines, or stray selections)
            if (rect.width < 8 || rect.height < 8) continue;

            const x = rect.left - canvasRect.left;
            const y = rect.top - canvasRect.top;
            tempCtx.fillRect(x, y, rect.width, rect.height);
        }

        // With darken blend mode and pastel colors, use full opacity
        // Colors won't get darker when overlapped
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(tempCanvas, 0, 0);

        selection.removeAllRanges();
    }, [tool, color, getTempCanvas, isOpen, passageRef, questionsRef]);

    useEffect(() => {
        if (!isOpen || tool !== 'text-select') return;

        const handleMouseUp = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'SELECT' ||
                target.closest('button') ||
                target.closest('.annotation-toolbar') ||
                target.closest('[role="radio"]')
            ) {
                return;
            }

            setTimeout(() => {
                highlightSelection();
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [isOpen, tool, highlightSelection]);

    const selectTool = (newTool: Tool) => {
        setTool(newTool);
        if (newTool === 'highlighter' || newTool === 'text-select') {
            setLineWidth(20);
            if (!HIGHLIGHT_COLORS.find(c => c.value === color)) {
                setColor('#B3E5FC'); // Pastel blue
            }
        } else if (newTool === 'pen') {
            setLineWidth(3);
            // Default pen color is blue
            setColor('#1565C0');
        } else if (newTool === 'eraser') {
            setLineWidth(50); // Bigger eraser by default
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 't': selectTool('text-select'); break;
                case 'h': selectTool('highlighter'); break;
                case 'p': selectTool('pen'); break;
                case 'e': selectTool('eraser'); break;
                case 'n': selectTool('normal'); break;
                case 'c': if (!e.ctrlKey && !e.metaKey) clearCanvas(); break;
                case 'escape': onClose(); break;
                case '[': setLineWidth(prev => Math.max(tool === 'pen' ? 1 : 10, prev - 5)); break;
                case ']': setLineWidth(prev => Math.min(50, prev + 5)); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, tool, onClose]);

    useEffect(() => {
        if (!isOpen) {
            document.body.classList.remove('annotate-mode');
            return;
        }

        const styleId = 'annotation-styles';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        const selectionBg = color; // Solid color to match canvas highlight perfectly

        // Normal mode: no override, use browser default (orange with black text + popups)
        // Other modes: custom selection color with BLACK text
        const selectionStyles = tool === 'normal' ? '' : `
      .annotate-mode ::selection {
        background-color: ${selectionBg} !important;
        color: #000 !important;
      }
      .annotate-mode ::-moz-selection {
        background-color: ${selectionBg} !important;
        color: #000 !important;
      }
    `;

        // In text-select mode, allow text selection in labels and containers
        const textSelectMode = tool === 'text-select';

        styleEl.textContent = `
      ${selectionStyles}
      .annotate-mode input,
      .annotate-mode select,
      .annotate-mode textarea,
      .annotate-mode label {
        pointer-events: auto !important;
        z-index: 30 !important;
        position: relative !important;
      }
      .annotate-mode [role="radio"] > span,
      .annotate-mode [role="radiogroup"] span[data-state],
      .annotate-mode .aspect-square {
        visibility: hidden !important;
      }
      /* Allow text selection everywhere in annotate mode */
      .annotate-mode,
      .annotate-mode * {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      /* Labels and buttons - allow text selection in text-select mode */
      .annotate-mode label,
      .annotate-mode button {
        ${textSelectMode ? `
          cursor: text !important;
          user-select: text !important;
          -webkit-user-select: text !important;
        ` : `
          cursor: pointer !important;
          pointer-events: auto !important;
        `}
      }
      .annotate-mode input,
      .annotate-mode textarea {
        user-select: auto !important;
        -webkit-user-select: auto !important;
        cursor: text !important;
      }
    `;

        document.body.classList.add('annotate-mode');
        return () => document.body.classList.remove('annotate-mode');
    }, [isOpen, color, tool]);

    const currentColors = tool === 'pen' ? PEN_COLORS : HIGHLIGHT_COLORS;
    const showColors = tool === 'text-select' || tool === 'highlighter' || tool === 'pen';

    const canvasStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: (isOpen && isCanvasTool) ? 'auto' : 'none',
        cursor: (isOpen && isCanvasTool) ? 'crosshair' : 'default',
        zIndex: 10,
        // Use 'darken' - same colors don't stack darker, text stays readable
        mixBlendMode: 'darken'
    };

    const renderCanvas = (
        canvasRef: React.RefObject<HTMLCanvasElement>,
        container: HTMLElement | null
    ) => {
        if (!container) return null;

        return createPortal(
            <canvas
                ref={canvasRef}
                style={canvasStyle}
                onMouseDown={(e) => canvasRef.current && startDrawing(e, canvasRef.current)}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => canvasRef.current && startDrawing(e, canvasRef.current)}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />,
            container
        );
    };

    return (
        <>
            {/* Render canvas into each scrollable panel via portal */}
            {renderCanvas(passageCanvasRef, passageRef.current)}
            {renderCanvas(questionsCanvasRef, questionsRef.current)}

            {/* Toolbar - mobile optimized */}
            {isOpen && (
                <TooltipProvider delayDuration={300}>
                    <div className="annotation-toolbar fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow-xl border border-[#E8D5A3] p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 rounded-lg max-w-[95vw] overflow-x-auto">
                        <div className="flex items-center gap-0.5 border-r border-[#E8D5A3] pr-1 sm:pr-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('text-select')}
                                        className={`p-1.5 rounded transition-all ${tool === 'text-select' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <Type className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Text Highlight (T)
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('highlighter')}
                                        className={`p-1.5 rounded transition-all ${tool === 'highlighter' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <Highlighter className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Draw Highlight (H)
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('pen')}
                                        className={`p-1.5 rounded transition-all ${tool === 'pen' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Pen (P)
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('eraser')}
                                        className={`p-1.5 rounded transition-all ${tool === 'eraser' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <Eraser className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Eraser (E)
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('normal')}
                                        className={`p-1.5 rounded transition-all ${tool === 'normal' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <MousePointer className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Normal (N)
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {showColors && (
                            <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-1.5 sm:pr-2">
                                {currentColors.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setColor(c.value)}
                                        title={c.name}
                                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded transition-all flex-shrink-0 ${color === c.value ? 'ring-2 ring-[#2f241f] ring-offset-1 scale-110' : 'hover:scale-105'
                                            }`}
                                        style={{ backgroundColor: c.value }}
                                    />
                                ))}
                            </div>
                        )}

                        {isCanvasTool && (
                            <div className="flex items-center gap-0.5 border-r border-[#E8D5A3] pr-1 sm:pr-2">
                                <Button variant="ghost" size="sm" onClick={() => setLineWidth(Math.max(tool === 'pen' ? 1 : 10, lineWidth - 10))}
                                    className="p-1 text-[#5c4b37] hover:bg-[#FEF9E7] rounded">
                                    <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-5 text-center text-xs font-medium text-[#5c4b37]">{lineWidth}</span>
                                <Button variant="ghost" size="sm" onClick={() => setLineWidth(Math.min(80, lineWidth + 10))}
                                    className="p-1 text-[#5c4b37] hover:bg-[#FEF9E7] rounded">
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center gap-0.5">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={clearCanvas} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Clear (C)
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5 text-[#5c4b37] hover:bg-[#FEF9E7] rounded">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded">
                                    Exit (Esc)
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </TooltipProvider>
            )}
        </>
    );
};

export default AnnotationTools;
