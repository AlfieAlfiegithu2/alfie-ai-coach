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
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isComplete = progress.current >= progress.total && !isRunning;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
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
              <span>Progress</span>
              <span className="font-medium">
                {progress.current} / {progress.total}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {progress.currentCard && (
            <div className="text-sm">
              <p className="text-muted-foreground">Current word:</p>
              <p className="font-medium">{progress.currentCard}</p>
            </div>
          )}

          {progress.currentLang && (
            <div className="text-sm">
              <p className="text-muted-foreground">Language:</p>
              <p className="font-medium uppercase">{progress.currentLang}</p>
            </div>
          )}

          {progress.errors > 0 && (
            <div className="text-sm text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{progress.errors} errors occurred</span>
            </div>
          )}

          {isComplete && (
            <div className="text-sm text-green-600 dark:text-green-500 font-medium">
              Translation completed! {progress.current} translations saved.
            </div>
          )}

          {!isRunning && canResume && (
            <Button onClick={onResume} className="w-full">
              Resume Translation
            </Button>
          )}

          {isRunning && (
            <p className="text-sm text-muted-foreground text-center">
              Please keep this window open while translating...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
