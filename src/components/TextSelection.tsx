import React, { useState, useEffect } from 'react';
import WordTranslator from './WordTranslator';
import { useAuth } from '@/hooks/useAuth';

interface TextSelectionProps {
  children: React.ReactNode;
}

const TextSelection: React.FC<TextSelectionProps> = ({ children }) => {
  const [selectedWord, setSelectedWord] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showTranslator, setShowTranslator] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleDoubleClick = (event: MouseEvent) => {
      // Don't trigger if blocked or user not logged in
      if (isBlocked || !user) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 0) {
        // Check if selection is from valid content (not UI elements)
        const target = event.target as Element;
        if (!isValidTextElement(target)) return;

        // Only process single words or short phrases
        const words = selectedText.split(/\s+/);
        if (words.length > 3) return;

        setSelectedWord(selectedText);
        setPosition({ x: event.clientX, y: event.clientY });
        setShowTranslator(true);
        
        // Block further triggers for 2 seconds
        setIsBlocked(true);
        setTimeout(() => setIsBlocked(false), 2000);
      }
    };

    const handleMouseDown = () => {
      if (showTranslator) {
        setShowTranslator(false);
      }
    };

    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isBlocked, user, showTranslator]);

  const isValidTextElement = (element: Element): boolean => {
    // Don't trigger on UI elements
    const invalidSelectors = [
      'button', 'input', 'textarea', 'select', 'nav', 'header', 'footer',
      '[role="button"]', '[data-testid]', '.btn', '.button'
    ];

    for (const selector of invalidSelectors) {
      if (element.matches?.(selector) || element.closest?.(selector)) {
        return false;
      }
    }

    // Only trigger on content areas
    const validSelectors = [
      'p', 'div', 'span', 'article', 'section', 'main',
      '[data-content]', '.content', '.passage', '.text'
    ];

    for (const selector of validSelectors) {
      if (element.matches?.(selector) || element.closest?.(selector)) {
        return true;
      }
    }

    return false;
  };

  const handleCloseTranslator = () => {
    setShowTranslator(false);
    setSelectedWord('');
    // Clear any text selection
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
      {children}
      {showTranslator && user && selectedWord && (
        <WordTranslator
          selectedWord={selectedWord}
          position={position}
          onClose={handleCloseTranslator}
        />
      )}
    </>
  );
};

export default TextSelection;