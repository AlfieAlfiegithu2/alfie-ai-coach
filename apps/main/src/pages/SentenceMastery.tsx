import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SentenceMastery = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-12 pb-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <Construction className="w-24 h-24 text-primary animate-pulse" />
                <Sparkles className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-primary">Sentence Mastery</h1>
              <p className="text-xl text-muted-foreground">Coming Soon!</p>
            </div>

            {/* Description */}
            <div className="space-y-4 text-left max-w-md mx-auto">
              <p className="text-base text-foreground">
                We're building an amazing sentence-building practice tool to help you master English sentence construction!
              </p>
              
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-lg">What to expect:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Interactive sentence construction exercises</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Real-time feedback on your sentence structure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Progressive difficulty levels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Track your progress and mastery</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <span className="font-semibold">Note:</span> This feature is currently under development. In the meantime, continue practicing with our other great tools!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <Button
                onClick={() => navigate('/ielts-portal')}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Explore Other Skills
              </Button>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-muted-foreground pt-4">
              Want to be notified when this feature launches? Stay tuned for updates!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SentenceMastery;
