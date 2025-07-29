import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Languages,
  BookOpen,
  HelpCircle,
  Search,
  Volume2,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentHelpWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const StudentHelpWidget: React.FC<StudentHelpWidgetProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onLanguageChange
}) => {
  const [chatMessage, setChatMessage] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [translationResult, setTranslationResult] = useState('');
  const [vocabularyWord, setVocabularyWord] = useState('');
  const [vocabularyResult, setVocabularyResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' }
  ];

  const handleTranslation = async () => {
    if (!translationText.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translation-service', {
        body: { 
          text: translationText,
          targetLanguage: selectedLanguage,
          sourceLanguage: 'en'
        }
      });

      if (error) throw error;

      setTranslationResult(data.translatedText);
      toast({
        title: "Translation Complete",
        description: "Text has been translated successfully."
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: "Failed to translate text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVocabularyLookup = async () => {
    if (!vocabularyWord.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: { 
          message: `Define the word "${vocabularyWord}" and provide example sentences, pronunciation guide, and synonyms`,
          context: 'vocabulary_helper'
        }
      });

      if (error) throw error;

      setVocabularyResult({
        word: vocabularyWord,
        definition: data.response
      });
      
      toast({
        title: "Vocabulary Lookup Complete",
        description: `Definition found for "${vocabularyWord}"`
      });
    } catch (error) {
      console.error('Vocabulary lookup error:', error);
      toast({
        title: "Lookup Error",
        description: "Failed to lookup word. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickChat = async () => {
    if (!chatMessage.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: { 
          message: chatMessage,
          context: 'quick_help',
          language: selectedLanguage
        }
      });

      if (error) throw error;

      toast({
        title: "AI Response",
        description: data.response?.substring(0, 100) + "...",
      });
      setChatMessage('');
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden glass-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/30">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-brand-blue" />
            Student Help Center
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="chat" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Quick Chat
              </TabsTrigger>
              <TabsTrigger value="translate" className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Translate
              </TabsTrigger>
              <TabsTrigger value="vocabulary" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Vocabulary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Ask me anything about English grammar, vocabulary, or test strategies!
                </p>
                <Textarea
                  placeholder="Type your question here..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button 
                  onClick={handleQuickChat}
                  disabled={isLoading || !chatMessage.trim()}
                  className="w-full"
                >
                  {isLoading ? 'Getting Answer...' : 'Ask AI Tutor'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="translate" className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Translate English text to {languages.find(l => l.code === selectedLanguage)?.name}
                </p>
                <Textarea
                  placeholder="Enter English text to translate..."
                  value={translationText}
                  onChange={(e) => setTranslationText(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button 
                  onClick={handleTranslation}
                  disabled={isLoading || !translationText.trim() || selectedLanguage === 'en'}
                  className="w-full"
                >
                  {isLoading ? 'Translating...' : 'Translate'}
                </Button>
                
                {translationResult && (
                  <Card className="bg-surface-2 border-brand-green/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Translation</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm">{translationResult}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="vocabulary" className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Look up definitions, examples, and pronunciation for any word
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a word to look up..."
                    value={vocabularyWord}
                    onChange={(e) => setVocabularyWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleVocabularyLookup()}
                  />
                  <Button 
                    onClick={handleVocabularyLookup}
                    disabled={isLoading || !vocabularyWord.trim()}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {vocabularyResult && (
                  <Card className="bg-surface-2 border-brand-blue/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="bg-brand-blue/10 text-brand-blue">
                          {vocabularyResult.word}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="prose prose-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {vocabularyResult.definition}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentHelpWidget;