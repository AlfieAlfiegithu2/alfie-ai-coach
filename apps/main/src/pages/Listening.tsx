import { useState, useEffect } from 'react';
import { useDashboardFont } from "@/hooks/useDashboardFont";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Headphones, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface ListeningSection {
  id: string;
  title: string;
  section_number: number;
  instructions: string;
  audio_url: string;
  transcript: string;

}

interface ListeningQuestion {
  id: string;
  question_text: string;
  question_number: number;
  options: any;
  correct_answer: string;
  question_type: string;
  section_id: string;
}

const Listening = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [currentSection, setCurrentSection] = useState<ListeningSection | null>(null);
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const dashboardFont = useDashboardFont();
  const themeStyles = useThemeStyles();

  useEffect(() => {
    fetchListeningTest();
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

  const fetchListeningTest = async () => {
    try {
      // For now, show a message that listening tests need to be updated
      setLoading(false);

      // Create a placeholder section with sample content
      const placeholderSection = {
        id: 'placeholder',
        title: 'Listening Test Coming Soon',
        section_number: 1,
        instructions: 'Listening tests are being updated to the new system. Please check back soon!',
        audio_url: null,
        transcript: ''
      };

      setCurrentSection(placeholderSection);
      setQuestions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load listening test: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    if (audio) {
      audio.pause();
    }
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
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const seoProps = {
    title: "IELTS Listening Practice | Audio Mock Test & Instant Feedback",
    description:
      "Simulate the IELTS Listening exam with authentic audio tracks, transcripts, timers, and auto-scoring so you can sharpen note-taking skills.",
    keywords:
      "IELTS listening practice, IELTS audio mock test, IELTS listening questions, band score listening, IELTS listening timer",
    type: "article",
    schemaType: "faq" as const,
    url: "https://englishaidol.com/listening",
    faqs: [
      {
        question: "Can I replay IELTS listening audio tracks?",
        answer:
          "You control playback to mimic exam pacing, but we recommend listening once to build real test stamina. Transcripts are available for review afterward."
      },
      {
        question: "What feedback do I get after finishing a section?",
        answer:
          "We tally your correct answers, highlight weak question types, and suggest listening strategies so you know exactly how to improve."
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
            <p style={{ color: themeStyles.theme.colors.textPrimary }}>Loading listening test...</p>
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
              <Headphones className="h-5 w-5" style={{ color: themeStyles.buttonPrimary }} />
              <span className="font-semibold text-lg">IELTS Listening Test</span>
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
          {/* Audio Player & Instructions */}
          <div>
            <Card className="mb-6" style={{
              backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
                  <Headphones className="h-5 w-5" />
                  {currentSection?.title}
                </CardTitle>
                <CardDescription style={{ color: themeStyles.textSecondary }}>
                  Section {currentSection?.section_number}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: themeStyles.textPrimary }}>{currentSection?.instructions}</p>

                  {currentSection?.audio_url ? (
                    <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: themeStyles.hoverBg }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAudio}
                        className="flex items-center gap-2"
                        style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {isPlaying ? 'Pause' : 'Play'} Audio
                      </Button>
                      <span className="text-sm" style={{ color: themeStyles.textSecondary }}>
                        Click play to start the listening section
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg" style={{
                      backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(234, 179, 8, 0.1)' : '#FEFCE8',
                      borderColor: themeStyles.theme.name === 'dark' ? 'rgba(234, 179, 8, 0.2)' : '#FEF08A'
                    }}>
                      <p className="text-sm" style={{ color: themeStyles.theme.name === 'dark' ? '#FDE047' : '#854D0E' }}>
                        Audio file not available. Please check the transcript below for content.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transcript (for reference) */}
            {currentSection?.transcript && (
              <Card style={{
                backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
                borderColor: themeStyles.border,
                backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
              }}>
                <CardHeader>
                  <CardTitle style={{ color: themeStyles.textPrimary }}>Transcript (for reference)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm leading-relaxed" style={{ color: themeStyles.textSecondary }}>
                    {currentSection.transcript.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-3">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                  Listen to the audio and answer all questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="border-b pb-4 last:border-b-0" style={{ borderColor: themeStyles.border }}>
                    <p className="font-medium mb-3" style={{ color: themeStyles.textPrimary }}>
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
                              className="text-green-600"
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

export default Listening;