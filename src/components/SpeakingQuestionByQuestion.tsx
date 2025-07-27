import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Volume2, RotateCcw, ArrowRight, ArrowLeft } from "lucide-react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface SpeakingPrompt {
  id: string;
  title: string;
  prompt_text: string;
  part_number: number;
  time_limit: number;
  follow_up_questions?: any;
  sample_answer?: string;
  band_criteria?: any;
}

interface SpeakingQuestionByQuestionProps {
  partNumber: number;
  onComplete: (responses: any[]) => void;
}

const SpeakingQuestionByQuestion = ({ partNumber, onComplete }: SpeakingQuestionByQuestionProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<SpeakingPrompt[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const [savedAudioUrls, setSavedAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchQuestions();
  }, [partNumber]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('speaking_prompts')
        .select('*')
        .eq('part_number', partNumber)
        .order('id');

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedQuestions = data.map(item => ({
          ...item,
          follow_up_questions: Array.isArray(item.follow_up_questions) ? item.follow_up_questions : []
        }));
        setQuestions(formattedQuestions);
      } else {
        toast({
          title: "No questions available",
          description: `No speaking questions found for Part ${partNumber}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error loading questions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const playPromptAudio = async (text: string, questionId: string) => {
    if (!text) return;
    
    setIsPlayingPrompt(true);
    try {
      // Check if we have saved audio for this question
      if (savedAudioUrls[questionId]) {
        console.log('🔄 Efficient Voice: Reusing saved audio for question', questionId);
        const audio = new Audio(savedAudioUrls[questionId]);
        audio.onended = () => setIsPlayingPrompt(false);
        audio.onerror = () => {
          setIsPlayingPrompt(false);
          toast({
            title: "Audio playback failed",
            description: "Could not play the saved question audio",
            variant: "destructive",
          });
        };
        await audio.play();
        return;
      }

      // Generate and save audio
      console.log('🎵 Efficient Voice: Generating and saving audio for question', questionId);
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'alloy' }
      });

      if (error) throw error;

      if (data.success) {
        const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
        
        // Save for reuse
        setSavedAudioUrls(prev => ({
          ...prev,
          [questionId]: audioUrl
        }));
        
        console.log('💾 Efficient Voice: Audio saved for reuse, reducing API costs');
        
        // Create audio element and play
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlayingPrompt(false);
        audio.onerror = () => {
          setIsPlayingPrompt(false);
          toast({
            title: "Audio playback failed",
            description: "Could not play the question audio",
            variant: "destructive",
          });
        };
        await audio.play();
      }
    } catch (error: any) {
      console.error('TTS error:', error);
      setIsPlayingPrompt(false);
      toast({
        title: "Voice generation failed",
        description: "Could not generate question audio",
        variant: "destructive",
      });
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    const currentQuestion = questions[currentQuestionIndex];
    const response = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.prompt_text,
      audioBlob,
      timestamp: new Date().toISOString()
    };

    const newResponses = [...responses];
    newResponses[currentQuestionIndex] = response;
    setResponses(newResponses);

    toast({
      title: "Response recorded",
      description: "Your answer has been saved successfully!",
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Complete the part
      onComplete(responses);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gentle-blue mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No questions available for Part {partNumber}</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasResponse = responses[currentQuestionIndex];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="font-georgia">
              📝 Part {partNumber} - Question {currentQuestionIndex + 1} of {questions.length}
            </CardTitle>
            <Badge variant="outline">
              {currentQuestion.time_limit} minutes
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playPromptAudio(currentQuestion.prompt_text, currentQuestion.id)}
              disabled={isPlayingPrompt}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              {isPlayingPrompt ? 'Playing...' : 'Hear Question'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Question */}
          <div className="bg-gentle-blue/10 border border-gentle-blue/20 p-6 rounded-lg">
            <h3 className="font-semibold mb-3 text-gentle-blue">🎯 Question:</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {currentQuestion.prompt_text}
            </p>
            {currentQuestion.follow_up_questions && Array.isArray(currentQuestion.follow_up_questions) && currentQuestion.follow_up_questions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gentle-blue/20">
                <h4 className="font-medium mb-2 text-gentle-blue">Follow-up questions:</h4>
                <ul className="text-sm space-y-1">
                  {currentQuestion.follow_up_questions.map((question: string, index: number) => (
                    <li key={index} className="text-muted-foreground">• {question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Audio Recorder */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">🎤 Record your answer:</h4>
            <AudioRecorder 
              onRecordingComplete={handleRecordingComplete}
              disabled={false}
            />
            {hasResponse && (
              <div className="mt-3 text-sm text-green-600 flex items-center gap-2">
                ✅ Response recorded for this question
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            
            <Button
              onClick={handleNext}
              disabled={!hasResponse}
              variant={isLastQuestion ? "default" : "outline"}
            >
              {isLastQuestion ? (
                <>Complete Part {partNumber}</>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeakingQuestionByQuestion;