import { ThemeStyles } from '@/hooks/useThemeStyles';

/**
 * Helper function to get consistent card styling for IELTS Writing Test components
 * Reduces code duplication across multiple Card components
 */
export const getWritingCardStyles = (themeStyles: ThemeStyles) => {
  return {
    backgroundColor: themeStyles.theme.name === 'glassmorphism' 
      ? 'rgba(255,255,255,0.9)' 
      : themeStyles.theme.name === 'dark' 
        ? 'rgba(30, 41, 59, 0.95)' 
        : themeStyles.theme.name === 'minimalist' 
          ? '#ffffff' 
          : themeStyles.theme.colors.cardBackground,
    borderColor: themeStyles.border,
    backdropFilter: themeStyles.theme.name === 'glassmorphism' 
      ? 'blur(12px)' 
      : themeStyles.theme.name === 'dark' 
        ? 'blur(8px)' 
        : 'none',
    boxShadow: themeStyles.theme.name === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      : themeStyles.theme.name === 'note'
        ? themeStyles.theme.styles.cardStyle?.boxShadow
        : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
    ...themeStyles.cardStyle
  };
};

/**
 * Helper function to get textarea background styling based on skipped state
 */
export const getTextareaStyles = (themeStyles: ThemeStyles, skipped: boolean) => {
  if (skipped) {
    return themeStyles.theme.name === 'glassmorphism' 
      ? 'rgba(255,255,255,0.05)' 
      : themeStyles.theme.name === 'dark' 
        ? 'rgba(255,255,255,0.02)' 
        : themeStyles.theme.name === 'minimalist' 
          ? '#f3f4f6' 
          : 'rgba(255,255,255,0.3)';
  }
  return themeStyles.theme.name === 'glassmorphism' 
    ? 'rgba(255,255,255,0.1)' 
    : themeStyles.theme.name === 'dark' 
      ? 'rgba(255,255,255,0.05)' 
      : themeStyles.theme.name === 'minimalist' 
        ? '#f9fafb' 
        : 'rgba(255,255,255,0.6)';
};

/**
 * Helper function to get instruction box styling
 */
export const getInstructionBoxStyles = (themeStyles: ThemeStyles) => {
  return {
    backgroundColor: themeStyles.theme.name === 'glassmorphism' 
      ? 'rgba(255,255,255,0.1)' 
      : themeStyles.theme.name === 'dark' 
        ? 'rgba(255,255,255,0.05)' 
        : themeStyles.theme.name === 'minimalist' 
          ? '#f9fafb' 
          : 'rgba(255,255,255,0.6)',
    borderColor: themeStyles.border,
    borderWidth: '1px',
    borderStyle: 'solid',
    color: themeStyles.textPrimary
  };
};


