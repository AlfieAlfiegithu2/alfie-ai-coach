import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface VocabularyWord {
  id: string;
  word: string;
  part_of_speech: string;
  translations: string[];
  created_at: string;
}

const VocabularyDashboard = () => {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadVocabulary();
    }
  }, [user]);

  useEffect(() => {
    // Listen for vocabulary updates
    const handleVocabularyUpdate = () => {
      loadVocabulary();
    };

    window.addEventListener('vocabulary-updated', handleVocabularyUpdate);
    return () => window.removeEventListener('vocabulary-updated', handleVocabularyUpdate);
  }, []);

  const loadVocabulary = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('vocabulary', {
        body: { action: 'getSavedWords' }
      });

      if (error) throw error;

      setWords(data?.data || []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      toast({
        title: "Error Loading Vocabulary",
        description: "Could not load your saved words. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWord = async (wordId: string, word: string) => {
    setDeletingIds(prev => new Set(prev).add(wordId));
    
    try {
      const { data, error } = await supabase.functions.invoke('vocabulary', {
        body: { action: 'deleteWord', wordId }
      });

      if (error) throw error;

      if (data.success) {
        setWords(prev => prev.filter(w => w.id !== wordId));
        toast({
          title: "Word Deleted",
          description: `"${word}" has been removed from your dictionary.`,
        });
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the word. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground">Please sign in to access your vocabulary dictionary.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Dictionary</h1>
              <p className="text-muted-foreground">
                {words.length} word{words.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-8 h-8 border border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your vocabulary...</p>
              </CardContent>
            </Card>
          ) : words.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">No Words Saved Yet</h2>
                <p className="text-muted-foreground mb-4">
                  Double-click on any word while reading to start building your vocabulary dictionary.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {words.map((word) => (
                <Card key={word.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg capitalize">{word.word}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {word.part_of_speech}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWord(word.id, word.word)}
                        disabled={deletingIds.has(word.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingIds.has(word.id) ? (
                          <div className="w-4 h-4 border border-destructive border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {word.translations.map((translation, index) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          • {translation}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Saved {new Date(word.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocabularyDashboard;