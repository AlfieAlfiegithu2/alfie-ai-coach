import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X, Eraser } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextHighlighterProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HighlightData {
    id: string;
    text: string;
    color: string;
}

// Predefined highlight colors - softer pastel versions
const HIGHLIGHT_COLORS = [
    { name: 'Orange', value: '#FFB74D', hex: '#FFB74D' },  // Default - soft orange
    { name: 'Yellow', value: '#FFE082', hex: '#FFE082' },
    { name: 'Green', value: '#A5D6A7', hex: '#A5D6A7' },
    { name: 'Blue', value: '#90CAF9', hex: '#90CAF9' },
    { name: 'Pink', value: '#F48FB1', hex: '#F48FB1' },
    { name: 'Purple', value: '#CE93D8', hex: '#CE93D8' },
];

const TextHighlighter: React.FC<TextHighlighterProps> = ({
    isOpen,
    onClose
}) => {
    const [highlights, setHighlights] = useState<HighlightData[]>([]);
    const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value); // Orange default
    const [isEraserMode, setIsEraserMode] = useState(false);
    const highlightIdCounter = useRef(0);

    // Apply highlight styling to selection
    const applyHighlightToSelection = useCallback(() => {
        if (isEraserMode) return; // Don't highlight in eraser mode

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();

        if (!selectedText) return;

        try {
            // Create a highlight span
            const highlightSpan = document.createElement('mark');
            highlightSpan.className = 'text-highlight';
            const highlightId = `highlight-${highlightIdCounter.current++}`;
            highlightSpan.dataset.highlightId = highlightId;
            highlightSpan.style.backgroundColor = `${selectedColor}88`; // 53% opacity
            highlightSpan.style.borderRadius = '2px';
            highlightSpan.style.padding = '0 2px';
            highlightSpan.style.margin = '0 -2px';
            highlightSpan.style.cursor = 'pointer';

            // Wrap the selected content
            range.surroundContents(highlightSpan);

            // Clear selection
            selection.removeAllRanges();

            // Store highlight data
            setHighlights(prev => [...prev, {
                id: highlightId,
                text: selectedText,
                color: selectedColor
            }]);
        } catch (e) {
            // surroundContents can fail if selection spans multiple elements
            // In that case, we'll use a different approach
            console.log('Complex selection, using alternative approach');

            // For complex selections, highlight each text node separately
            try {
                const fragment = range.extractContents();
                const wrapper = document.createElement('mark');
                wrapper.className = 'text-highlight';
                const highlightId = `highlight-${highlightIdCounter.current++}`;
                wrapper.dataset.highlightId = highlightId;
                wrapper.style.backgroundColor = `${selectedColor}88`;
                wrapper.style.borderRadius = '2px';
                wrapper.style.padding = '0 2px';
                wrapper.style.margin = '0 -2px';
                wrapper.style.cursor = 'pointer';
                wrapper.appendChild(fragment);
                range.insertNode(wrapper);

                selection.removeAllRanges();

                setHighlights(prev => [...prev, {
                    id: highlightId,
                    text: selectedText,
                    color: selectedColor
                }]);
            } catch (err) {
                console.log('Could not highlight this selection');
            }
        }
    }, [selectedColor, isEraserMode]);

    // Handle click on highlight to remove it (eraser mode)
    const handleHighlightClick = useCallback((e: MouseEvent) => {
        if (!isEraserMode) return;

        const target = e.target as HTMLElement;
        if (target.classList.contains('text-highlight')) {
            e.preventDefault();
            e.stopPropagation();

            const highlightId = target.dataset.highlightId;
            const parent = target.parentNode;

            if (parent) {
                // Replace the mark element with its text content
                const textNode = document.createTextNode(target.textContent || '');
                parent.replaceChild(textNode, target);
                parent.normalize();

                // Remove from state
                setHighlights(prev => prev.filter(h => h.id !== highlightId));
            }
        }
    }, [isEraserMode]);

    // Handle mouse up to apply highlight
    useEffect(() => {
        if (!isOpen) return;

        const handleMouseUp = (e: MouseEvent) => {
            // Don't highlight if clicking on buttons, inputs, or the toolbar
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'SELECT' ||
                target.tagName === 'TEXTAREA' ||
                target.closest('button') ||
                target.closest('input') ||
                target.closest('select') ||
                target.closest('.highlight-toolbar') ||
                target.closest('[role="radio"]') ||
                target.closest('[role="radiogroup"]')
            ) {
                return;
            }

            // Small delay to ensure selection is complete
            setTimeout(() => {
                applyHighlightToSelection();
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('click', handleHighlightClick);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('click', handleHighlightClick);
        };
    }, [isOpen, applyHighlightToSelection, handleHighlightClick]);

    // Clear all highlights
    const clearAllHighlights = useCallback(() => {
        const highlightElements = document.querySelectorAll('.text-highlight');
        highlightElements.forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                // Replace the mark element with its text content
                const textNode = document.createTextNode(el.textContent || '');
                parent.replaceChild(textNode, el);
                // Normalize to merge adjacent text nodes
                parent.normalize();
            }
        });
        setHighlights([]);
    }, []);

    // Add global styles for selection color
    useEffect(() => {
        if (!isOpen) return;

        const styleId = 'text-highlighter-styles';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
      /* Custom selection color in annotate mode */
      .annotate-mode ::selection {
        background-color: ${selectedColor}AA !important;
        color: inherit !important;
      }
      
      .annotate-mode ::-moz-selection {
        background-color: ${selectedColor}AA !important;
        color: inherit !important;
      }
      
      /* Ensure inputs are still clickable */
      .annotate-mode input,
      .annotate-mode select,
      .annotate-mode button,
      .annotate-mode textarea,
      .annotate-mode [role="radio"],
      .annotate-mode [role="radiogroup"],
      .annotate-mode label {
        pointer-events: auto !important;
        cursor: pointer !important;
        position: relative !important;
        z-index: 20 !important;
      }
      
      /* Passage and question text should be selectable */
      .annotate-mode .prose,
      .annotate-mode .question-text,
      .annotate-mode p {
        user-select: text !important;
        cursor: ${isEraserMode ? 'not-allowed' : 'text'} !important;
      }

      /* Highlight marks styling */
      .text-highlight {
        transition: background-color 0.2s ease;
        cursor: ${isEraserMode ? 'pointer' : 'inherit'} !important;
      }
      
      .text-highlight:hover {
        ${isEraserMode ? `
          background-color: #ff000066 !important;
          text-decoration: line-through;
        ` : ''}
      }
      
      /* Eraser cursor for text in eraser mode */
      .annotate-mode.eraser-mode .text-highlight {
        cursor: pointer !important;
      }
    `;

        // Add annotate-mode class to body
        document.body.classList.add('annotate-mode');
        if (isEraserMode) {
            document.body.classList.add('eraser-mode');
        } else {
            document.body.classList.remove('eraser-mode');
        }

        return () => {
            document.body.classList.remove('annotate-mode');
            document.body.classList.remove('eraser-mode');
        };
    }, [isOpen, selectedColor, isEraserMode]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key.toLowerCase() === 'e') {
                setIsEraserMode(prev => !prev);
            } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
                clearAllHighlights();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, clearAllHighlights, onClose]);

    if (!isOpen) return null;

    return (
        <TooltipProvider delayDuration={200}>
            {/* Floating Toolbar */}
            <div className="highlight-toolbar fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-[#E8D5A3] p-3 flex items-center gap-3">
                {/* Color Selection */}
                <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-3">
                    {HIGHLIGHT_COLORS.map((color) => (
                        <Tooltip key={color.value}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => {
                                        setSelectedColor(color.value);
                                        setIsEraserMode(false);
                                    }}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === color.value && !isEraserMode
                                            ? 'border-[#8B4513] scale-110 ring-2 ring-[#8B4513]/30'
                                            : 'border-gray-200 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: `${color.value}88` }}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                                <p className="font-medium">{color.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                {/* Eraser Toggle */}
                <div className="flex items-center gap-1 border-r border-[#E8D5A3] pr-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEraserMode(!isEraserMode)}
                                className={`p-2 rounded-lg transition-all ${isEraserMode
                                        ? 'bg-[#8B4513] text-white'
                                        : 'text-[#5c4b37] hover:bg-[#FFFAF0]'
                                    }`}
                            >
                                <Eraser className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Eraser - click highlights to remove</p>
                            <p className="text-xs text-white/70">Press E to toggle</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Status & Instructions */}
                <div className="flex items-center gap-2 border-r border-[#E8D5A3] pr-3">
                    <span className="text-sm text-[#5c4b37]">
                        {isEraserMode ? (
                            <span className="text-red-500 font-medium">Click highlight to erase</span>
                        ) : (
                            <span>Drag text to highlight</span>
                        )}
                    </span>
                    {highlights.length > 0 && (
                        <span className="text-xs bg-[#8B4513] text-white px-2 py-0.5 rounded-full">
                            {highlights.length}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllHighlights}
                                className="p-2 text-red-500 hover:bg-red-50"
                                disabled={highlights.length === 0}
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Clear all highlights</p>
                            <p className="text-xs text-white/70">Press C</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="p-2 text-[#5c4b37] hover:bg-[#FFFAF0]"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2f241f] text-white border-none">
                            <p className="font-medium">Exit highlight mode</p>
                            <p className="text-xs text-white/70">Press Esc</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default TextHighlighter;
