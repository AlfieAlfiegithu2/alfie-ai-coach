import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Headphones, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading listening test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-lg">IELTS Listening Test</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-mono text-orange-600 font-medium">
                {formatTime(timeLeft)}
              </span>
            </div>
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              Submit Test
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audio Player & Instructions */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  {currentSection?.title}
                </CardTitle>
                <CardDescription>
                  Section {currentSection?.section_number}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm">{currentSection?.instructions}</p>
                  
                  {currentSection?.audio_url ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAudio}
                        className="flex items-center gap-2"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {isPlaying ? 'Pause' : 'Play'} Audio
                      </Button>
                      <span className="text-sm text-gray-600">
                        Click play to start the listening section
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Audio file not available. Please check the transcript below for content.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transcript (for reference) */}
            {currentSection?.transcript && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript (for reference)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm leading-relaxed text-gray-600">
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
            <Card>
              <CardHeader>
                <CardTitle>Questions ({questions.length})</CardTitle>
                <CardDescription>
                  Listen to the audio and answer all questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="border-b pb-4 last:border-b-0">
                    <p className="font-medium mb-3">
                      {question.question_number}. {question.question_text}
                    </p>
                    
                    {question.question_type === 'multiple_choice' && question.options ? (
                      <div className="space-y-2">
                        {question.options.map((option, index) => (
                          <label key={index} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`question_${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="text-green-600"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Type your answer here"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
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