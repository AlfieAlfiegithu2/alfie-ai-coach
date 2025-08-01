import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Headphones, Play, Pause, CheckCircle, XCircle, Eye, EyeOff, Volume2, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import StudentLayout from '@/components/StudentLayout';

interface ListeningSection {
  id: string;
  title: string;
  section_number: number;
  instructions: string;
  audio_url: string;
  transcript: string;
  photo_url?: string;
  cambridge_book?: string;
  test_number?: number;
}

interface ListeningQuestion {
  id: string;
  question_text: string;
  question_number: number;
  options?: string[];
  correct_answer: string;
  question_type: string;
  explanation: string;
  section_id: string;
}

const ListeningTest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { testId } = useParams();
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [currentSection, setCurrentSection] = useState<ListeningSection | null>(null);
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentPart, setCurrentPart] = useState(1);
  const [completedParts, setCompletedParts] = useState<number[]>([]);
  const [allPartsData, setAllPartsData] = useState<{[key: number]: {section: ListeningSection, questions: ListeningQuestion[]}}>({});

  useEffect(() => {
    fetchListeningTest();
  }, [testId]);

  useEffect(() => {
    if (!isSubmitted) {
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
    }
  }, [isSubmitted]);

  // Reset test data on component mount (start fresh)
  useEffect(() => {
    console.log('🔄 Fresh Start: Clearing any saved test data for fresh test experience');
    localStorage.removeItem(`listening_test_${testId}_answers`);
  }, [testId]);

  const fetchListeningTest = async () => {
    try {
      // Start fresh - no saved answers loaded
      console.log('🔄 Fresh Start: Starting test with no saved answers for clean experience');

      // For now, show a message that listening tests need to be updated
      setLoading(false);
      
      // Create a placeholder section with sample content
      const placeholderSection = {
        id: 'placeholder',
        title: 'Listening Test Coming Soon',
        section_number: 1,
        instructions: 'Listening tests are being updated to the new system. Please check back soon!',
        audio_url: null,
        transcript: '',
        cambridge_book: 'Coming Soon',
        part_number: 1,
        test_number: 1
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

  const calculateScore = () => {
    return questions.reduce((score, question) => {
      return answers[question.id] === question.correct_answer ? score + 1 : score;
    }, 0);
  };

  const handleGoToNextPart = () => {
    // Mark current part as completed
    setCompletedParts(prev => [...prev, currentPart]);
    
    // Check if this is the final part (Part 4 for Listening)
    if (currentPart >= 4) {
      handleSubmit();
      return;
    }

    // Go to next part
    const nextPart = currentPart + 1;
    setCurrentPart(nextPart);
    
    // Load next part data or fetch if needed
    if (allPartsData[nextPart]) {
      setCurrentSection(allPartsData[nextPart].section);
      setQuestions(allPartsData[nextPart].questions);
    } else {
      // Fetch next part
      fetchPartData(nextPart);
    }
    
    console.log(`📝 Sequential Flow: Moving from Part ${currentPart} to Part ${nextPart}`);
  };

  const handleSubmit = () => {
    if (!isSubmitted) {
      if (audio) {
        audio.pause();
      }
      
      // Calculate score from all completed parts
      let totalScore = 0;
      let totalQuestions = 0;
      
      // Add current part to completed parts for final calculation
      const allParts = [...completedParts, currentPart];
      allParts.forEach(partNum => {
        if (allPartsData[partNum]) {
          const partQuestions = allPartsData[partNum].questions;
          totalQuestions += partQuestions.length;
          partQuestions.forEach(q => {
            if (answers[q.id] === q.correct_answer) {
              totalScore++;
            }
          });
        }
      });
      
      // Include current questions if not in allPartsData
      if (!allPartsData[currentPart]) {
        totalQuestions += questions.length;
        questions.forEach(q => {
          if (answers[q.id] === q.correct_answer) {
            totalScore++;
          }
        });
      }

      setScore(totalScore);
      setIsSubmitted(true);
      setShowConfirmDialog(false);
      localStorage.removeItem(`listening_test_${testId}_answers`);
      
      console.log('🎯 Sequential Flow: Listening test completed with all parts. Final score:', totalScore, 'out of', totalQuestions, 'questions');
      
      toast({
        title: "Test Submitted!",
        description: `You scored ${totalScore}/${totalQuestions} (${Math.round((totalScore/totalQuestions)*100)}%)`,
      });
    }
  };

  const fetchPartData = async (partNumber: number) => {
    // Implementation for fetching specific part data
    console.log(`🔍 Sequential Flow: Fetching data for Part ${partNumber}`);
  };

  const getBandScore = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return "9.0";
    if (percentage >= 80) return "8.0-8.5";
    if (percentage >= 70) return "7.0-7.5";
    if (percentage >= 60) return "6.0-6.5";
    if (percentage >= 50) return "5.0-5.5";
    if (percentage >= 40) return "4.0-4.5";
    if (percentage >= 30) return "3.5-4.0";
    if (percentage >= 20) return "3.0-3.5";
    if (percentage >= 10) return "2.0-3.0";
    if (percentage >= 5) return "1.0-2.0";
    if (percentage > 0) return "0.5-1.0";
    return "0";
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <StudentLayout title="Loading Test...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading listening test...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Listening Test" showBackButton backPath="/tests">
      <div className="max-w-7xl mx-auto p-6">
        {/* Test Header */}
        <div className="mb-6 p-4 rounded-xl border-light-border" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Headphones className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-georgia font-bold text-foreground">
                  {currentSection?.title}
                </h1>
                <div className="flex gap-3 mt-1">
                  {currentSection?.cambridge_book && (
                    <Badge variant="outline">{currentSection.cambridge_book}</Badge>
                  )}
                  {currentSection?.test_number && (
                    <Badge variant="outline">Test {currentSection.test_number}</Badge>
                  )}
                  {currentSection?.section_number && (
                    <Badge variant="outline">Section {currentSection.section_number}</Badge>
                  )}
                  
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {!isSubmitted && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-mono text-orange-600 font-medium">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              
              {isSubmitted && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{score}/{questions.length}</div>
                  <div className="text-sm text-warm-gray">Band {getBandScore(score, questions.length)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
          {/* Left Column: Audio Player + Instructions + Questions */}
          <div className="lg:col-span-2 flex flex-col gap-4 h-full">
            {/* Audio Player & Instructions */}
            <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader>
                <CardTitle className="font-georgia text-foreground flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Audio Player
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-foreground">{currentSection?.instructions}</p>
                  
                  {currentSection?.audio_url ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-light-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleAudio}
                          disabled={isSubmitted}
                          className="flex items-center gap-2 rounded-xl"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {isPlaying ? 'Pause' : 'Play'}
                        </Button>
                        
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-warm-gray mb-1">
                            <span>{formatAudioTime(audioCurrentTime)}</span>
                            <span>{formatAudioTime(audioDuration)}</span>
                          </div>
                          <div className="w-full bg-light-border rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: audioDuration ? `${(audioCurrentTime / audioDuration) * 100}%` : '0%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm text-yellow-800">
                        Audio file not available. Please check the transcript below for content.
                      </p>
                    </div>
                   )}

                   {/* Photo/Visual (if available) */}
                   {currentSection?.photo_url && (
                     <div className="space-y-2">
                       <h4 className="text-sm font-medium text-foreground">Visual Reference:</h4>
                       <img 
                         src={currentSection.photo_url} 
                         alt="Listening test visual" 
                         className="w-full max-w-lg mx-auto rounded-lg border border-light-border"
                       />
                     </div>
                   )}
                 </div>
               </CardContent>
             </Card>

            {/* Questions */}
            <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader>
                <CardTitle className="font-georgia text-foreground">Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="border-b border-light-border pb-6 last:border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-medium text-foreground">
                        {question.question_number}. {question.question_text}
                      </p>
                      {isSubmitted && (
                        <div className="ml-4">
                          {answers[question.id] === question.correct_answer ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {question.question_type === 'multiple_choice' && question.options ? (
                      <div className="space-y-2">
                        {question.options.map((option: string, index: number) => (
                          <label key={index} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`question_${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              disabled={isSubmitted}
                              className="text-primary"
                            />
                            <span className={`text-sm ${isSubmitted && answers[question.id] === option && option !== question.correct_answer ? 'text-red-600' : isSubmitted && option === question.correct_answer ? 'text-green-600 font-medium' : 'text-foreground'}`}>
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Type your answer here"
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={isSubmitted}
                          className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${
                            isSubmitted 
                              ? answers[question.id] === question.correct_answer 
                                ? 'border-green-500 bg-green-50 text-green-800' 
                                : 'border-red-500 bg-red-50 text-red-800'
                              : 'border-light-border focus:ring-primary/20 bg-background text-foreground'
                          }`}
                        />
                        {isSubmitted && (
                          <p className="text-sm text-green-600 font-medium">
                            Correct answer: {question.correct_answer}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {isSubmitted && showExplanations && question.explanation && (
                      <div className="mt-3 p-3 bg-gentle-blue/10 rounded-xl">
                        <p className="text-sm text-foreground">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Transcript (if available and submitted) */}
            {isSubmitted && currentSection?.transcript && (
              <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
                <CardHeader>
                  <CardTitle className="font-georgia text-foreground">Audio Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm leading-relaxed text-foreground">
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

          {/* Right Column: Answer Sheet */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader>
                <CardTitle className="font-georgia text-foreground">Answer Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {questions.map((question) => (
                    <div key={question.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                      <span className="text-sm font-medium text-warm-gray w-6">
                        {question.question_number}.
                      </span>
                      <div className={`flex-1 p-2 text-xs rounded border ${
                        isSubmitted 
                          ? answers[question.id] === question.correct_answer 
                            ? 'border-green-500 bg-green-50 text-green-800' 
                            : 'border-red-500 bg-red-50 text-red-800'
                          : answers[question.id] 
                            ? 'border-primary bg-primary/5 text-foreground' 
                            : 'border-light-border bg-background text-warm-gray'
                      }`}>
                        {answers[question.id] || '—'}
                      </div>
                      {isSubmitted && (
                        <div className="w-4">
                          {answers[question.id] === question.correct_answer ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {!isSubmitted ? (
                  <div className="mt-4 space-y-3">
                    {/* Progress Indicator */}
                    <div className="flex justify-center">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map(partNum => (
                          <div 
                            key={partNum}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              completedParts.includes(partNum) 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : partNum === currentPart 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            {completedParts.includes(partNum) ? '✓' : partNum}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {currentPart < 4 ? (
                      <Button 
                        onClick={handleGoToNextPart}
                        className="w-full rounded-xl"
                        style={{ background: 'var(--gradient-button)', border: 'none' }}
                        disabled={Object.keys(answers).filter(key => questions.some(q => q.id === key)).length === 0}
                      >
                        Go to Part {currentPart + 1}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setShowConfirmDialog(true)}
                        className="w-full rounded-xl"
                        style={{ background: 'var(--gradient-button)', border: 'none' }}
                        disabled={Object.keys(answers).filter(key => questions.some(q => q.id === key)).length === 0}
                      >
                        Submit Test
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Button 
                      onClick={() => setShowExplanations(!showExplanations)}
                      variant="outline"
                      className="w-full rounded-xl border-light-border"
                    >
                      {showExplanations ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showExplanations ? 'Hide' : 'Show'} Explanations
                    </Button>
                    
                    <Button 
                      onClick={() => navigate('/tests')}
                      className="w-full rounded-xl"
                      style={{ background: 'var(--gradient-button)', border: 'none' }}
                    >
                      Take Another Test
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl border-light-border">
          <DialogHeader>
            <DialogTitle className="font-georgia">Submit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? You won't be able to change your answers after submission.
              <br /><br />
              <strong>Questions answered:</strong> {Object.keys(answers).filter(key => answers[key]).length} / {questions.length}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              className="rounded-xl border-light-border"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="rounded-xl"
              style={{ background: 'var(--gradient-button)', border: 'none' }}
            >
              Submit Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default ListeningTest;