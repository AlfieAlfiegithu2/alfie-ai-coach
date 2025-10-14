import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface TranslationProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: {
    current: number;
    total: number;
    currentCard?: string;
    currentLang?: string;
    errors: number;
  };
  isRunning: boolean;
  onResume?: () => void;
  canResume?: boolean;
}

export function TranslationProgressModal({
  open,
  onOpenChange,
  progress,
  isRunning,
  onResume,
  canResume
}: TranslationProgressModalProps) {
  const percentage = progress.total > 0 ? Math.min((progress.current / progress.total) * 100, 100) : 0;
  const isComplete = percentage >= 99.9 && !isRunning;
  
  // Calculate estimated time remaining
  const remaining = progress.total - progress.current;
  const avgSpeed = 100; // translations per minute (optimized batch processing)
  const estimatedMinutes = Math.ceil(remaining / avgSpeed);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const estimatedMins = estimatedMinutes % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            Translation Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-lg">
                {percentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>{progress.current.toLocaleString()} translated</span>
              <span>{remaining.toLocaleString()} remaining</span>
            </div>
          </div>

          {isRunning && estimatedMinutes > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground mb-1">Estimated time remaining:</p>
              <p className="font-semibold text-blue-600 dark:text-blue-400">
                {estimatedHours > 0 
                  ? `${estimatedHours}h ${estimatedMins}m` 
                  : `${estimatedMins} minutes`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ~{avgSpeed} translations/min • Auto-chaining in background
              </p>
            </div>
          )}

          {progress.errors > 0 && (
            <div className="text-sm text-yellow-600 dark:text-yellow-500 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{progress.errors} errors (will auto-retry)</span>
            </div>
          )}

          {isComplete && (
            <div className="text-sm text-green-600 dark:text-green-500 font-medium bg-green-50 dark:bg-green-950 rounded-lg p-3">
              ✅ Translation completed! {progress.current.toLocaleString()} translations saved across 23 languages.
            </div>
          )}

          {!isRunning && canResume && (
            <Button onClick={onResume} className="w-full" size="lg">
              Resume Translation
            </Button>
          )}

          {isRunning && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Running in background. Safe to close this window.
              </p>
              <p className="text-xs text-muted-foreground">
                Edge functions auto-chain to process all words continuously
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
