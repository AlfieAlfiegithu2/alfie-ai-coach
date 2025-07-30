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

const Speaking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [useQuestionByQuestion, setUseQuestionByQuestion] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen glass-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-blue" />
          <p className="text-text-secondary">Loading speaking test...</p>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-1/30 to-primary/5">
      {/* Modern Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold text-text-primary">IELTS Speaking Practice</h1>
                  <p className="text-xs text-text-secondary">AI-Powered Speech Analysis</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 rounded-xl">
                <Clock className="w-4 h-4 text-primary" />
                <span className={`font-mono text-sm ${timeRemaining < 60 ? 'text-destructive' : 'text-text-primary'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={isTimerActive ? stopTimer : startTimer}
                  className="hover:bg-primary/10 border-primary/20"
                >
                  {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTimerActive ? 'Pause' : 'Start'}
                </Button>
                <Button variant="outline" size="sm" onClick={resetTimer} className="hover:bg-secondary/10 border-secondary/20">
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
          <Card className="bg-gradient-to-r from-background via-surface-1/50 to-background border border-border/60 shadow-lg">
            <CardHeader className="pb-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  IELTS Speaking Practice
                </CardTitle>
                <p className="text-text-secondary max-w-2xl mx-auto">
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
                    className={`flex flex-col h-auto p-6 min-w-[140px] transition-all duration-300 ${
                      currentPart === part 
                        ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                        : "hover:bg-primary/5 hover:border-primary/30 hover:scale-102"
                    }`}
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
                    className={`text-sm px-6 py-2 transition-all duration-300 ${
                      useQuestionByQuestion 
                        ? "bg-secondary/10 border-secondary/30 text-secondary" 
                        : "hover:bg-primary/5 hover:border-primary/30"
                    }`}
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
            <Card className="bg-gradient-to-br from-background to-surface-1/30 border border-border/60 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-medium text-text-primary flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
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
                      className="hover:bg-primary/10 border-primary/20"
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isPlayingPrompt ? 'Playing...' : 'Hear Question'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadRandomPrompt(currentPart)}
                      disabled={isAnalyzing || isPlayingPrompt}
                      className="hover:bg-secondary/10 border-secondary/20"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Question
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>{getPartDescription(currentPart)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 p-6 rounded-2xl">
                  <h3 className="font-semibold mb-4 text-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm">🎯</span>
                    Task Instructions
                  </h3>
                  <p className="leading-relaxed whitespace-pre-wrap text-text-primary">
                    {currentPrompt.prompt_text}
                  </p>
                  {currentPrompt.follow_up_questions && Array.isArray(currentPrompt.follow_up_questions) && currentPrompt.follow_up_questions.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-primary/20">
                      <h4 className="font-medium mb-3 text-primary flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center text-xs">💬</span>
                        Follow-up Questions
                      </h4>
                      <ul className="space-y-2">
                        {currentPrompt.follow_up_questions.map((question: string, index: number) => (
                          <li key={index} className="text-text-secondary flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="text-center py-4 bg-surface-1/50 rounded-xl">
                  <p className="text-text-secondary font-medium">
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
                  <div className="text-center py-12 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-primary" />
                    <h3 className="font-semibold text-lg text-text-primary mb-2">Analyzing Your Speech</h3>
                    <p className="text-text-secondary max-w-md mx-auto">
                      🔍 AI is evaluating pronunciation, fluency, intonation, and accent patterns to provide detailed feedback
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Transcription */}
          {transcription && !useQuestionByQuestion && (
            <Card className="bg-gradient-to-br from-secondary/5 to-background border border-secondary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-medium text-text-primary flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <span className="text-lg">📝</span>
                  </div>
                  Speech Transcription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-surface-1 to-surface-1/50 p-6 rounded-2xl border border-border/60">
                  <p className="text-text-primary leading-relaxed text-lg italic">"{transcription}"</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Analysis Results */}
          {analysis && !useQuestionByQuestion && (
            <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-medium text-text-primary flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  AI Speech Analysis & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-surface-1 to-surface-1/50 p-6 rounded-2xl border border-border/60">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed text-text-primary">
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