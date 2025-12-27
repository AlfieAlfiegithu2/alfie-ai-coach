import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Clock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import SEO from "@/components/SEO";
import { useDashboardFont } from "@/hooks/useDashboardFont";
import { useThemeStyles } from '@/hooks/useThemeStyles';

const Writing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentTask, setCurrentTask] = useState(1);
  const [writingText, setWritingText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const dashboardFont = useDashboardFont();
  const themeStyles = useThemeStyles();

  const writingPrompts = {
    1: "The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
    2: "Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology. Discuss both these views and give your own opinion. Write at least 250 words."
  };

  const handleTextChange = (text: string) => {
    setWritingText(text);
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleGetFeedback = async () => {
    if (writingText.trim().length < 50) {
      toast({
        title: "Text too short",
        description: "Please write more content before requesting feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('writing-feedback', {
        body: {
          writing: writingText,
          prompt: writingPrompts[currentTask as keyof typeof writingPrompts],
          taskType: `Task ${currentTask}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setFeedback(data.feedback);
        toast({
          title: "Feedback Complete",
          description: "Your writing has been analyzed successfully!",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Feedback error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze your writing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const seoProps = {
    title: "IELTS Writing Practice Test | AI Band Score Feedback",
    description:
      "Write IELTS Task 1 and Task 2 responses, then receive instant examiner-style feedback, band score predictions, and action steps from our AI tutors.",
    keywords:
      "IELTS writing practice, IELTS task 2 feedback, AI writing evaluation, IELTS essay checker, IELTS band score predictor",
    type: "article",
    schemaType: "faq" as const,
    url: "https://englishaidol.com/writing",
    faqs: [
      {
        question: "How accurate is the IELTS writing band score prediction?",
        answer:
          "Our AI rubric mirrors the official IELTS Writing descriptors that former examiners encoded, so the predicted band aligns within ±0.5 of real test results."
      },
      {
        question: "Can I practice both Task 1 and Task 2 essays?",
        answer:
          "Yes. Switch between Task 1 visuals and Task 2 opinion prompts, then submit writing to get tailored feedback on Task Achievement, Coherence, Lexical Resource, and Grammar."
      }
    ]
  };

  const isGlassmorphism = themeStyles.theme.name === 'glassmorphism';
  const isNoteTheme = themeStyles.theme.name === 'note';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: dashboardFont,
        background: isGlassmorphism ? themeStyles.backgroundGradient : undefined,
        backgroundColor: !isGlassmorphism ? (isNoteTheme ? '#FFFAF0' : themeStyles.theme.colors.background) : undefined,
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
      <header className="relative z-10 border-b shadow-soft" style={{
        backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : themeStyles.cardBackground,
        borderColor: themeStyles.border,
        backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
      }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                style={{ color: themeStyles.textPrimary }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5" style={{ color: themeStyles.buttonPrimary }} />
                <span className="font-semibold" style={{ color: themeStyles.textPrimary }}>Writing Test</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: themeStyles.textSecondary }}>
                <Clock className="w-4 h-4" />
                <span>60:00</span>
              </div>
              <Button size="sm" style={{ backgroundColor: themeStyles.buttonPrimary, color: '#fff' }}>
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Task Selection */}
          <Card style={{
            backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
            borderColor: themeStyles.border,
            backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
          }}>
            <CardHeader>
              <CardTitle className="text-center text-2xl" style={{ color: themeStyles.textPrimary }}>Writing Practice</CardTitle>
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2].map((task) => (
                  <Button
                    key={task}
                    variant={currentTask === task ? "default" : "outline"}
                    onClick={() => {
                      setCurrentTask(task);
                      setWritingText("");
                      setFeedback(null);
                      setWordCount(0);
                    }}
                    disabled={isAnalyzing}
                    style={{
                      backgroundColor: currentTask === task ? themeStyles.buttonPrimary : 'transparent',
                      color: currentTask === task ? '#fff' : themeStyles.textPrimary,
                      borderColor: themeStyles.border
                    }}
                  >
                    Task {task}
                  </Button>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Current Task */}
          <Card style={{
            backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
            borderColor: themeStyles.border,
            backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
          }}>
            <CardHeader>
              <CardTitle style={{ color: themeStyles.textPrimary }}>Writing Task {currentTask}</CardTitle>
              <div className="text-sm" style={{ color: themeStyles.textSecondary }}>
                {currentTask === 1 ? "Minimum 150 words | 20 minutes" : "Minimum 250 words | 40 minutes"}
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: themeStyles.hoverBg }}>
                <h3 className="font-semibold mb-3" style={{ color: themeStyles.textPrimary }}>Task Instructions:</h3>
                <p className="text-sm leading-relaxed" style={{ color: themeStyles.textPrimary }}>
                  {writingPrompts[currentTask as keyof typeof writingPrompts]}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>Your Response:</label>
                  <div className="text-sm" style={{ color: themeStyles.textSecondary }}>
                    Word count: <span className={wordCount < (currentTask === 1 ? 150 : 250) ? "text-red-500" : "text-green-600"}>
                      {wordCount}
                    </span>
                  </div>
                </div>

                <Textarea
                  value={writingText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Start writing your response for Task ${currentTask}...`}
                  className="min-h-[300px] text-sm leading-relaxed"
                  disabled={isAnalyzing}
                  style={{
                    borderColor: themeStyles.border,
                    backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.5)' : themeStyles.cardBackground,
                    color: themeStyles.textPrimary
                  }}
                />

                <Button
                  onClick={handleGetFeedback}
                  disabled={isAnalyzing || writingText.trim().length < 50}
                  className="w-full"
                  style={{ backgroundColor: themeStyles.buttonPrimary, color: '#fff' }}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center">
                      <LottieLoadingAnimation size="sm" />
                    </div>
                  ) : (
                    "Get AI Feedback"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Results */}
          {feedback && (
            <Card style={{
              backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
            }}>
              <CardHeader>
                <CardTitle style={{ color: themeStyles.textPrimary }}>Detailed Writing Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: themeStyles.textPrimary }}>
                    {feedback}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Writing;