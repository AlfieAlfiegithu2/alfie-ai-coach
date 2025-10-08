import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, PenTool, BookOpen } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";

const WritingTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { listContent } = useAdminContent();
  const { toast } = useToast();
  
  const [prompts, setPrompts] = useState<any[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<any>(null);
  const [writingText, setWritingText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [selectedTask, setSelectedTask] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [selectedAPI, setSelectedAPI] = useState<'gemini' | 'openai'>('gemini');

  // Get URL parameters for specific test/book - support both search params and URL params
  const cambridgeBook = params.book || searchParams.get('book') || 'C19';
  const testNumber = params.test || searchParams.get('test') || '1';

  useEffect(() => {
    loadWritingPrompts();
  }, [cambridgeBook, testNumber]);

  const loadWritingPrompts = async () => {
    try {
      setLoading(true);
      console.log(`📚 Loading writing prompts for ${cambridgeBook}, Test ${testNumber}`);
      
      const result = await listContent('writing_prompts');
      const allPrompts = result.data || [];
      
      // Filter prompts by Cambridge book and test number with debug logging
      console.log(`🔍 All prompts:`, allPrompts.map(p => ({
        id: p.id,
        title: p.title,
        cambridge_book: p.cambridge_book,
        test_number: p.test_number
      })));
      
      const filteredPrompts = allPrompts.filter((prompt: any) => {
        const matches = prompt.cambridge_book === cambridgeBook && 
                       prompt.test_number === parseInt(testNumber);
        if (matches) {
          console.log(`✅ Match found:`, {
            title: prompt.title,
            cambridge_book: prompt.cambridge_book,
            test_number: prompt.test_number
          });
        }
        return matches;
      });
      
      console.log(`✅ Found ${filteredPrompts.length} writing prompts for ${cambridgeBook}, Test ${testNumber}`);
      
      // If no prompts found for exact match, check for similar matches
      if (filteredPrompts.length === 0) {
        console.log(`❌ No exact matches found. Checking for similar patterns...`);
        const similarPrompts = allPrompts.filter((prompt: any) => 
          prompt.cambridge_book?.includes('19') || 
          prompt.cambridge_book?.includes('C19') ||
          prompt.test_number === parseInt(testNumber)
        );
        console.log(`🔍 Similar prompts found:`, similarPrompts.map(p => ({
          title: p.title,
          cambridge_book: p.cambridge_book,
          test_number: p.test_number
        })));
      }
      
      if (filteredPrompts.length === 0) {
        toast({
          title: "No Writing Prompts Found",
          description: `No writing prompts available for ${cambridgeBook}, Test ${testNumber}. Please check the admin panel.`,
          variant: "destructive"
        });
      }
      
      setPrompts(filteredPrompts);
      
      // Set default prompt (Task 1 if available, otherwise first prompt)
      const task1Prompt = filteredPrompts.find((p: any) => p.task_type === 'task1');
      setCurrentPrompt(task1Prompt || filteredPrompts[0] || null);
      
    } catch (error: any) {
      console.error('❌ Error loading writing prompts:', error);
      toast({
        title: "Error Loading Prompts",
        description: "Failed to load writing prompts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskChange = (taskType: string) => {
    const prompt = prompts.find((p: any) => p.task_type === taskType);
    if (prompt) {
      setCurrentPrompt(prompt);
      setSelectedTask(parseInt(taskType.replace('task', '')));
      setWritingText("");
      setFeedback(null);
      setWordCount(0);
    }
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
      console.log('🤖 Requesting AI feedback for writing...');
      
      const { data, error } = await supabase.functions.invoke('ielts-writing-examiner', {
        body: {
          task1Answer: currentPrompt?.task_type === 'task1' ? writingText : 'Not completed',
          task2Answer: currentPrompt?.task_type === 'task2' ? writingText : 'Not completed',
          task1Data: currentPrompt?.task_type === 'task1' ? {
            title: currentPrompt?.title || 'Task 1',
            instructions: currentPrompt?.prompt_text || '',
            imageUrl: currentPrompt?.image_url
          } : {},
          task2Data: currentPrompt?.task_type === 'task2' ? {
            title: currentPrompt?.title || 'Task 2',
            instructions: currentPrompt?.prompt_text || ''
          } : {},
          apiProvider: selectedAPI
        }
      });

      if (error) throw error;

      if (data.success) {
        setFeedback(data.feedback);
        
        // Save writing test result
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('💾 Saving writing test results for user:', user.id);
            
            // Save main test result
            const { data: testResult, error: testError } = await supabase
              .from('test_results')
              .insert({
                user_id: user.id,
                test_type: 'writing',
                total_questions: 1,
                correct_answers: 1, // Writing tasks are marked subjectively
                score_percentage: 85, // Placeholder - would be extracted from AI feedback
                time_taken: (currentPrompt?.time_limit || 60) * 60,
                test_data: {
                  prompt: currentPrompt,
                  response: writingText,
                  word_count: wordCount,
                  feedback: data.feedback
                }
              })
              .select()
              .single();

            if (testError) {
              console.error('❌ Error saving test result:', testError);
              throw testError;
            }

            console.log('✅ Test result saved:', testResult);

            // Save detailed writing result
            const { error: writingError } = await supabase.from('writing_test_results').insert({
              user_id: user.id,
              test_result_id: testResult.id,
              task_number: currentPrompt?.task_number || 1,
              prompt_text: currentPrompt?.prompt_text || '',
              user_response: writingText,
              word_count: wordCount,
              band_scores: data.structured?.criteria || null,
              detailed_feedback: data.feedback,
              structured: data.structured || null,
              improvement_suggestions: [],
              time_taken_seconds: (currentPrompt?.time_limit || 60) * 60
            });

            if (writingError) {
              console.error('❌ Error saving writing result:', writingError);
              throw writingError;
            }

            console.log('✅ Writing test results saved successfully');
            
            // Show success message for saving
            toast({
              title: "Results Saved",
              description: "Your writing test results have been saved to your dashboard!",
            });
          }
        } catch (saveError) {
          console.error('❌ Error saving writing results:', saveError);
          toast({
            title: "Save Failed",
            description: "Your feedback was generated but results couldn't be saved. Please contact support.",
            variant: "destructive"
          });
        }
        
        console.log('✅ AI feedback received successfully');
        toast({
          title: "Writing Analysis Complete",
          description: "Your writing has been analyzed with detailed IELTS band scores!",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('❌ Feedback error:', error);
      toast({
        title: "Analysis Failed", 
        description: error.message || "Could not analyze your writing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen glass-card flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-2 text-sm text-text-primary">Loading Writing Test...</p>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    return (
      <div className="min-h-screen glass-card">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="glass-effect">
              <CardContent className="pt-8">
                <BookOpen className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4 text-text-primary">No Writing Prompts Available</h2>
                <p className="text-text-secondary mb-6">
                  No writing prompts found for {cambridgeBook}, Test {testNumber}.
                  Please contact your admin to upload writing content.
                </p>
                <Button onClick={() => navigate('/tests')} className="glass-button">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Tests
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const availableTasks = prompts.map(p => ({
    type: p.task_type,
    number: parseInt(p.task_type.replace('task', ''))
  })).sort((a, b) => a.number - b.number);

  return (
    <div className="min-h-screen glass-card">
      {/* Header */}
      <header className="border-b border-border/30 glass-effect shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/tests")} className="glass-button">
                <ArrowLeft className="w-4 h-4" />
                Back to Tests
              </Button>
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-brand-blue" />
                <span className="font-semibold text-text-primary">IELTS Writing Test</span>
                <Badge variant="secondary" className="glass-effect">{cambridgeBook} - Test {testNumber}</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <Clock className="w-4 h-4" />
                <span>{currentPrompt?.time_limit || 60} minutes</span>
              </div>
              <Button className="btn-primary" size="sm">
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Task Selection */}
          {availableTasks.length > 1 && (
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Select Writing Task</CardTitle>
                <div className="flex justify-center gap-2 mt-4">
                  {availableTasks.map((task) => (
                    <Button
                      key={task.type}
                      variant={currentPrompt?.task_type === task.type ? "default" : "outline"}
                      onClick={() => handleTaskChange(task.type)}
                      disabled={isAnalyzing}
                      className="min-w-24"
                    >
                      Task {task.number}
                    </Button>
                  ))}
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Current Task */}
          <Card className="card-modern">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Writing {currentPrompt.task_type.charAt(0).toUpperCase() + currentPrompt.task_type.slice(1)} 
                  {currentPrompt.task_number && ` - ${currentPrompt.task_number}`}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {currentPrompt.word_limit} words minimum
                  </Badge>
                  <Badge variant="outline">
                    {currentPrompt.time_limit} minutes
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-brand-blue/5 border border-brand-blue/20 p-6 rounded-xl mb-6">
                <h3 className="font-semibold mb-3 text-brand-blue">Task Instructions:</h3>
                <div className="text-sm leading-relaxed text-text-primary">
                  {currentPrompt.prompt_text}
                </div>
                
                {/* Display Task 1 Image if available */}
                {currentPrompt.image_url && (
                  <div className="mt-4">
                    <img 
                      src={currentPrompt.image_url} 
                      alt="Task 1 Chart/Graph" 
                      className="max-w-full max-h-80 object-contain border border-border rounded-lg shadow-sm mx-auto"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Your Response:</label>
                  <div className="text-sm text-text-secondary">
                    Word count: <span className={wordCount < currentPrompt.word_limit ? "text-brand-red" : "text-brand-green font-semibold"}>
                      {wordCount}
                    </span> / {currentPrompt.word_limit} minimum
                  </div>
                </div>
                
                <Textarea
                  value={writingText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Start writing your response for ${currentPrompt.task_type}...`}
                  className="min-h-[350px] text-sm leading-relaxed input-modern"
                  disabled={isAnalyzing}
                />

                {/* API Selection */}
                <div className="space-y-3 p-4 border border-border/50 rounded-lg bg-surface-2">
                  <Label className="text-sm font-medium">Choose AI Provider:</Label>
                  <RadioGroup 
                    value={selectedAPI} 
                    onValueChange={(value: 'gemini' | 'openai') => setSelectedAPI(value)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gemini" id="gemini" />
                      <Label htmlFor="gemini" className="cursor-pointer">
                        Google Gemini
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="openai" id="openai" />
                      <Label htmlFor="openai" className="cursor-pointer">
                        OpenAI GPT
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button 
                  onClick={handleGetFeedback}
                  disabled={isAnalyzing || writingText.trim().length < 50}
                  className="w-full btn-primary"
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center">
                      <LottieLoadingAnimation size="sm" message={`Analyzing with ${selectedAPI === 'gemini' ? 'Gemini' : 'OpenAI'}...`} />
                    </div>
                  ) : (
                    `Get AI Feedback & IELTS Band Score (${selectedAPI === 'gemini' ? 'Gemini' : 'OpenAI'})`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Results */}
          {feedback && (
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-brand-blue" />
                  IELTS Writing Analysis & Band Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-surface-3 p-4 rounded-xl">
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

export default WritingTest;