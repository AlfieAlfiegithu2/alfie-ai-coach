import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Writing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentTask, setCurrentTask] = useState(1);
  const [writingText, setWritingText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const writingPrompts = {
    1: "The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
    2: "Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology. Discuss both these views and give your own opinion. Write at least 250 words."
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
      const { data, error } = await supabase.functions.invoke('writing-feedback', {
        body: {
          writing: writingText,
          prompt: writingPrompts[currentTask as keyof typeof writingPrompts],
          taskType: `Task ${currentTask}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setFeedback(data.feedback);
        toast({
          title: "Feedback Complete",
          description: "Your writing has been analyzed successfully!",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Feedback error:', error);
      toast({
        title: "Analysis Failed", 
        description: error.message || "Could not analyze your writing. Please try again.",
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
                <PenTool className="w-5 h-5 text-blue-deep" />
                <span className="font-semibold">Writing Test</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>60:00</span>
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
          {/* Task Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Writing Practice</CardTitle>
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2].map((task) => (
                  <Button
                    key={task}
                    variant={currentTask === task ? "default" : "outline"}
                    onClick={() => {
                      setCurrentTask(task);
                      setWritingText("");
                      setFeedback(null);
                      setWordCount(0);
                    }}
                    disabled={isAnalyzing}
                  >
                    Task {task}
                  </Button>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Current Task */}
          <Card>
            <CardHeader>
              <CardTitle>Writing Task {currentTask}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {currentTask === 1 ? "Minimum 150 words | 20 minutes" : "Minimum 250 words | 40 minutes"}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-light/30 p-6 rounded-lg mb-6">
                <h3 className="font-semibold mb-3">Task Instructions:</h3>
                <p className="text-sm leading-relaxed">
                  {writingPrompts[currentTask as keyof typeof writingPrompts]}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Your Response:</label>
                  <div className="text-sm text-muted-foreground">
                    Word count: <span className={wordCount < (currentTask === 1 ? 150 : 250) ? "text-red-500" : "text-green-600"}>
                      {wordCount}
                    </span>
                  </div>
                </div>
                
                <Textarea
                  value={writingText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Start writing your response for Task ${currentTask}...`}
                  className="min-h-[300px] text-sm leading-relaxed"
                  disabled={isAnalyzing}
                />

                <Button 
                  onClick={handleGetFeedback}
                  disabled={isAnalyzing || writingText.trim().length < 50}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Writing...
                    </>
                  ) : (
                    "Get AI Feedback"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Results */}
          {feedback && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Writing Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
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

export default Writing;