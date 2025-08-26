import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SuggestionVisualizer, { type Span } from "@/components/SuggestionVisualizer";
import { ElevenLabsVoiceOptimized } from "@/components/ElevenLabsVoiceOptimized";

interface DeepSeekSuggestionGeneratorProps {
  questionText: string;
  userTranscription: string;
  part: string;
  questionIndex: number;
  audioFeatures?: any;
  onSuggestionGenerated?: (originalSpans: Span[], suggestedSpans: Span[]) => void;
}

const DeepSeekSuggestionGenerator = ({
  questionText,
  userTranscription,
  part,
  questionIndex,
  audioFeatures,
  onSuggestionGenerated
}: DeepSeekSuggestionGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [originalSpans, setOriginalSpans] = useState<Span[]>([]);
  const [suggestedSpans, setSuggestedSpans] = useState<Span[]>([]);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const { toast } = useToast();

  const generateDeepSeekSuggestion = async () => {
    if (!userTranscription?.trim()) {
      toast({
        title: "No Content",
        description: "No transcription available to improve",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🤖 Generating DeepSeek suggestion for:', { part, questionIndex });

      // Call the enhanced edge function with DeepSeek-specific parameters
      const { data: result, error } = await supabase.functions.invoke('enhanced-speech-analysis', {
        body: {
          action: 'generate_suggestion',
          questionText,
          userTranscription,
          part,
          questionIndex,
          audioFeatures,
          model: 'deepseek'
        }
      });

      if (error) throw error;

      if (result?.original_spans && result?.suggested_spans) {
        console.log('✅ DeepSeek suggestion generated successfully');
        
        setOriginalSpans(result.original_spans);
        setSuggestedSpans(result.suggested_spans);
        setHasSuggestion(true);
        
        // Notify parent component
        onSuggestionGenerated?.(result.original_spans, result.suggested_spans);
        
        toast({
          title: "AI Suggestion Generated",
          description: "DeepSeek has analyzed your response and provided an improved version!",
        });
      } else {
        throw new Error('Invalid response format from DeepSeek');
      }

    } catch (error) {
      console.error('Error generating DeepSeek suggestion:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI suggestion. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (hasSuggestion && originalSpans.length > 0 && suggestedSpans.length > 0) {
    return (
      <Card className="card-modern bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>DeepSeek AI Enhanced Response</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                Powered by DeepSeek
              </Badge>
              <Button
                onClick={generateDeepSeekSuggestion}
                disabled={isGenerating}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SuggestionVisualizer
            originalSpans={originalSpans}
            suggestedSpans={suggestedSpans}
            dimNeutral={false}
            hideOriginal={false}
          />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Compare your original response with the AI-enhanced version
            </div>
            <ElevenLabsVoiceOptimized 
              text={suggestedSpans.map(span => span.text || '').join('')}
              className="text-xs"
              questionId={`deepseek_suggestion_${part}_${questionIndex}`}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-modern border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="text-center p-6">
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Get AI-Enhanced Suggestions</h3>
            <p className="text-muted-foreground text-sm">
              Use DeepSeek AI to analyze your response and get an improved version with better vocabulary, grammar, and structure.
            </p>
          </div>

          <Button
            onClick={generateDeepSeekSuggestion}
            disabled={isGenerating || !userTranscription?.trim()}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating with DeepSeek...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Enhancement
              </>
            )}
          </Button>

          {!userTranscription?.trim() && (
            <p className="text-xs text-muted-foreground">
              No transcription available for enhancement
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeepSeekSuggestionGenerator;