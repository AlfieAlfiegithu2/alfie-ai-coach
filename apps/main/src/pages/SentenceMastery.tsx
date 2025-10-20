import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SentenceMastery = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* White-Label Header */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-full mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-foreground">English AIdol</h1>
              <p className="text-xs text-muted-foreground">Sentence Mastery</p>
            </div>
          </div>

          {/* Right: Close Button */}
          <Button
            onClick={() => navigate('/ielts-portal')}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Tagline */}
        <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">
            Master English through interactive sentence construction with AI-powered feedback
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading Sentence Mastery...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md bg-slate-50 dark:bg-slate-900 rounded-lg p-6">
            <p className="text-red-600 font-semibold">Error loading Sentence Mastery</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-xs text-muted-foreground">Please ensure the app is running on port 3001</p>
            <Button
              onClick={() => navigate('/ielts-portal')}
              variant="outline"
            >
              Return to Skills
            </Button>
          </div>
        </div>
      )}

      {/* Earthworm iframe - Full Height */}
      {!isLoading && !error && (
        <iframe
          src="http://localhost:3001"
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            borderRadius: '0',
          }}
          title="Sentence Mastery by English AIdol"
          onError={() => setError('Failed to load Sentence Mastery application')}
        />
      )}
    </div>
  );
};

export default SentenceMastery;
