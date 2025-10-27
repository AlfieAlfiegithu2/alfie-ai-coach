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
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [isSaving, setIsSaving] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout>();
  const lastClickTimeRef = useRef(0);
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
      if (import.meta.env.DEV) {
        console.log('ℹ️ Translation disabled: No authenticated user');
      }
      setShowHelper(false);
      return;
    }
    if (import.meta.env.DEV) {
      console.log('✅ Translation enabled for user:', user.email);
    }

    const handleMouseUp = (e: MouseEvent) => {
      console.log('🐭 Mouse up detected');

      // Clear any existing timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Track double-clicks with proper timing
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTimeRef.current;
      lastClickTimeRef.current = currentTime;

      // If more than 400ms since last click, reset counter
      if (timeSinceLastClick > 400) {
        clickCountRef.current = 0;
      }

      clickCountRef.current++;
      console.log('👆 Click count:', clickCountRef.current, 'Time since last click:', timeSinceLastClick);

      // Clear existing timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }

      // Set timer to reset click count after 400ms
      clickTimerRef.current = setTimeout(() => {
        console.log('⏱️ Click counter reset after 400ms');
        clickCountRef.current = 0;
      }, 400);

      // Handle double-click (2 clicks within 400ms)
      if (clickCountRef.current === 2) {
        console.log('🔥 DOUBLE-CLICK DETECTED!');
        clickCountRef.current = 0; // Reset immediately
        
        // Don't show new translations if we're currently saving
        if (isSaving) {
          console.log('⚠️ Saving in progress, ignoring double-click');
          return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          console.log('❌ No selection found');
          return;
        }

        const text = selection.toString().trim();
        console.log('📝 Double-click text selected:', text, 'length:', text.length);

        // Show for meaningful text selections
        if (text.length >= 2 && text.length <= 500 && !text.includes('\n')) {
          console.log('✅ Double-click text meets criteria, checking if selectable...');
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : container as Element;

          // Skip if it's part of navigation, buttons, or form elements
          if (element && !isSelectableContent(element)) {
            console.log('❌ Element is not selectable content');
            return;
          }

          // Get more precise positioning based on selection bounds
          const rect = range.getBoundingClientRect();
          const selectionX = rect.left + (rect.width / 2);
          const selectionY = rect.bottom;

          setSelectedText(text);
          setPosition({
            x: selectionX,
            y: selectionY + window.scrollY + 5
          });
          console.log('🎯 Showing translation helper at position:', { x: selectionX, y: selectionY + window.scrollY + 5 });
          setShowHelper(true);
        }
        return;
      }

      // Single-click: wait 350ms to see if there's a second click
      // Only process if this is the first click (after reset)
      if (clickCountRef.current === 1) {
        selectionTimeoutRef.current = setTimeout(() => {
          // Check if still at click count 1 (no double-click happened)
          if (clickCountRef.current === 1) {
            console.log('👉 SINGLE-CLICK DETECTED (no second click within 350ms)');
            
            if (isSaving) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();
            console.log('📝 Single-click text selected:', text, 'length:', text.length);

            if (text.length >= 2 && text.length <= 500 && !text.includes('\n')) {
              console.log('✅ Single-click text meets criteria, checking if selectable...');
              const range = selection.getRangeAt(0);
              const container = range.commonAncestorContainer;
              const element = container.nodeType === Node.TEXT_NODE
                ? container.parentElement
                : container as Element;

              if (element && !isSelectableContent(element)) {
                console.log('❌ Element is not selectable content');
                return;
              }

              const rect = range.getBoundingClientRect();
              const selectionX = rect.left + (rect.width / 2);
              const selectionY = rect.bottom;

              setSelectedText(text);
              setPosition({
                x: selectionX,
                y: selectionY + window.scrollY + 5
              });
              console.log('🎯 Showing translation helper at position:', { x: selectionX, y: selectionY + window.scrollY + 5 });
              setShowHelper(true);
            }
          }
        }, 350);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Don't hide helper if clicking inside the translation helper popup
      const target = e.target as Element;
      if (target && target.closest('[data-translation-helper]')) {
        return;
      }
      setShowHelper(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, [isSaving, user]);

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

      // Skip UI elements - be more restrictive to avoid interfering with normal UI
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
        className.includes('lucide') ||
        className.includes('icon') ||
        role === 'button' ||
        role === 'navigation' ||
        role === 'menubar' ||
        parent.getAttribute('data-translation-helper')
      ) {
        return false;
      }
    }

    return true;
  };

  const handleSaveStart = () => {
    setIsSaving(true);
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