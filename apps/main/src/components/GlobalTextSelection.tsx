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
  const [targetLanguage, setTargetLanguage] = useState('en'); // Default to English
  const [isSaving, setIsSaving] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();
  const { user } = useAuth();

  // Load and refresh user's preferred language
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
          setTargetLanguage(profile.native_language);
        }
      }
    };
    
    loadUserLanguage();
    
    // Listen for storage events to detect language changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language-updated') {
        loadUserLanguage();
        localStorage.removeItem('language-updated');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  useEffect(() => {
    // Only enable translation selection for authenticated users
    if (!user) {
      setShowHelper(false);
      return;
    }
    const handleMouseUp = (e: MouseEvent) => {
      // Clear any existing timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Wait a bit to ensure selection is complete
      selectionTimeoutRef.current = setTimeout(() => {
        // Don't show new translations if we're currently saving
        if (isSaving) return;
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const text = selection.toString().trim();
        
        // Show for meaningful text selections - allow longer text for sentences
        if (text.length >= 2 && text.length <= 500 && !text.includes('\n')) {
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

          // Get more precise positioning based on selection bounds
          const rect = range.getBoundingClientRect();
          const selectionX = rect.left + (rect.width / 2); // Center of selection horizontally
          const selectionY = rect.bottom; // Bottom of selection
          
          setSelectedText(text);
          setPosition({
            x: selectionX,
            y: selectionY + window.scrollY + 5 // Closer to the selected text
          });
          setShowHelper(true);
        }
      }, 100);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Don't hide helper if clicking inside the translation helper popup
      const target = e.target as Element;
      if (target && target.closest('[data-translation-helper]')) {
        return;
      }
      setShowHelper(false);
    };

    // No longer using localStorage for language preferences

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [isSaving, user]); // Add user dependency

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

  const handleSaveStart = () => {
    setIsSaving(true);
    // Hide the helper immediately when save starts
    setShowHelper(false);
  };

  const handleCloseHelper = () => {
    setShowHelper(false);
    setIsSaving(false);
    // Clear text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  };

  return (
    <>
      {children}
      {showHelper && selectedText && (
        <TranslationHelper
          selectedText={selectedText}
          position={position}
          onClose={handleCloseHelper}
          onSaveStart={handleSaveStart}
          language={targetLanguage}
        />
      )}
    </>
  );
};

export default GlobalTextSelection;