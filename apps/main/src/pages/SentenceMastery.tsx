import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const SentenceMastery = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Give the iframe time to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {isLoading && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading Sentence Mastery...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-red-600 font-semibold">Error loading Sentence Mastery</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-xs text-muted-foreground">Please ensure the Earthworm server is running on port 3000</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <iframe
          src="http://localhost:3001"
          style={{
            width: '100%',
            height: '100vh',
            border: 'none',
            borderRadius: '0',
          }}
          title="Sentence Mastery"
          onError={() => setError('Failed to load Sentence Mastery application')}
        />
      )}
    </div>
  );
};

export default SentenceMastery;
