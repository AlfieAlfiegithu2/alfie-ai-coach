import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy, Zap, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DailyChallengeQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
}

const DailyChallenge = () => {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState<DailyChallengeQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(7);
  const [progress, setProgress] = useState({ current: 6, total: 10 });
  const [loading, setLoading] = useState(true);

  // Daily challenge questions pool
  const challengeQuestions: DailyChallengeQuestion[] = [
    {
      id: "vocab-1",
      type: "vocabulary",
      question: "What does the word 'ubiquitous' mean?",
      options: [
        "Very rare",
        "Present everywhere",
        "Extremely large",
        "Difficult to understand"
      ],
      correctAnswer: "Present everywhere",
      explanation: "'Ubiquitous' means present, appearing, or found everywhere. It comes from Latin 'ubique' meaning 'everywhere'.",
      difficulty: "Medium",
      category: "Academic Vocabulary"
    },
    {
      id: "grammar-1",
      type: "grammar",
      question: "Choose the correct sentence:",
      options: [
        "Neither John nor Mary were present.",
        "Neither John nor Mary was present.",
        "Neither John or Mary were present.",
        "Neither John or Mary was present."
      ],
      correctAnswer: "Neither John nor Mary was present.",
      explanation: "With 'neither...nor', the verb agrees with the subject closer to it. Since 'Mary' is singular, we use 'was'.",
      difficulty: "Hard",
      category: "Grammar"
    },
    {
      id: "reading-1",
      type: "reading",
      question: "Based on the context, what does 'mitigate' mean in: 'We need to mitigate the environmental impact'?",
      options: [
        "Increase",
        "Study",
        "Reduce",
        "Ignore"
      ],
      correctAnswer: "Reduce",
      explanation: "'Mitigate' means to make something less severe, serious, or painful. In this context, it means to reduce the environmental impact.",
      difficulty: "Easy",
      category: "Reading Comprehension"
    },
    {
      id: "vocab-2",
      type: "vocabulary",
      question: "What is the meaning of 'eloquent'?",
      options: [
        "Speaking fluently and persuasively",
        "Speaking very quietly",
        "Speaking in a foreign language",
        "Speaking without thinking"
      ],
      correctAnswer: "Speaking fluently and persuasively",
      explanation: "'Eloquent' describes someone who speaks or writes with fluency and persuasive power.",
      difficulty: "Medium",
      category: "Academic Vocabulary"
    },
    {
      id: "grammar-2",
      type: "grammar",
      question: "Complete the sentence: 'If I _____ more time, I would have finished the project.'",
      options: [
        "have had",
        "had had",
        "would have",
        "had"
      ],
      correctAnswer: "had had",
      explanation: "This is a third conditional sentence. We use 'had had' (past perfect) in the if-clause when talking about hypothetical past situations.",
      difficulty: "Hard",
      category: "Grammar"
    }
  ];

  useEffect(() => {
    loadDailyChallenge();
  }, []);

  const loadDailyChallenge = () => {
    setLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      // Get today's challenge based on date
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      const questionIndex = dayOfYear % challengeQuestions.length;
      
      setCurrentQuestion(challengeQuestions[questionIndex]);
      setLoading(false);
      
      // Load streak and progress from localStorage (simulation)
      const savedStreak = localStorage.getItem('dailyChallengeStreak');
      const savedProgress = localStorage.getItem('dailyChallengeProgress');
      
      if (savedStreak) setStreak(parseInt(savedStreak));
      if (savedProgress) setProgress(JSON.parse(savedProgress));
      
      console.log('📚 Daily challenge loaded:', challengeQuestions[questionIndex].category);
    }, 500);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const correct = answer === currentQuestion?.correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      const newProgress = { ...progress, current: Math.min(progress.current + 1, progress.total) };
      setProgress(newProgress);
      
      if (newProgress.current === newProgress.total) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem('dailyChallengeStreak', newStreak.toString());
        
        toast({
          title: "Daily Challenge Complete!",
          description: `🎉 You've completed today's challenge! Streak: ${newStreak} days`,
        });
        
        // Reset progress for next day
        setProgress({ current: 0, total: 10 });
        localStorage.setItem('dailyChallengeProgress', JSON.stringify({ current: 0, total: 10 }));
      } else {
        toast({
          title: "Correct!",
          description: `Great job! Progress: ${newProgress.current}/${newProgress.total}`,
        });
        localStorage.setItem('dailyChallengeProgress', JSON.stringify(newProgress));
      }
    } else {
      toast({
        title: "Not quite right",
        description: "Check the explanation below and try again tomorrow!",
        variant: "destructive"
      });
    }
  };

  const getNextChallenge = () => {
    setSelectedAnswer("");
    setIsAnswered(false);
    setIsCorrect(false);
    
    // Get next question (cycling through available questions)
    const currentIndex = challengeQuestions.findIndex(q => q.id === currentQuestion?.id);
    const nextIndex = (currentIndex + 1) % challengeQuestions.length;
    setCurrentQuestion(challengeQuestions[nextIndex]);
  };

  if (loading) {
    return (
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-orange" />
            <CardTitle className="text-lg">Daily Challenge</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-orange mx-auto"></div>
            <p className="text-sm text-text-secondary mt-2">Loading today's challenge...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-orange" />
            <CardTitle className="text-lg">Daily Challenge</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary">No challenge available today</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-modern">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-orange" />
            <CardTitle className="text-lg">Daily Challenge</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {currentQuestion.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress and Streak */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-orange" />
              <span>Progress: {progress.current}/{progress.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-green" />
              <span>{streak} day streak</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="progress-bar h-2">
            <div 
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          
          {/* Question */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentQuestion.category}
              </Badge>
            </div>
            
            <h4 className="font-semibold text-brand-orange">
              {currentQuestion.question}
            </h4>
            
            {/* Options */}
            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isAnswered}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    isAnswered
                      ? option === currentQuestion.correctAnswer
                        ? 'bg-brand-green/10 border-brand-green text-brand-green'
                        : option === selectedAnswer && option !== currentQuestion.correctAnswer
                        ? 'bg-brand-red/10 border-brand-red text-brand-red'
                        : 'bg-surface-3 border-border text-text-secondary'
                      : 'bg-surface-1 border-border hover:bg-surface-3 hover:border-brand-orange/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isAnswered && option === currentQuestion.correctAnswer && (
                      <CheckCircle className="w-4 h-4 text-brand-green" />
                    )}
                    {isAnswered && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                      <X className="w-4 h-4 text-brand-red" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Explanation */}
            {isAnswered && (
              <div className={`p-3 rounded-xl text-sm ${
                isCorrect 
                  ? 'bg-brand-green/10 border border-brand-green/20 text-brand-green' 
                  : 'bg-brand-red/10 border border-brand-red/20 text-brand-red'
              }`}>
                <p className="font-medium mb-1">
                  {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                </p>
                <p className="text-text-primary">{currentQuestion.explanation}</p>
              </div>
            )}
            
            {/* Action Button */}
            {isAnswered && (
              <Button 
                onClick={getNextChallenge}
                size="sm" 
                className="w-full btn-primary"
              >
                {progress.current >= progress.total ? 'Challenge Complete! 🎉' : 'Next Question'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyChallenge;