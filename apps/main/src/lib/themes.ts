// Theme definitions for dashboard
export type ThemeName = 'note' | 'glassmorphism' | 'dark' | 'minimalist';

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  colors: {
    background: string;
    backgroundGradient?: string;
    backgroundOverlay?: string;
    backgroundImageColor?: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textAccent: string;
    cardBackground: string;
    cardBorder: string;
    hoverBackground: string;
    shadow: string;
    chartLine: string;
    chartTarget: string;
    buttonPrimary: string;
    buttonPrimaryHover: string;
  };
  styles: {
    cardStyle?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
  };
}

export const themes: Record<ThemeName, Theme> = {
  note: {
    name: 'note',
    label: 'Note',
    description: 'Warm paper-like appearance',
    colors: {
      background: '#FEF9E7',
      backgroundGradient: 'linear-gradient(to bottom, #FEF9E7 0%, #FDF6E3 100%)',
      backgroundOverlay: 'rgba(254, 249, 231, 0.7)',
      backgroundImageColor: '#F5E6D3',
      border: '#E8D5A3',
      textPrimary: '#5D4E37',
      textSecondary: '#8B6914',
      textAccent: '#A68B5B',
      cardBackground: '#FEF9E7',
      cardBorder: '#E8D5A3',
      hoverBackground: 'rgba(255, 255, 255, 0.6)',
      shadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
      chartLine: '#8B6914',
      chartTarget: '#C97D60',
      buttonPrimary: '#A68B5B',
      buttonPrimaryHover: '#8B6914',
    },
    styles: {
      cardStyle: {
        background: 'linear-gradient(to bottom, #FEF9E7 0%, #FDF6E3 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
      },
    },
  },
  glassmorphism: {
    name: 'glassmorphism',
    label: 'Glassmorphism',
    description: 'Frosted glass effect',
    colors: {
      background: '#e8f4ff',
      backgroundGradient: 'linear-gradient(135deg, #e0f4ff 0%, #cce7ff 25%, #d4ebff 50%, #e8f4ff 75%, #f0f9ff 100%)',
      backgroundOverlay: 'rgba(255, 255, 255, 0.6)',
      backgroundImageColor: '#d4ebff',
      border: 'rgba(255, 255, 255, 0.5)',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textAccent: '#475569',
      cardBackground: 'rgba(255, 255, 255, 0.6)',
      cardBorder: 'rgba(255, 255, 255, 0.5)',
      hoverBackground: 'rgba(255, 255, 255, 0.7)',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      chartLine: 'rgb(59, 130, 246)',
      chartTarget: 'rgb(239, 68, 68)',
      buttonPrimary: '#3b82f6',
      buttonPrimaryHover: '#2563eb',
    },
    styles: {
      cardStyle: {
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
      },
    },
  },
  dark: {
    name: 'dark',
    label: 'Dark',
    description: 'Dark mode theme',
    colors: {
      background: '#0f172a',
      backgroundGradient: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)',
      backgroundOverlay: 'rgba(15, 23, 42, 0.9)',
      backgroundImageColor: '#0f172a',
      border: '#334155',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textAccent: '#94a3b8',
      cardBackground: '#1e293b',
      cardBorder: '#334155',
      hoverBackground: '#334155',
      shadow: '0 4px 12px rgba(0,0,0,0.3)',
      chartLine: '#60a5fa',
      chartTarget: '#f87171',
      buttonPrimary: '#64748b',
      buttonPrimaryHover: '#475569',
    },
    styles: {
      cardStyle: {
        background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      },
    },
  },
  minimalist: {
    name: 'minimalist',
    label: 'Minimalist',
    description: 'Clean and simple',
    colors: {
      background: '#ffffff',
      backgroundOverlay: 'rgba(255, 255, 255, 0.9)',
      backgroundImageColor: '#f9fafb',
      border: '#e5e7eb',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      textAccent: '#9ca3af',
      cardBackground: '#ffffff',
      cardBorder: '#e5e7eb',
      hoverBackground: '#f9fafb',
      shadow: '0 1px 3px rgba(0,0,0,0.1)',
      chartLine: '#3b82f6',
      chartTarget: '#ef4444',
      buttonPrimary: '#2563eb',
      buttonPrimaryHover: '#1d4ed8',
    },
    styles: {
      cardStyle: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
    },
  },
};

export const getTheme = (themeName: ThemeName = 'note'): Theme => {
  return themes[themeName] || themes.note;
};

// Get theme from localStorage or default to 'note'
export const getStoredTheme = (): ThemeName => {
  if (typeof window === 'undefined') return 'note';
  const stored = localStorage.getItem('dashboard-theme');
  return (stored as ThemeName) || 'note';
};

// Save theme to localStorage
export const saveTheme = (theme: ThemeName): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dashboard-theme', theme);
};

