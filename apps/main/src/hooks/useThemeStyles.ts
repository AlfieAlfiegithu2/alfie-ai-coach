import { useTheme } from '@/contexts/ThemeContext';
import { useMemo } from 'react';

export const useThemeStyles = () => {
  const { theme } = useTheme();

  const cardClassName = useMemo(() => {
    switch (theme.name) {
      case 'note':
        return 'bg-[#FEF9E7] border-[#E8D5A3]';
      case 'glassmorphism':
        return 'bg-white/60 border-white/50 backdrop-blur-lg';
      case 'dark':
        return 'bg-[#1e293b] border-[#334155]';
      case 'minimalist':
        return 'bg-white border-[#e5e7eb]';
      default:
        return 'bg-[#FEF9E7] border-[#E8D5A3]';
    }
  }, [theme.name]);

  const cardStyle = useMemo(() => {
    return theme.styles.cardStyle || {};
  }, [theme]);

  const textPrimary = useMemo(() => theme.colors.textPrimary, [theme]);
  const textSecondary = useMemo(() => theme.colors.textSecondary, [theme]);
  const textAccent = useMemo(() => theme.colors.textAccent, [theme]);
  const border = useMemo(() => theme.colors.border, [theme]);
  const hoverBg = useMemo(() => theme.colors.hoverBackground, [theme]);
  const buttonPrimary = useMemo(() => theme.colors.buttonPrimary, [theme]);
  const buttonPrimaryHover = useMemo(() => theme.colors.buttonPrimaryHover, [theme]);
  const chartLine = useMemo(() => theme.colors.chartLine, [theme]);
  const chartTarget = useMemo(() => theme.colors.chartTarget, [theme]);
  const backgroundOverlay = useMemo(() => theme.colors.backgroundOverlay || 'rgba(255, 255, 255, 0.2)', [theme]);
  const backgroundImageColor = useMemo(() => theme.colors.backgroundImageColor || '#a2d2ff', [theme]);
  const background = useMemo(() => theme.colors.background, [theme]);
  const backgroundGradient = useMemo(() => theme.colors.backgroundGradient || theme.colors.background, [theme]);

  const cardBackground = useMemo(() => {
    switch (theme.name) {
      case 'note':
        return '#FEF9E7';
      case 'glassmorphism':
        return 'rgba(255, 255, 255, 0.6)';
      case 'dark':
        return 'rgba(255, 255, 255, 0.1)';
      case 'minimalist':
        return '#ffffff';
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  }, [theme.name]);

  return {
    cardClassName,
    cardStyle,
    textPrimary,
    textSecondary,
    textAccent,
    border,
    hoverBg,
    buttonPrimary,
    buttonPrimaryHover,
    chartLine,
    chartTarget,
    backgroundOverlay,
    backgroundImageColor,
    background,
    backgroundGradient,
    cardBackground,
    theme,
  };
};


