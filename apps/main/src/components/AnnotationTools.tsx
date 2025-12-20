import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Trash2, X, Highlighter, Minus, Plus, Type, MousePointer, RotateCcw, StickyNote } from 'lucide-react';
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

type Tool = 'normal' | 'text-select' | 'pen' | 'highlighter' | 'eraser' | 'sticky-note';

// Balanced colors (Material 100) - optimal balance of readability and distinctiveness
const HIGHLIGHT_COLORS = [
    { name: 'Blue', value: '#BBDEFB' },   // Blue 100
    { name: 'Yellow', value: '#FFF176' }, // Yellow 300 (Stronger)
    { name: 'Green', value: '#C8E6C9' },  // Green 100
    { name: 'Pink', value: '#F8BBD0' },   // Pink 100
    { name: 'Orange', value: '#FFE0B2' }, // Orange 100
    { name: 'Purple', value: '#E1BEE7' }, // Purple 100
    { name: 'Cyan', value: '#B2EBF2' },   // Cyan 100
    { name: 'Lime', value: '#F0F4C3' },   // Lime 100
    { name: 'Red', value: '#FFCDD2' },    // Red 100
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
    const [tool, setTool] = useState<Tool>('normal');
    const [color, setColor] = useState('#BBDEFB'); // Default Blue 100
    const [lineWidth, setLineWidth] = useState(20);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
    const [hasMoved, setHasMoved] = useState(false);
    const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);
    const [, forceUpdate] = useState(0);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const historyRef = useRef<Array<{ passage: ImageData | null, questions: ImageData | null }>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [notes, setNotes] = useState<{ id: string, x: number, y: number, width: number, height: number, text: string, color: string, isOpen: boolean, panel: 'passage' | 'questions' }[]>([]);

    const isCanvasTool = tool === 'pen' || tool === 'highlighter' || tool === 'eraser' || tool === 'sticky-note';

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

    const updateNote = (id: string, text: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    };

    const deleteNote = (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const toggleNote = (id: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isOpen: !n.isOpen } : n));
    };

    const moveNote = (id: string, x: number, y: number) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
    };

    const resizeNote = (id: string, width: number, height: number) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, width: Math.max(120, width), height: Math.max(80, height) } : n));
    };

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

        if (tool === 'sticky-note') {
            const id = Math.random().toString(36).substr(2, 9);
            const panel = canvas === passageCanvasRef.current ? 'passage' : 'questions';
            const startX = coords.x;
            const startY = coords.y;

            // Initial small note
            setNotes(prev => [...prev, {
                id,
                x: startX,
                y: startY,
                width: 40,
                height: 40,
                text: '',
                color: '#FFFDE7',
                isOpen: true,
                panel
            }]);

            const handleInitialDrag = (moveEvent: MouseEvent) => {
                const canvasRect = canvas.getBoundingClientRect();
                const currentX = moveEvent.clientX - canvasRect.left;
                const currentY = moveEvent.clientY - canvasRect.top;

                const width = Math.max(120, currentX - startX);
                const height = Math.max(80, currentY - startY);

                setNotes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
            };

            const handleInitialRelease = () => {
                window.removeEventListener('mousemove', handleInitialDrag);
                window.removeEventListener('mouseup', handleInitialRelease);
                // Set a sensible final minimum size if they just clicked
                setNotes(prev => prev.map(n => n.id === id && n.width < 100 ? { ...n, width: 200, height: 150 } : n));
                selectTool('normal');
            };

            window.addEventListener('mousemove', handleInitialDrag);
            window.addEventListener('mouseup', handleInitialRelease);
            return;
        }

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
            ctx.globalCompositeOperation = 'darken';
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

    const performClear = useCallback(() => {
        [passageCanvasRef.current, questionsCanvasRef.current].forEach(canvas => {
            const ctx = canvas?.getContext('2d');
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
        setNotes([]); // Also clear all sticky notes
    }, []);

    const saveState = useCallback(() => {
        const passageCanvas = passageCanvasRef.current;
        const questionsCanvas = questionsCanvasRef.current;

        const newState = {
            passage: passageCanvas ? passageCanvas.getContext('2d')?.getImageData(0, 0, passageCanvas.width, passageCanvas.height) || null : null,
            questions: questionsCanvas ? questionsCanvas.getContext('2d')?.getImageData(0, 0, questionsCanvas.width, questionsCanvas.height) || null : null
        };

        const newHistory = historyRef.current.slice(0, historyIndex + 1);
        newHistory.push(newState);

        if (newHistory.length > 20) newHistory.shift();

        historyRef.current = newHistory;
        setHistoryIndex(newHistory.length - 1);
    }, [historyIndex]);

    const undo = useCallback(() => {
        // If empty history or at start with no history
        if (historyIndex === -1 && historyRef.current.length === 0) return;

        // If at first step of history (index 0), going back means clearing
        if (historyIndex === 0) {
            performClear();
            setHistoryIndex(-1);
            return;
        }

        // If at index -1 but there IS history (e.g. undoing back to start), stay there
        if (historyIndex === -1) return;

        // Go back one step
        const prevIndex = historyIndex - 1;
        const prevState = historyRef.current[prevIndex];

        if (prevState) {
            if (passageCanvasRef.current && prevState.passage) {
                passageCanvasRef.current.getContext('2d')?.putImageData(prevState.passage, 0, 0);
            } else if (passageCanvasRef.current) {
                const ctx = passageCanvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, passageCanvasRef.current.width, passageCanvasRef.current.height);
            }

            if (questionsCanvasRef.current && prevState.questions) {
                questionsCanvasRef.current.getContext('2d')?.putImageData(prevState.questions, 0, 0);
            } else if (questionsCanvasRef.current) {
                const ctx = questionsCanvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, questionsCanvasRef.current.width, questionsCanvasRef.current.height);
            }

            setHistoryIndex(prevIndex);
        }
    }, [historyIndex, performClear]);

    // Initial state save
    useEffect(() => {
        if (historyRef.current.length === 0) {
            saveState();
        }
    }, [saveState]);

    const stopDrawing = () => {
        // No need to composite temp canvas - we draw directly with darken blend
        if (isDrawing) {
            setIsDrawing(false);
            setLastPoint(null);
            setActiveCanvas(null);
            startPointRef.current = null;
            setHasMoved(false);
            saveState(); // Save state after drawing
        }
    };

    const clearCanvas = () => {
        performClear();
        saveState();
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
            if (rect.width < 1 || rect.height < 8) continue;

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
        saveState(); // Save state after text selection highlight
    }, [tool, color, getTempCanvas, isOpen, passageRef, questionsRef, saveState]);

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

            // Capture selection immediately to avoid losing it due to label focus/click events
            highlightSelection();
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [isOpen, tool, highlightSelection]);

    const selectTool = (newTool: Tool) => {
        setTool(newTool);
        if (newTool === 'highlighter' || newTool === 'text-select') {
            setLineWidth(20);
            if (!HIGHLIGHT_COLORS.find(c => c.value === color)) {
                setColor('#BBDEFB'); // Blue 100
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

            if (e.key === 'Tab') {
                e.preventDefault();
                const palette = tool === 'pen' ? PEN_COLORS : HIGHLIGHT_COLORS;
                const currentIndex = palette.findIndex(c => c.value === color);
                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % palette.length;
                setColor(palette[nextIndex].value);
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'q': selectTool('normal'); break;
                case 'w': selectTool('text-select'); break;
                case 'e': selectTool('eraser'); break;
                case 'r': selectTool('pen'); break;
                case 't': selectTool('highlighter'); break;
                case 'y': selectTool('sticky-note'); break;
                case 'z': undo(); break; // Undo shortcut
                case 'c': if (!e.ctrlKey && !e.metaKey) clearCanvas(); break;
                case 'escape': onClose(); break;
                case '[': setLineWidth(prev => Math.max(5, prev - 5)); break;
                case ']': setLineWidth(prev => Math.min(80, prev + 5)); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, tool, onClose, color, undo, clearCanvas]);

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
      /* Force pure black text in annotate mode to ensure blending stays sharp */
      .annotate-mode .prose,
      .annotate-mode .prose *,
      .annotate-mode #passage-content,
      .annotate-mode #questions-content,
      .annotate-mode .font-serif {
        color: #000 !important;
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
        mixBlendMode: 'multiply'
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

    const renderStickyNotes = (panel: 'passage' | 'questions', container: HTMLElement | null) => {
        if (!container) return null;

        const handleDragStart = (e: React.MouseEvent, noteId: string, initialX: number, initialY: number) => {
            // Only drag if clicking the note header
            if (!(e.target as HTMLElement).closest('.note-header')) return;

            const startX = e.clientX;
            const startY = e.clientY;
            let rafId: number;

            const handleDragMove = (moveEvent: MouseEvent) => {
                if (rafId) cancelAnimationFrame(rafId);

                rafId = requestAnimationFrame(() => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    moveNote(noteId, Math.max(0, initialX + dx), Math.max(0, initialY + dy));
                });
            };

            const handleDragEnd = () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
                if (rafId) cancelAnimationFrame(rafId);
            };

            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        };

        const handleResizeStart = (e: React.MouseEvent, noteId: string, initialWidth: number, initialHeight: number) => {
            e.stopPropagation();
            e.preventDefault();

            const startX = e.clientX;
            const startY = e.clientY;
            let rafId: number;

            const handleResizeMove = (moveEvent: MouseEvent) => {
                if (rafId) cancelAnimationFrame(rafId);

                rafId = requestAnimationFrame(() => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    resizeNote(noteId, initialWidth + dx, initialHeight + dy);
                });
            };

            const handleResizeEnd = () => {
                window.removeEventListener('mousemove', handleResizeMove);
                window.removeEventListener('mouseup', handleResizeEnd);
                if (rafId) cancelAnimationFrame(rafId);
            };

            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
        };

        return createPortal(
            <div className="absolute inset-0 pointer-events-none z-20">
                {notes.filter(n => n.panel === panel).map(note => (
                    <div
                        key={note.id}
                        className={`absolute transition-none will-change-transform ${!isOpen ? 'pointer-events-none opacity-80' : 'pointer-events-auto'}`}
                        style={{ left: note.x - 12, top: note.y - 12 }}
                    >
                        {note.isOpen ? (
                            <div
                                className="relative bg-[#FFFDE7] shadow-xl rounded-sm border border-[#E8D5A3] flex flex-col group/note focus-within:outline-none focus-within:ring-0 focus-within:border-[#E8D5A3]"
                                style={{ width: note.width, height: note.height }}
                            >
                                {/* Header - Drag area */}
                                <div
                                    className="note-header h-6 bg-[#FBC02D]/10 border-b border-[#E8D5A3]/30 flex items-center justify-between px-1.5 cursor-move select-none"
                                    onMouseDown={(e) => handleDragStart(e, note.id, note.x, note.y)}
                                >
                                    <div className="flex items-center gap-1 opacity-40">
                                        <div className="w-1 h-1 rounded-full bg-[#8B4513]" />
                                        <div className="w-1 h-1 rounded-full bg-[#8B4513]" />
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={() => toggleNote(note.id)} className="p-0.5 hover:bg-black/5 rounded group/min focus:outline-none">
                                            <Minus className="w-2.5 h-2.5 text-[#8B4513]/40 group-hover/min:text-[#8B4513]/80" />
                                        </button>
                                        <button onClick={() => deleteNote(note.id)} className="p-0.5 hover:bg-red-50 rounded group/del focus:outline-none">
                                            <X className="w-2.5 h-2.5 text-[#8B4513]/40 group-hover/del:text-red-500" />
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    className="flex-1 p-2 text-xs bg-transparent border-none focus:ring-0 outline-none focus:outline-none shadow-none resize-none text-[#2f241f] font-sans leading-relaxed cursor-text"
                                    value={note.text}
                                    onChange={(e) => updateNote(note.id, e.target.value)}
                                    autoFocus
                                />

                                {/* Resize Handle */}
                                <div
                                    className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize flex items-end justify-end p-0.5 group/resize select-none"
                                    onMouseDown={(e) => handleResizeStart(e, note.id, note.width, note.height)}
                                >
                                    <div className="w-1.5 h-1.5 border-r border-b border-[#8B4513]/20 group-hover/resize:border-[#8B4513]/50 transition-colors" />
                                </div>
                            </div>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => toggleNote(note.id)}
                                        className="w-5 h-5 bg-[#FFFDE7] shadow-md rounded-full border border-[#E8D5A3] flex items-center justify-center hover:scale-125 hover:bg-[#FFF9C4] transition-all duration-300 focus:outline-none"
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={5} className="bg-[#2f241f] text-white border-none text-[10px] px-2 py-1 rounded z-[100]">
                                    Open Note
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                ))}
            </div>,
            container
        );
    };


    return (
        <>
            {/* Render canvas into each scrollable panel via portal */}
            {renderCanvas(passageCanvasRef, passageRef.current)}
            {renderCanvas(questionsCanvasRef, questionsRef.current)}

            {/* Render sticky notes into each scrollable panel */}
            {renderStickyNotes('passage', passageRef.current)}
            {renderStickyNotes('questions', questionsRef.current)}

            {/* Toolbar - mobile optimized */}
            {isOpen && (
                <TooltipProvider delayDuration={0}>
                    <div className="annotation-toolbar fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow-xl border border-[#E8D5A3] p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 rounded-lg max-w-[95vw] overflow-x-auto">
                        <div className="flex items-center gap-0.5 border-r border-[#E8D5A3] pr-1 sm:pr-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('normal')}
                                        className={`p-1.5 rounded transition-all ${tool === 'normal' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <MousePointer className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Normal Cursor (Q)</span>
                                        <span className="text-[10px] opacity-70">Use the standard mouse to interact with the test</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('text-select')}
                                        className={`p-1.5 rounded transition-all ${tool === 'text-select' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FFE082] hover:text-[#2f241f]'}`}>
                                        <Type className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Highlight Text (W)</span>
                                        <span className="text-[10px] opacity-70">Select text on the page to highlight it</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('eraser')}
                                        className={`p-1.5 rounded transition-all ${tool === 'eraser' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}>
                                        <Eraser className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Eraser (E)</span>
                                        <span className="text-[10px] opacity-70">Remove your drawings and highlights</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('pen')}
                                        className={`p-1.5 rounded transition-all ${tool === 'pen' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FFE082] hover:text-[#2f241f]'}`}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Pen Tool (R)</span>
                                        <span className="text-[10px] opacity-70">Draw or underline freely on the page</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('highlighter')}
                                        className={`p-1.5 rounded transition-all ${tool === 'highlighter' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FFE082] hover:text-[#2f241f]'}`}>
                                        <Highlighter className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Freehand Highlighter (T)</span>
                                        <span className="text-[10px] opacity-70">Draw highlights anywhere on the page</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => selectTool('sticky-note')}
                                        className={`p-1.5 rounded transition-all ${tool === 'sticky-note' ? 'bg-[#8B4513] text-white' : 'text-[#5c4b37] hover:bg-[#FFE082] hover:text-[#2f241f]'}`}>
                                        <StickyNote className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Sticky Note (Y)</span>
                                        <span className="text-[10px] opacity-70">Add a small sticky note anywhere for quick thoughts</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {showColors && (
                            <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-1.5 sm:pr-2">
                                {currentColors.map((c) => (
                                    <Tooltip key={c.value}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => setColor(c.value)}
                                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded transition-all flex-shrink-0 ${color === c.value ? 'ring-2 ring-[#2f241f] ring-offset-1 scale-110' : 'hover:scale-105'
                                                    }`}
                                                style={{ backgroundColor: c.value }}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 rounded z-[100]">
                                            <div className="flex flex-col gap-0.5 items-center">
                                                <span className="font-bold text-[11px]">Color: {c.name}</span>
                                                <span className="text-[9px] opacity-70">Switch drawing color</span>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        )}

                        {isCanvasTool && (
                            <div className="flex items-center gap-0.5 border-r border-[#E8D5A3] pr-1 sm:pr-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setLineWidth(prev => {
                                                if (prev <= 5) return Math.max(1, prev - 2);
                                                return Math.max(5, Math.ceil((prev - 5) / 5) * 5);
                                            })}
                                            className="p-1 text-[#5c4b37] hover:bg-[#FEF9E7] rounded"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 z-[100]">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold whitespace-nowrap text-[11px]">Decrease Thickness ([)</span>
                                            <span className="text-[10px] opacity-70 whitespace-nowrap text-center">Make lines thinner</span>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <input
                                            type="number"
                                            value={lineWidth}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val)) setLineWidth(Math.min(100, Math.max(1, val)));
                                            }}
                                            className="w-10 text-center text-xs font-bold text-[#8B4513] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer"
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 z-[100]">
                                        Exact line thickness
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setLineWidth(prev => {
                                                if (prev < 5) return 5;
                                                return Math.min(100, Math.floor(prev / 5) * 5 + 5);
                                            })}
                                            className="p-1 text-[#5c4b37] hover:bg-[#FEF9E7] rounded"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 z-[100]">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold whitespace-nowrap text-[11px]">Increase Thickness (])</span>
                                            <span className="text-[10px] opacity-70 whitespace-nowrap text-center">Make lines thicker</span>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )}

                        <div className="flex items-center gap-0.5">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={clearCanvas} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Clear All (C)</span>
                                        <span className="text-[10px] opacity-70">Remove all annotations from both panels</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0}
                                        className={`p-1.5 rounded ${historyIndex <= 0 ? 'text-gray-300' : 'text-[#5c4b37] hover:bg-[#FEF9E7]'}`}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Undo Action (Z)</span>
                                        <span className="text-[10px] opacity-70">Revert your most recent annotation change</span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5 text-[#5c4b37] hover:bg-[#FEF9E7] rounded">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={12} className="bg-[#2f241f] text-white border-none text-sm px-3 py-1.5 rounded whitespace-nowrap z-[100]">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">Exit Mode (Esc)</span>
                                        <span className="text-[10px] opacity-70">Close the annotation toolbar and return to test</span>
                                    </div>
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
