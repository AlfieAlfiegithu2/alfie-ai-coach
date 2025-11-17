import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { X, Copy, Languages } from 'lucide-react';

interface TextActionMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy: () => void;
  onTranslate: () => void;
}

const TextActionMenu: React.FC<TextActionMenuProps> = ({
  selectedText,
  position,
  onClose,
  onCopy,
  onTranslate,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const themeStyles = useThemeStyles();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      onCopy(); // Trigger toast
      onClose();
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Calculate dynamic positioning to keep popup on screen
  const getMenuPosition = () => {
    const menuWidth = 200; // Approximate width of the menu
    const menuHeight = 50; // Approximate height of the menu
    const margin = 10; // Margin from screen edges

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;

    let left = position.x - menuWidth / 2; // Center horizontally
    let top = position.y + 8; // 8px below the selection

    // Ensure it doesn't go off the left edge
    if (left < margin) {
      left = margin;
    }

    // Ensure it doesn't go off the right edge
    if (left + menuWidth > viewportWidth - margin) {
      left = viewportWidth - menuWidth - margin;
    }

    // Ensure it doesn't go off the bottom edge
    if (top + menuHeight > viewportHeight + scrollY - margin) {
      // Position above the selection instead
      top = position.y - menuHeight - 8;
    }

    // Ensure it doesn't go off the top edge
    if (top < scrollY + margin) {
      top = scrollY + margin;
    }

    return { left, top };
  };

  const { left, top } = getMenuPosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-[10000] flex items-center gap-2 p-1 rounded-lg shadow-lg"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        backgroundColor: themeStyles.cardBackground,
        borderColor: themeStyles.border,
        borderWidth: '1px',
        borderStyle: 'solid',
        backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(10px)' : 'none',
        boxShadow: themeStyles.theme.name === 'glassmorphism' 
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          : themeStyles.theme.name === 'dark'
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <Button
        onClick={handleCopyClick}
        variant="ghost"
        size="sm"
        className="text-sm flex items-center gap-2"
        style={{
          color: themeStyles.textPrimary,
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Copy className="w-4 h-4" />
        Copy
      </Button>
      <Button
        onClick={onTranslate}
        variant="ghost"
        size="sm"
        className="text-sm flex items-center gap-2"
        style={{
          color: themeStyles.textPrimary,
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Languages className="w-4 h-4" />
        Translate
      </Button>
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="w-6 h-6"
        style={{
          color: themeStyles.textSecondary,
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TextActionMenu;

