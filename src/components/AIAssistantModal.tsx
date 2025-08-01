import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, BookOpen, Target, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionText: string;
  questionType: string; // "Part 1", "Part 2", "Part 3"
  partNumber: number;
}

const AIAssistantModal = ({ isOpen, onClose, questionText, questionType, partNumber }: AIAssistantModalProps) => {
  const [selectedHelp, setSelectedHelp] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const helpOptions = [
    {
      id: "vocabulary",
      label: "Suggest relevant vocabulary",
      icon: BookOpen,
      description: "Get advanced vocabulary for this topic"
    },
    {
      id: "structure",
      label: "Help me structure my answer", 
      icon: Target,
      description: "Learn how to organize your response"
    },
    {
      id: "grammar",
      label: "What grammar is useful for this topic?",
      icon: Zap,
      description: "Discover grammar patterns to impress"
    }
  ];

  const generateContextualPrompt = (helpType: string): string => {
    const baseContext = `The student is taking an IELTS Speaking test and is working on ${questionType}. The specific question they are answering is: "${questionText}"`;
    
    switch (helpType) {
      case "vocabulary":
        return `${baseContext}

The student has requested help with relevant vocabulary. Please provide:
- 4-5 advanced and impressive vocabulary items specifically relevant to this question
- Brief, clear definitions for each word/phrase
- Example of how to use each item naturally in context
- Focus on vocabulary that would help achieve a higher band score (7-8+)

Format your response clearly and make it practical for immediate use.`;

      case "structure":
        return `${baseContext}

The student has requested help with structuring their answer. Please provide:
- A clear step-by-step structure for answering this specific question
- Key points they should cover
- Logical flow and organization tips
- Specific advice for ${questionType} format and timing
- How to make their answer coherent and well-developed

Be specific to this exact question and provide actionable guidance.`;

      case "grammar":
        return `${baseContext}

The student has requested help with useful grammar for this topic. Please provide:
- 3-4 specific grammar structures that would be impressive for this question
- Examples of how to use each structure with this topic
- Why these structures would help achieve higher band scores
- Natural ways to incorporate complex grammar into their response

Focus on grammar that's specifically relevant to answering this question effectively.`;

      default:
        return `${baseContext}

Please provide helpful, specific advice for answering this IELTS Speaking question effectively.`;
    }
  };

  const getAIAssistance = async (helpType: string) => {
    if (!questionText.trim()) {
      toast({
        title: "No Question Available",
        description: "Question text not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setSelectedHelp(helpType);
    setAiResponse("");

    try {
      const prompt = generateContextualPrompt(helpType);
      
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: "system",
              content: "You are an expert IELTS Speaking coach. Provide specific, actionable advice that will help students achieve higher band scores. Be encouraging and practical."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }
      });

      if (error) throw error;

      setAiResponse(data.response || "I'm unable to provide assistance right now. Please try again.");
      
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      toast({
        title: "AI Assistant Error",
        description: "Failed to get assistance. Please try again.",
        variant: "destructive"
      });
      setSelectedHelp(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAssistant = () => {
    setSelectedHelp(null);
    setAiResponse("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Assistant - {questionType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Context Display */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Current Question:</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                {questionText || "Question text not available"}
              </p>
            </CardContent>
          </Card>

          {!selectedHelp ? (
            /* Help Options */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                How would you like me to help you with this question?
              </p>
              
              {helpOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Button
                    key={option.id}
                    onClick={() => getAIAssistance(option.id)}
                    variant="outline"
                    className="w-full justify-start h-auto p-4 text-left"
                    disabled={isLoading}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="w-5 h-5 mt-0.5 text-purple-600" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          ) : (
            /* AI Response Display */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-purple-800">
                  {helpOptions.find(opt => opt.id === selectedHelp)?.label}
                </h4>
                <Button
                  onClick={resetAssistant}
                  variant="outline"
                  size="sm"
                  className="text-purple-600"
                >
                  Ask Different Question
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Getting personalized assistance...
                  </span>
                </div>
              ) : (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-green-800">
                      {aiResponse}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close Assistant
            </Button>
            {selectedHelp && !isLoading && (
              <Button onClick={resetAssistant} className="bg-purple-600 hover:bg-purple-700">
                Get More Help
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIAssistantModal;