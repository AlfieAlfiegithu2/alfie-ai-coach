import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Clock, ArrowLeft, Loader2, Volume2, RotateCcw, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSpeakingTest } from "@/hooks/useSpeakingTest";
import SpeakingQuestionByQuestion from "@/components/SpeakingQuestionByQuestion";
import VolumeSlider from "@/components/ui/VolumeSlider";
import SEO from "@/components/SEO";
import { useDashboardFont } from "@/hooks/useDashboardFont";
import { useThemeStyles } from '@/hooks/useThemeStyles';

const Speaking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [useQuestionByQuestion, setUseQuestionByQuestion] = useState(false);
  const dashboardFont = useDashboardFont();
  const themeStyles = useThemeStyles();

  const {
    currentPrompt,
    currentPart,
    timeRemaining,
    isTimerActive,
    isLoading,
    isPlayingPrompt,
    playPromptAudio,
    startTimer,
    stopTimer,
    resetTimer,
    changePart,
    formatTime,
    loadRandomPrompt,
  } = useSpeakingTest();

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const base64Audio = await convertBlobToBase64(audioBlob);

      const { data, error } = await supabase.functions.invoke('speech-analysis', {
        body: {
          audio: base64Audio,
          prompt: currentPrompt?.prompt_text || '',
          speakingPart: `Part ${currentPart}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setTranscription(data.transcription);
        setAnalysis(data.analysis);
        toast({
          title: "Analysis Complete ✨",
          description: "Your speech has been analyzed successfully!",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze your speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartRecording = () => {
    if (!isTimerActive) {
      startTimer();
    }
  };

  const handleQuestionByQuestionComplete = (responses: any[]) => {
    console.log('📝 Sequential Questions: Completed all questions with responses:', responses.length);
    toast({
      title: "Part Complete!",
      description: `All questions answered for Part ${currentPart}`,
    });

    // Switch back to regular mode
    setUseQuestionByQuestion(false);
  };

  const getPartDescription = (part: number) => {
    switch (part) {
      case 1:
        return "Introduction & Interview (4-5 minutes)";
      case 2:
        return "Long Turn (3-4 minutes, including 1 minute preparation)";
      case 3:
        return "Discussion (4-5 minutes)";
      default:
        return "";
    }
  };

  const seoProps = {
    title: "IELTS Speaking Practice | AI Examiner Feedback & Transcripts",
    description:
      "Record IELTS Speaking responses, get instant transcripts, fluency analytics, pronunciation tips, and follow-up questions built by real examiners.",
    keywords:
      "IELTS speaking practice, AI speaking examiner, IELTS speaking feedback, pronunciation analysis, IELTS speaking timer",
    type: "article",
    schemaType: "faq" as const,
    url: "https://englishaidol.com/speaking",
    faqs: [
      {
        question: "How does the AI evaluate my IELTS Speaking performance?",
        answer:
          "It listens to your recording, transcribes it, then scores Fluency, Lexical Resource, Grammar, and Pronunciation based on examiner rubrics, delivering actionable tips."
      },
      {
        question: "Can I practice Part 1, Part 2, and Part 3 questions?",
        answer:
          "Yes. Switch between all three parts, hear follow-up questions, and use the built-in timer to mimic the real interview experience."
      }
    ]
  };

  const isNoteTheme = themeStyles.theme.name === 'note' || themeStyles.theme.name === 'glassmorphism';
  const isGlassmorphism = false;

  if (isLoading) {
    return (
      <>
        <SEO {...seoProps} />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: themeStyles.buttonPrimary }} />
            <p style={{ color: themeStyles.textSecondary }}>Loading speaking test...</p>
          </div>
        </div>
      </>
    );
  }

  if (!currentPrompt) {
    return (
      <>
        <SEO {...seoProps} />
        <div className="min-h-screen glass-background flex items-center justify-center">
          <div className="text-center glass-card p-8 rounded-2xl max-w-md">
            <Mic className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h2 className="text-heading-2 mb-2 text-text-primary">No Speaking Test Available</h2>
            <p className="text-text-secondary mb-6">
              No speaking prompts found for this test. Please check with your instructor to upload content.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/tests')} className="w-full btn-primary">
                Browse Other Tests
              </Button>
            </div>
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

      {/* Modern Header */}
      <header className="relative z-10 border-b shadow-sm" style={{
        backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : (themeStyles.theme.name === 'dark' ? 'rgba(23, 23, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)'),
        borderColor: themeStyles.border,
        backdropFilter: 'blur(12px)'
      }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="hover:bg-primary/10"
                style={{ color: themeStyles.textPrimary }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: themeStyles.hoverBg }}>
                  <Mic className="w-5 h-5" style={{ color: themeStyles.buttonPrimary }} />
                </div>
                <div>
                  <h1 className="font-semibold" style={{ color: themeStyles.textPrimary }}>IELTS Speaking Practice</h1>
                  <p className="text-xs" style={{ color: themeStyles.textSecondary }}>AI-Powered Speech Analysis</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <VolumeSlider defaultValue={50} className="w-32" />
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: themeStyles.hoverBg }}>
                <Clock className="w-4 h-4" style={{ color: themeStyles.chartTarget }} />
                <span className={`font-mono text-sm ${timeRemaining < 60 ? 'text-destructive' : ''}`} style={{ color: timeRemaining >= 60 ? themeStyles.textPrimary : undefined }}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isTimerActive ? stopTimer : startTimer}
                  className="border-primary/20"
                  style={{
                    borderColor: themeStyles.border,
                    color: themeStyles.textPrimary,
                    backgroundColor: 'transparent'
                  }}
                >
                  {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTimerActive ? 'Pause' : 'Start'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetTimer}
                  className="border-secondary/20"
                  style={{
                    borderColor: themeStyles.border,
                    color: themeStyles.textPrimary,
                    backgroundColor: 'transparent'
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Modern Part Selection */}
          <Card
            className="border shadow-lg"
            style={{
              background: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
            }}
          >
            <CardHeader className="pb-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-4" style={{ backgroundColor: themeStyles.hoverBg }}>
                  <Mic className="w-8 h-8" style={{ color: themeStyles.buttonPrimary }} />
                </div>
                <CardTitle className="text-3xl font-medium bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${themeStyles.buttonPrimary}, ${themeStyles.chartTarget})` }}>
                  IELTS Speaking Practice
                </CardTitle>
                <p className="max-w-2xl mx-auto" style={{ color: themeStyles.textSecondary }}>
                  Experience an authentic IELTS speaking test with advanced AI analysis and instant feedback
                </p>
              </div>

              <div className="flex justify-center gap-3 mt-8">
                {[1, 2, 3].map((part) => (
                  <Button
                    key={part}
                    variant={currentPart === part ? "default" : "outline"}
                    onClick={() => changePart(part)}
                    disabled={isAnalyzing || isPlayingPrompt}
                    className={`flex flex-col h-auto p-6 min-w-[140px] transition-all duration-300 ${currentPart === part
                      ? "shadow-lg scale-105"
                      : "hover:scale-102"
                      }`}
                    style={{
                      backgroundColor: currentPart === part ? themeStyles.buttonPrimary : 'transparent',
                      color: currentPart === part ? '#fff' : themeStyles.textPrimary,
                      borderColor: themeStyles.border
                    }}
                  >
                    <span className="font-semibold text-lg">Part {part}</span>
                    <span className="text-xs opacity-75 mt-1 text-center leading-tight">
                      {getPartDescription(part).split('(')[0].trim()}
                    </span>
                    <span className="text-xs opacity-60 mt-1">
                      {getPartDescription(part).match(/\((.*?)\)/)?.[1] || ''}
                    </span>
                  </Button>
                ))}
              </div>

              {/* Enhanced Question Mode Toggle */}
              {(currentPart === 1 || currentPart === 3) && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setUseQuestionByQuestion(!useQuestionByQuestion)}
                    className="text-sm px-6 py-2 transition-all duration-300"
                    style={{
                      backgroundColor: useQuestionByQuestion ? themeStyles.hoverBg : 'transparent',
                      borderColor: themeStyles.border,
                      color: useQuestionByQuestion ? themeStyles.textPrimary : themeStyles.textSecondary
                    }}
                  >
                    {useQuestionByQuestion ? '📝 Switch to Free Practice' : '🎯 One Question at a Time'}
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Question by Question Mode for Parts 1 and 3 */}
          {(currentPart === 1 || currentPart === 3) && useQuestionByQuestion && (
            <SpeakingQuestionByQuestion
              partNumber={currentPart}
              onComplete={handleQuestionByQuestionComplete}
            />
          )}

          {/* Enhanced Current Task - Regular Mode */}
          {currentPrompt && !useQuestionByQuestion && (
            <Card
              className="border shadow-lg"
              style={{
                background: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
                borderColor: themeStyles.border,
                backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
              }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-medium flex items-center gap-3" style={{ color: themeStyles.textPrimary }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeStyles.hoverBg }}>
                      <span className="text-lg">📝</span>
                    </div>
                    {currentPrompt.title} - Part {currentPart}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playPromptAudio(currentPrompt.prompt_text)}
                      disabled={isPlayingPrompt}
                      className="border-primary/20"
                      style={{
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary,
                        backgroundColor: 'transparent'
                      }}
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isPlayingPrompt ? 'Playing...' : 'Hear Question'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadRandomPrompt(currentPart)}
                      disabled={isAnalyzing || isPlayingPrompt}
                      className="border-secondary/20"
                      style={{
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary,
                        backgroundColor: 'transparent'
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Question
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: themeStyles.textSecondary }}>
                  <Clock className="w-4 h-4" />
                  <span>{getPartDescription(currentPart)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: themeStyles.hoverBg, borderColor: themeStyles.border }}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.buttonPrimary }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>🎯</span>
                    Task Instructions
                  </h3>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: themeStyles.textPrimary }}>
                    {currentPrompt.prompt_text}
                  </p>
                  {currentPrompt.follow_up_questions && Array.isArray(currentPrompt.follow_up_questions) && currentPrompt.follow_up_questions.length > 0 && (
                    <div className="mt-6 pt-4 border-t" style={{ borderColor: themeStyles.border }}>
                      <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: themeStyles.buttonPrimary }}>
                        <span className="w-5 h-5 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>💬</span>
                        Follow-up Questions
                      </h4>
                      <ul className="space-y-2">
                        {currentPrompt.follow_up_questions.map((question: string, index: number) => (
                          <li key={index} className="flex items-start gap-2" style={{ color: themeStyles.textSecondary }}>
                            <span className="mt-1" style={{ color: themeStyles.buttonPrimary }}>•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="text-center py-4 rounded-xl" style={{ backgroundColor: themeStyles.hoverBg }}>
                  <p className="font-medium" style={{ color: themeStyles.textSecondary }}>
                    {currentPart === 2 ? "🕐 You have 1 minute to prepare, then speak for up to 2 minutes" :
                      currentPart === 1 ? "💬 Speak naturally for 4-5 minutes" :
                        "🗣️ Engage in discussion for 4-5 minutes"}
                  </p>
                </div>

                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  disabled={isAnalyzing}
                />

                {isAnalyzing && (
                  <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: themeStyles.hoverBg }}>
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6" style={{ color: themeStyles.buttonPrimary }} />
                    <h3 className="font-semibold text-lg mb-2" style={{ color: themeStyles.textPrimary }}>Analyzing Your Speech</h3>
                    <p className="max-w-md mx-auto" style={{ color: themeStyles.textSecondary }}>
                      🔍 AI is evaluating pronunciation, fluency, intonation, and accent patterns to provide detailed feedback
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Transcription */}
          {transcription && !useQuestionByQuestion && (
            <Card
              className="border shadow-lg"
              style={{
                background: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
                borderColor: themeStyles.border,
                backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
              }}
            >
              <CardHeader>
                <CardTitle className="text-xl font-medium flex items-center gap-3" style={{ color: themeStyles.textPrimary }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeStyles.hoverBg }}>
                    <span className="text-lg">📝</span>
                  </div>
                  Speech Transcription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: themeStyles.hoverBg, borderColor: themeStyles.border }}>
                  <p className="leading-relaxed text-lg italic" style={{ color: themeStyles.textPrimary }}>"{transcription}"</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Analysis Results */}
          {analysis && !useQuestionByQuestion && (
            <Card
              className="border shadow-lg"
              style={{
                background: isGlassmorphism ? 'rgba(255,255,255,0.6)' : themeStyles.cardBackground,
                borderColor: themeStyles.border,
                backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined
              }}
            >
              <CardHeader>
                <CardTitle className="text-xl font-medium flex items-center gap-3" style={{ color: themeStyles.textPrimary }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeStyles.hoverBg }}>
                    <span className="text-lg">🎯</span>
                  </div>
                  AI Speech Analysis & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: themeStyles.hoverBg, borderColor: themeStyles.border }}>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed" style={{ color: themeStyles.textPrimary }}>
                      {analysis}
                    </div>
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

export default Speaking;