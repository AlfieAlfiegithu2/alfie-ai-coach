import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Speaking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentPart, setCurrentPart] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);

  const speakingPrompts = {
    1: "Let's talk about your hometown. Where are you from? What do you like about your hometown? Is there anything you would like to change about your hometown?",
    2: "Describe a book you have read recently. You should say: what the book was about, why you chose to read it, what you learned from it, and explain whether you would recommend it to others. You have one minute to prepare and up to two minutes to speak.",
    3: "Let's discuss reading habits in general. Do you think people read less than they used to? How do you think reading habits will change in the future? What are the benefits of reading books compared to watching videos?"
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
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
          prompt: speakingPrompts[currentPart as keyof typeof speakingPrompts],
          speakingPart: `Part ${currentPart}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setTranscription(data.transcription);
        setAnalysis(data.analysis);
        toast({
          title: "Analysis Complete",
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
                <Mic className="w-5 h-5 text-blue-deep" />
                <span className="font-semibold">Speaking Test</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>14:00</span>
              </div>
              <Button variant="hero" size="sm">
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Part Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">IELTS Academic Speaking Test</CardTitle>
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3].map((part) => (
                  <Button
                    key={part}
                    variant={currentPart === part ? "default" : "outline"}
                    onClick={() => {
                      setCurrentPart(part);
                      setAnalysis(null);
                      setTranscription(null);
                    }}
                    disabled={isAnalyzing}
                  >
                    Part {part}
                  </Button>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Current Task */}
          <Card>
            <CardHeader>
              <CardTitle>Speaking Part {currentPart}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-light/30 p-6 rounded-lg mb-6">
                <h3 className="font-semibold mb-3">Task Instructions:</h3>
                <p className="text-sm leading-relaxed">
                  {speakingPrompts[currentPart as keyof typeof speakingPrompts]}
                </p>
              </div>

              <AudioRecorder 
                onRecordingComplete={handleRecordingComplete}
                disabled={isAnalyzing}
              />

              {isAnalyzing && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Analyzing your speech for pronunciation, fluency, intonation, and accent patterns...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcription */}
          {transcription && (
            <Card>
              <CardHeader>
                <CardTitle>Transcription</CardTitle>
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
                <CardTitle>Detailed Speech Analysis</CardTitle>
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