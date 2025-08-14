import React, { useState, useEffect, useRef } from 'react';
import TranslationHelper from './TranslationHelper';
import { useAuth } from '@/hooks/useAuth';

interface GlobalTextSelectionProps {
  children: React.ReactNode;
}

const GlobalTextSelection: React.FC<GlobalTextSelectionProps> = ({ children }) => {
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showHelper, setShowHelper] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es'); // Default to Spanish
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();
  const { user } = useAuth();

  // Load user's preferred language
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (user) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .single();

        if (profile?.native_language) {
          // Use full language names for better OpenAI translation quality
          setTargetLanguage(profile.native_language);
        }
      }
    };
    loadUserLanguage();
  }, [user]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Clear any existing timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Wait a bit to ensure selection is complete
      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const text = selection.toString().trim();
        
        // Only show for meaningful text selections (not too short, not too long)
        if (text.length >= 2 && text.length <= 100 && !text.includes('\n')) {
          // Check if the selected text is clickable or part of UI elements
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container as Element;

          // Skip if it's part of navigation, buttons, or form elements
          if (element && !isSelectableContent(element)) {
            return;
          }

          // Get mouse position for popup placement
          const rect = range.getBoundingClientRect();
          setSelectedText(text);
          setPosition({
            x: e.clientX,
            y: rect.bottom + window.scrollY + 10
          });
          setShowHelper(true);
        }
      }, 100);
    };

    const handleMouseDown = () => {
      setShowHelper(false);
    };

    // Load user's preferred language from localStorage or profile
    const savedLanguage = localStorage.getItem('translation-language');
    if (savedLanguage) {
      setTargetLanguage(savedLanguage);
    }

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  // Function to determine if content is selectable for translation
  const isSelectableContent = (element: Element): boolean => {
    if (!element) return false;

    // Get all parent elements
    const parents = [];
    let current = element;
    while (current && current !== document.body) {
      parents.push(current);
      current = current.parentElement!;
    }

    // Check if any parent has attributes or classes that indicate it's not selectable content
    for (const parent of parents) {
      const tagName = parent.tagName.toLowerCase();
      const className = parent.className || '';
      const role = parent.getAttribute('role') || '';

      // Skip UI elements
      if (
        ['button', 'input', 'select', 'textarea', 'nav', 'header', 'aside'].includes(tagName) ||
        className.includes('btn') ||
        className.includes('button') ||
        className.includes('nav') ||
        className.includes('header') ||
        className.includes('sidebar') ||
        className.includes('menu') ||
        className.includes('toast') ||
        className.includes('dialog') ||
        className.includes('modal') ||
        role === 'button' ||
        role === 'navigation' ||
        role === 'menubar'
      ) {
        return false;
      }
    }

    return true;
  };

  const handleCloseHelper = () => {
    setShowHelper(false);
    // Clear text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  };

  return (
    <>
      {children}
      {showHelper && user && selectedText && (
        <TranslationHelper
          selectedText={selectedText}
          position={position}
          onClose={handleCloseHelper}
          language={targetLanguage}
        />
      )}
    </>
  );
};

export default GlobalTextSelection;