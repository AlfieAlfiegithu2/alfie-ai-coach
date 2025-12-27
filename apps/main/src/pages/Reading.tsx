import { useState, useEffect } from 'react';
import { useDashboardFont } from '@/hooks/useDashboardFont';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface ReadingPassage {
  id: string;
  title: string;
  content: string;

  passage_type: string;
}

interface ReadingQuestion {
  id: string;
  question_text: string;
  question_number: number;
  options: any;
  correct_answer: string;
  question_type: string;
  passage_id: string;
}

const Reading = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [currentPassage, setCurrentPassage] = useState<ReadingPassage | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const dashboardFont = useDashboardFont();
  const themeStyles = useThemeStyles();

  useEffect(() => {
    fetchReadingTest();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchReadingTest = async () => {
    try {
      // For now, show a message that reading tests need to be updated
      setLoading(false);

      // Create a placeholder passage with sample content
      const placeholderPassage = {
        id: 'placeholder',
        title: 'Reading Test Coming Soon',
        content: 'Reading tests are being updated to the new system. Please check back soon!',
        passage_type: 'placeholder'
      };

      setCurrentPassage(placeholderPassage);
      setQuestions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load reading test: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    const score = calculateScore();
    toast({
      title: "Test Submitted!",
      description: `You answered ${score}/${questions.length} questions correctly.`,
    });
    navigate('/');
  };

  const calculateScore = () => {
    return questions.reduce((score, question) => {
      return answers[question.id] === question.correct_answer ? score + 1 : score;
    }, 0);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const seoProps = {
    title: "IELTS Reading Practice Test Online | Timed Passages & Answers",
    description:
      "Train for IELTS Reading with realistic passages, question types, and countdown timers. Track accuracy and build scanning strategies in one dashboard.",
    keywords:
      "IELTS reading practice, IELTS reading mock test, reading passage PDF, IELTS skimming scanning tips, IELTS multiple choice practice",
    type: "article",
    schemaType: "faq" as const,
    url: "https://englishaidol.com/reading",
    faqs: [
      {
        question: "What IELTS reading question types can I practice here?",
        answer:
          "You can work through matching headings, True/False/Not Given, multiple choice, and summary completion question sets, mirroring the official exam format."
      },
      {
        question: "Do I get a timer like the real IELTS Reading section?",
        answer:
          "Yes. A built-in one-hour timer keeps you on pace, then we calculate accuracy so you can see if you are meeting your target band score."
      }
    ]
  };

  const isGlassmorphism = themeStyles.theme.name === 'glassmorphism';
  const isNoteTheme = themeStyles.theme.name === 'note';

  if (loading) {
    return (
      <>
        <SEO {...seoProps} />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: themeStyles.theme.colors.textPrimary }}></div>
            <p style={{ color: themeStyles.theme.colors.textPrimary }}>Loading reading test...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: dashboardFont,
        background: themeStyles.theme.name === 'glassmorphism' ? themeStyles.backgroundGradient : undefined,
        backgroundColor: themeStyles.theme.name !== 'glassmorphism' ? (isNoteTheme ? '#FFFAF0' : themeStyles.theme.colors.background) : undefined,
        color: themeStyles.textPrimary
      }}
    >
      <SEO {...seoProps} />

      {/* Background for non-glassmorphism themes */}
      {!isGlassmorphism && (
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed pointer-events-none"
          style={{
            backgroundImage: isNoteTheme || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
              ? 'none'
              : `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
            backgroundColor: isNoteTheme ? '#FFFAF0' : themeStyles.backgroundImageColor,
            opacity: 0.1,
            zIndex: 0
          }}
        />
      )}

      {/* Paper texture for Note theme */}
      {isNoteTheme && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-0"
          style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
            mixBlendMode: 'multiply'
          }}
        />
      )}

      {/* Header */}
      <div className="relative z-10 border-b-2 p-4" style={{
        backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : themeStyles.cardBackground,
        borderColor: themeStyles.border,
        backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
      }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
              style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" style={{ color: themeStyles.buttonPrimary }} />
              <span className="font-semibold text-lg">IELTS Reading Test</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{ backgroundColor: themeStyles.hoverBg }}>
              <Clock className="h-4 w-4" style={{ color: themeStyles.chartTarget }} />
              <span className="font-mono font-medium" style={{ color: themeStyles.chartTarget }}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <Button onClick={handleSubmit} style={{ backgroundColor: themeStyles.buttonPrimary, color: '#fff' }}>
              Submit Test
            </Button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reading Passage */}
          <div>
            <Card style={{
              backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
                  <BookOpen className="h-5 w-5" />
                  {currentPassage?.title}
                </CardTitle>
                <CardDescription style={{ color: themeStyles.textSecondary }}>
                  Type: {currentPassage?.passage_type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none text-sm leading-relaxed" style={{ fontFamily: dashboardFont, color: themeStyles.textPrimary }}>
                  {currentPassage?.content.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions */}
          <div>
            <Card style={{
              backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
            }}>
              <CardHeader>
                <CardTitle style={{ color: themeStyles.textPrimary }}>Questions ({questions.length})</CardTitle>
                <CardDescription style={{ color: themeStyles.textSecondary }}>
                  Read the passage and answer all questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="border-b pb-4 last:border-b-0" style={{ borderColor: themeStyles.border }}>
                    <p className="font-medium mb-3" style={{ fontFamily: dashboardFont, color: themeStyles.textPrimary }}>
                      {question.question_number}. {question.question_text}
                    </p>

                    {question.question_type === 'multiple_choice' && question.options ? (
                      <div className="space-y-2">
                        {question.options.map((option: string, index: number) => (
                          <label key={index} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`question_${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="text-blue-600"
                              style={{ accentColor: themeStyles.buttonPrimary }}
                            />
                            <span className="text-sm" style={{ color: themeStyles.textPrimary }}>{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Type your answer here"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2"
                        style={{
                          borderColor: themeStyles.border,
                          backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.5)' : themeStyles.hoverBg,
                          color: themeStyles.textPrimary
                        }}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reading;