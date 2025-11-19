import { useThemeStyles } from '@/hooks/useThemeStyles';

interface GrammarFeedbackDisplayProps {
  feedback: string | null;
  improved?: string | null;
}

/**
 * Reusable component for displaying grammar feedback and improved versions
 * Used in IELTS Writing Test for Task 1 and Task 2
 */
export const GrammarFeedbackDisplay = ({ feedback, improved }: GrammarFeedbackDisplayProps) => {
  const themeStyles = useThemeStyles();

  if (!feedback) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="p-4 rounded-lg border" style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
        borderColor: themeStyles.border
      }}>
        <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Grammar Feedback:</h4>
        <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
          {feedback}
        </div>
      </div>
      {improved && (
        <div className="p-4 rounded-lg border" style={{
          backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)',
          borderColor: themeStyles.border
        }}>
          <h4 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Improved Version:</h4>
          <div className="text-sm whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
            {improved}
          </div>
        </div>
      )}
    </div>
  );
};

