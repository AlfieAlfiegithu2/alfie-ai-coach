import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, BookOpen, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WordTranslatorProps {
  selectedWord: string;
  position: { x: number; y: number };
  onClose: () => void;
}

interface WordDefinition {
  part_of_speech: string;
  translations: string[];
}

const WordTranslator: React.FC<WordTranslatorProps> = ({ selectedWord, position, onClose }) => {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedWord) {
      fetchDefinition();
      checkIfSaved();
    }
  }, [selectedWord]);

  const fetchDefinition = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocabulary', {
        body: { action: 'getDefinition', word: selectedWord }
      });

      if (error) throw error;

      // For now, use a simple mock definition since we'll get it when saving
      setDefinition({
        part_of_speech: 'loading...',
        translations: [`Translation for "${selectedWord}"`]
      });
    } catch (error) {
      console.error('Error fetching definition:', error);
      setDefinition({
        part_of_speech: 'unknown',
        translations: [`Translation for "${selectedWord}"`]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('vocabulary', {
        body: { action: 'getSavedWords' }
      });

      if (error) throw error;

      const savedWords = data?.data || [];
      const isWordSaved = savedWords.some((w: any) => 
        w.word.toLowerCase() === selectedWord.toLowerCase()
      );
      setIsSaved(isWordSaved);
    } catch (error) {
      console.error('Error checking saved words:', error);
    }
  };

  const saveWord = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocabulary', {
        body: { action: 'saveWord', word: selectedWord }
      });

      if (error) throw error;

      if (data.success) {
        setIsSaved(true);
        setDefinition({
          part_of_speech: data.data.part_of_speech,
          translations: data.data.translations
        });
        toast({
          title: "Word Saved!",
          description: `"${selectedWord}" has been added to your dictionary.`,
        });
        // Dispatch event for dashboard refresh
        window.dispatchEvent(new CustomEvent('vocabulary-updated'));
      }
    } catch (error) {
      console.error('Error saving word:', error);
      if (error.message?.includes('already saved')) {
        setIsSaved(true);
        toast({
          title: "Already Saved",
          description: `"${selectedWord}" is already in your dictionary.`,
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Could not save the word. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate position to keep popup on screen
  const getPopupPosition = () => {
    const popupWidth = 350;
    const popupHeight = 200;
    const margin = 20;

    let left = position.x;
    let top = position.y + 20; // Below the selection

    // Keep within screen bounds
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }
    if (top + popupHeight > window.innerHeight - margin) {
      top = position.y - popupHeight - 20; // Above the selection
    }
    if (top < margin) {
      top = margin;
    }

    return { left, top };
  };

  const popupPosition = getPopupPosition();

  return (
    <div 
      className="fixed z-50 max-w-sm"
      style={{
        left: popupPosition.left,
        top: popupPosition.top,
      }}
    >
      <Card className="bg-background border-border shadow-lg">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Dictionary</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="w-6 h-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-base font-medium">"{selectedWord}"</p>
                {definition && (
                  <Badge variant="secondary" className="text-xs">
                    {definition.part_of_speech}
                  </Badge>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : definition ? (
                <div className="space-y-1">
                  {definition.translations.map((translation, index) => (
                    <p key={index} className="text-sm text-foreground">
                      • {translation}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              {!isSaved ? (
                <Button 
                  onClick={saveWord}
                  disabled={isSaving}
                  size="sm"
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3 h-3 mr-2" />
                      Save to Dictionary
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 p-2 bg-green-100 rounded-lg border border-green-300 flex-1">
                  <Check className="w-4 h-4 text-green-700" />
                  <span className="text-sm font-medium text-green-700">Saved!</span>
                </div>
              )}
              
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WordTranslator;
