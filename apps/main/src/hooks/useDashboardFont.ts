import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const useDashboardFont = () => {
    const { theme } = useTheme();
    const [fontFamily, setFontFamily] = useState<string>('Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

    useEffect(() => {
        const getFontFamilyString = (fontName: string) => {
            switch (fontName) {
                case 'Patrick Hand': return 'Patrick Hand, cursive';
                case 'Roboto': return 'Roboto, sans-serif';
                case 'Open Sans': return 'Open Sans, sans-serif';
                case 'Lora': return 'Lora, serif';
                case 'Inter':
                default: return 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            }
        };

        const loadFont = () => {
            const stored = localStorage.getItem('dashboard_font');
            // If no stored font, fallback to theme default
            // Note theme defaults to Patrick Hand, others to Inter
            const fontName = stored || (theme.name === 'note' ? 'Patrick Hand' : 'Inter');
            setFontFamily(getFontFamilyString(fontName));
        };

        loadFont();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'dashboard_font_updated') {
                loadFont();
            }
        };

        // Also listen for custom event for same-window updates
        const handleCustomEvent = () => loadFont();

        window.addEventListener('storage', handleStorage);
        window.addEventListener('dashboard_font_updated', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('dashboard_font_updated', handleCustomEvent);
        };
    }, [theme.name]);

    return fontFamily;
};
