import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import TranslationPopup from './TranslationPopup';
import TextActionMenu from './TextActionMenu';
import { normalizeLanguageCode } from '@/lib/languageUtils';
import { useToast } from '@/hooks/use-toast';

interface GlobalTextSelectionProps {
  children: React.ReactNode;
}

const GlobalTextSelection: React.FC<GlobalTextSelectionProps> = ({ children }) => {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const { profile } = useAuth();
  const { toast } = useToast();
  const lastClickTime = useRef<number>(0);
  const lastClickElement = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mouseDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Get user's native language
  useEffect(() => {
    if (profile?.native_language) {
      const normalized = normalizeLanguageCode(profile.native_language);
      if (normalized !== 'en') {
        setTargetLanguage(normalized);
      }
    }
  }, [profile]);

  // Handle double-click (desktop) - for single words
  useEffect(() => {
    const handleDoubleClick = (e: MouseEvent) => {
      // Ignore if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      // Use a small delay to let browser finish selecting the word
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection) return;

        // Browser automatically selects word on double-click, so just read it
        const text = selection.toString().trim();
        
        if (!text || text.length === 0) {
          console.log('🔍 No text selected on double-click');
          return;
        }

        console.log('🔍 Double-click detected, selected text:', text);

        // Get selection position - position popup at the word that was clicked
        try {
          const selectedRange = selection.getRangeAt(0);
          const rect = selectedRange.getBoundingClientRect();
          
          if (rect) {
            // Position popup below the selected word, centered horizontally
            // Use getBoundingClientRect() which is already relative to viewport (for fixed positioning)
            setSelectionPosition({
              x: rect.left + rect.width / 2,
              y: rect.bottom + 8 // 8px below the word (no scrollY needed for fixed positioning)
            });
            setSelectedText(text);
            setShowActionMenu(true);
            setShowTranslation(false);
            console.log('✅ Action menu triggered for:', text);
          }
        } catch (err) {
          console.error('Error getting selection range:', err);
        }
      }, 10); // Small delay to ensure selection is complete
    };

    document.addEventListener('dblclick', handleDoubleClick);
    return () => document.removeEventListener('dblclick', handleDoubleClick);
  }, []);

  // Handle mouse drag selection (desktop) - for sentences (more than 2 words)
  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout;

    const handleMouseDown = (e: MouseEvent) => {
      // Ignore if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      mouseDownRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      };
      isDraggingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;

      const deltaX = Math.abs(e.clientX - mouseDownRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownRef.current.y);

      // If mouse moved significantly, it's a drag
      if (deltaX > 5 || deltaY > 5) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;

      const deltaX = Math.abs(e.clientX - mouseDownRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownRef.current.y);

      // If user dragged (not just clicked), check for selection
      if (isDraggingRef.current && (deltaX > 10 || deltaY > 10)) {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
          const selection = window.getSelection();
          const text = selection?.toString().trim();

          // Ignore if selection is in input fields or textareas
          const activeElement = document.activeElement;
          if (
            activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'TEXTAREA' ||
            activeElement?.getAttribute('contenteditable') === 'true'
          ) {
            mouseDownRef.current = null;
            isDraggingRef.current = false;
            return;
          }

          // Only trigger for sentences (more than 2 words)
          if (text && text.split(/\s+/).length > 2) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();

            if (rect) {
              // Position popup below the selected text, centered horizontally
              // Use getBoundingClientRect() which is already relative to viewport (for fixed positioning)
              setSelectionPosition({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 8 // 8px below the selection (no scrollY needed for fixed positioning)
              });
              setSelectedText(text);
              setShowActionMenu(true);
              setShowTranslation(false);
              console.log('✅ Action menu triggered for sentence:', text);
            }
          }

          mouseDownRef.current = null;
          isDraggingRef.current = false;
        }, 200); // Delay to ensure selection is complete
      } else {
        mouseDownRef.current = null;
        isDraggingRef.current = false;
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      clearTimeout(selectionTimeout);
    };
  }, []);

  // Note: Desktop uses double-click handler above
  // Mobile drag selection is handled by touch events below

  // Handle touch events for mobile drag selection
  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now()
      };

      const deltaX = Math.abs(touchEnd.x - touchStartRef.current.x);
      const deltaY = Math.abs(touchEnd.y - touchStartRef.current.y);

      // If user dragged (not just tapped), check for selection after a delay
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
          const selection = window.getSelection();
          const text = selection?.toString().trim();

          // Ignore if selection is in input fields or textareas
          const activeElement = document.activeElement;
          if (
            activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'TEXTAREA' ||
            activeElement?.getAttribute('contenteditable') === 'true'
          ) {
            return;
          }

          if (text && text.length >= 2) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();

            if (rect) {
              // Position popup below the selected text, centered horizontally
              // Use getBoundingClientRect() which is already relative to viewport (for fixed positioning)
              setSelectionPosition({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 8 // 8px below the selection (no scrollY needed for fixed positioning)
              });
              setSelectedText(text);
              setShowActionMenu(true);
              setShowTranslation(false);
            }
          }
        }, 300); // Delay to ensure selection is complete
      }

      touchStartRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(selectionTimeout);
    };
  }, []);

  const handleClose = () => {
    setSelectedText(null);
    setSelectionPosition(null);
    setShowActionMenu(false);
    setShowTranslation(false);
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  const handleCopy = () => {
    toast({
      title: "Copied!",
      description: `"${selectedText}" has been copied to clipboard.`,
      duration: 2000,
    });
  };

  const handleTranslate = () => {
    setShowActionMenu(false);
    setShowTranslation(true);
  };

  return (
    <>
      {children}
      {showActionMenu && selectedText && selectionPosition && (
        <TextActionMenu
          selectedText={selectedText}
          position={selectionPosition}
          onClose={handleClose}
          onCopy={handleCopy}
          onTranslate={handleTranslate}
        />
      )}
      {showTranslation && selectedText && selectionPosition && (
        <TranslationPopup
          selectedText={selectedText}
          position={selectionPosition}
          onClose={handleClose}
          targetLanguage={targetLanguage}
        />
      )}
    </>
  );
};

export default GlobalTextSelection;
