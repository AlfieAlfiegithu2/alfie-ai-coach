import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Clock, ArrowLeft, Loader2, Volume2, RotateCcw, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSpeakingTest } from "@/hooks/useSpeakingTest";

const Speaking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading speaking test questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-gentle-blue" />
                <span className="font-semibold">IELTS Speaking Test</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className={`font-mono ${timeRemaining < 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={isTimerActive ? stopTimer : startTimer}
                >
                  {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTimerActive ? 'Pause' : 'Start'}
                </Button>
                <Button variant="outline" size="sm" onClick={resetTimer}>
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
          {/* Part Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl font-georgia">🎤 IELTS Academic Speaking Test</CardTitle>
              <p className="text-center text-muted-foreground">Experience an authentic IELTS speaking test with AI analysis</p>
              <div className="flex justify-center gap-2 mt-6">
                {[1, 2, 3].map((part) => (
                  <Button
                    key={part}
                    variant={currentPart === part ? "default" : "outline"}
                    onClick={() => changePart(part)}
                    disabled={isAnalyzing || isPlayingPrompt}
                    className="flex flex-col h-auto p-4"
                  >
                    <span className="font-semibold">Part {part}</span>
                    <span className="text-xs opacity-75">{getPartDescription(part).split('(')[0]}</span>
                  </Button>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Current Task */}
          {currentPrompt && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-georgia">
                    📝 {currentPrompt.title} - Part {currentPart}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playPromptAudio(currentPrompt.prompt_text)}
                      disabled={isPlayingPrompt}
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isPlayingPrompt ? 'Playing...' : 'Hear Question'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadRandomPrompt(currentPart)}
                      disabled={isAnalyzing || isPlayingPrompt}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Question
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{getPartDescription(currentPart)}</p>
              </CardHeader>
              <CardContent>
                <div className="bg-gentle-blue/10 border border-gentle-blue/20 p-6 rounded-lg mb-6">
                  <h3 className="font-semibold mb-3 text-gentle-blue">🎯 Task Instructions:</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {currentPrompt.prompt_text}
                  </p>
                  {currentPrompt.follow_up_questions && Array.isArray(currentPrompt.follow_up_questions) && currentPrompt.follow_up_questions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gentle-blue/20">
                      <h4 className="font-medium mb-2 text-gentle-blue">Follow-up questions:</h4>
                      <ul className="text-sm space-y-1">
                        {currentPrompt.follow_up_questions.map((question: string, index: number) => (
                          <li key={index} className="text-muted-foreground">• {question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {currentPart === 2 ? "You have 1 minute to prepare, then speak for up to 2 minutes" : 
                     currentPart === 1 ? "Speak naturally for 4-5 minutes" : 
                     "Engage in discussion for 4-5 minutes"}
                  </p>
                </div>

                <AudioRecorder 
                  onRecordingComplete={handleRecordingComplete}
                  disabled={isAnalyzing}
                />

                {isAnalyzing && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gentle-blue" />
                    <p className="text-muted-foreground">
                      🔍 Analyzing your speech for pronunciation, fluency, intonation, and accent patterns...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transcription */}
          {transcription && (
            <Card>
              <CardHeader>
                <CardTitle className="font-georgia">📝 What You Said</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="italic">"{transcription}"</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="font-georgia">🎯 Detailed Speech Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {analysis}
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