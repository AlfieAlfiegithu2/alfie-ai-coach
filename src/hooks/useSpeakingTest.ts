import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface SpeakingPrompt {
  id: string;
  title: string;
  prompt_text: string;
  part_number: number;
  time_limit: number;
  follow_up_questions?: any; // Json type from Supabase
  sample_answer?: string;
  band_criteria?: any; // Json type from Supabase
}

export const useSpeakingTest = () => {
  const [currentPrompt, setCurrentPrompt] = useState<SpeakingPrompt | null>(null);
  const [currentPart, setCurrentPart] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const { toast } = useToast();

  // Load random prompt for current part
  const loadRandomPrompt = useCallback(async (partNumber: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('speaking_prompts')
        .select('*')
        .eq('part_number', partNumber);

      if (error) throw error;

      if (data && data.length > 0) {
        // Select random prompt
        const randomPrompt = data[Math.floor(Math.random() * data.length)];
        setCurrentPrompt(randomPrompt);
        setTimeRemaining(randomPrompt.time_limit * 60); // Convert minutes to seconds
        
        // Auto-play the prompt
        await playPromptAudio(randomPrompt.prompt_text);
      } else {
        toast({
          title: "No questions available",
          description: `No speaking questions found for Part ${partNumber}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error loading prompt:', error);
      toast({
        title: "Error loading question",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Play prompt audio using TTS
  const playPromptAudio = async (text: string) => {
    if (!text) return;
    
    setIsPlayingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'alloy' }
      });

      if (error) throw error;

      if (data.success) {
        // Create audio element and play
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
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

  // Timer management
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            toast({
              title: "Time's up!",
              description: "The time limit for this part has been reached.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining, toast]);

  // Start timer
  const startTimer = () => {
    setIsTimerActive(true);
  };

  // Stop timer
  const stopTimer = () => {
    setIsTimerActive(false);
  };

  // Reset timer
  const resetTimer = () => {
    setIsTimerActive(false);
    if (currentPrompt) {
      setTimeRemaining(currentPrompt.time_limit * 60);
    }
  };

  // Change part and load new prompt
  const changePart = async (partNumber: number) => {
    setCurrentPart(partNumber);
    setIsTimerActive(false);
    await loadRandomPrompt(partNumber);
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load initial prompt
  useEffect(() => {
    loadRandomPrompt(1);
  }, [loadRandomPrompt]);

  return {
    currentPrompt,
    currentPart,
    timeRemaining,
    isTimerActive,
    isLoading,
    isPlayingPrompt,
    loadRandomPrompt,
    playPromptAudio,
    startTimer,
    stopTimer,
    resetTimer,
    changePart,
    formatTime,
  };
};