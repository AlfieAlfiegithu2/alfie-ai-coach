import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Languages, 
  BookOpen, 
  Lightbulb, 
  Volume2, 
  X, 
  Send,
  Globe,
  Sparkles,
  HelpCircle,
  Target,
  Mic
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface StudentHelpWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const StudentHelpWidget: React.FC<StudentHelpWidgetProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'translate' | 'tips' | 'vocab'>('chat');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', message: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [translateText, setTranslateText] = useState('');
  const [translateFrom, setTranslateFrom] = useState('auto');
  const [translateTo, setTranslateTo] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [vocabWord, setVocabWord] = useState('');
  const [vocabDefinition, setVocabDefinition] = useState('');

  const languages = [
    { code: 'auto', name: 'Auto-detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' }
  ];

  const dailyTips = [
    {
      category: "IELTS Writing",
      tip: "Use topic sentences at the beginning of each paragraph to clearly state your main point.",
      icon: "✍️"
    },
    {
      category: "IELTS Speaking", 
      tip: "Practice extending your answers with examples, reasons, and personal experiences.",
      icon: "🗣️"
    },
    {
      category: "IELTS Reading",
      tip: "Scan for keywords in questions first, then locate them in the passage to save time.",
      icon: "📖"
    },
    {
      category: "IELTS Listening",
      tip: "Use the preparation time to read ahead and predict what information you need to listen for.",
      icon: "🎧"
    },
    {
      category: "General English",
      tip: "Learn collocations (word combinations) like 'heavy rain' instead of just individual words.",
      icon: "🧠"
    }
  ];

  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', message: userMessage }]);
    setIsLoading(true);

    try {
      // Simple AI response for now - in a real app, this would call OpenAI API
      const responses = [
        "I'd be happy to help you with that! Can you provide more specific details about what you're struggling with?",
        "That's a great question! For IELTS preparation, I recommend focusing on understanding the question types first.",
        "Here's a tip: Practice with authentic materials and time yourself to build test-day confidence.",
        "Remember to analyze your mistakes - that's where the real learning happens!",
        "For speaking practice, try recording yourself and listening back to identify areas for improvement."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setTimeout(() => {
        setChatHistory(prev => [...prev, { role: 'assistant', message: randomResponse }]);
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) return;

    setIsLoading(true);
    try {
      // Mock translation - in a real app, this would use Google Translate API
      const mockTranslations: Record<string, string> = {
        'Hello': 'Hola (Spanish), Bonjour (French), Hallo (German)',
        'Good morning': 'Buenos días (Spanish), Bonjour (French), Guten Morgen (German)',
        'Thank you': 'Gracias (Spanish), Merci (French), Danke (German)',
        'How are you?': '¿Cómo estás? (Spanish), Comment allez-vous? (French), Wie geht es Ihnen? (German)'
      };

      const translation = mockTranslations[translateText] || `Translation of "${translateText}" to ${languages.find(l => l.code === translateTo)?.name}`;
      setTranslatedText(translation);
      setIsLoading(false);
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error", 
        description: "Failed to translate text. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleVocabLookup = async () => {
    if (!vocabWord.trim()) return;

    setIsLoading(true);
    try {
      // Mock vocabulary lookup
      const mockDefinitions: Record<string, string> = {
        'ubiquitous': 'Present everywhere; found in all places. Example: "Smartphones have become ubiquitous in modern society."',
        'meticulous': 'Extremely careful and precise. Example: "She was meticulous in her research methodology."',
        'paramount': 'Of the highest importance. Example: "Safety is of paramount concern in this project."',
        'eloquent': 'Fluent and persuasive in speaking or writing. Example: "The speaker gave an eloquent presentation."',
        'resilient': 'Able to recover quickly from difficulties. Example: "The community proved resilient after the natural disaster."'
      };

      const definition = mockDefinitions[vocabWord.toLowerCase()] || `Definition and example for "${vocabWord}" - This word is commonly used in academic English.`;
      setVocabDefinition(definition);
      setIsLoading(false);
    } catch (error) {
      console.error('Vocabulary lookup error:', error);
      toast({
        title: "Lookup Error",
        description: "Failed to find word definition. Please try again.", 
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-lg">AI Study Assistant</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-1 mt-3">
            {[
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'translate', label: 'Translate', icon: Languages },
              { id: 'tips', label: 'Tips', icon: Lightbulb },
              { id: 'vocab', label: 'Vocab', icon: BookOpen }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(id as any)}
                className="flex items-center gap-1 text-xs"
              >
                <Icon className="w-3 h-3" />
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="bg-surface-2 rounded-lg p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-text-secondary py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ask me anything about English learning!</p>
                    <p className="text-xs mt-1">Try: "How can I improve my IELTS writing score?"</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                          msg.role === 'user' 
                            ? 'bg-brand-blue text-white' 
                            : 'bg-surface-1 border'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-surface-1 border p-2 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask me about IELTS, PTE, TOEFL, or general English..."
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  disabled={isLoading}
                />
                <Button onClick={handleChatSubmit} disabled={isLoading || !chatMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'translate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Select value={translateFrom} onValueChange={setTranslateFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={translateTo} onValueChange={setTranslateTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.filter(l => l.code !== 'auto').map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={translateText}
                onChange={(e) => setTranslateText(e.target.value)}
                placeholder="Enter text to translate..."
                className="min-h-[100px]"
              />
              
              <Button onClick={handleTranslate} disabled={isLoading || !translateText.trim()} className="w-full">
                <Globe className="w-4 h-4 mr-2" />
                Translate
              </Button>
              
              {translatedText && (
                <div className="bg-surface-2 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Translation:</p>
                  <p className="text-sm">{translatedText}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-3">
              {dailyTips.map((tip, index) => (
                <div key={index} className="bg-surface-2 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{tip.icon}</span>
                    <Badge variant="secondary" className="text-xs">{tip.category}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{tip.tip}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'vocab' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                  placeholder="Enter a word to look up..."
                  onKeyPress={(e) => e.key === 'Enter' && handleVocabLookup()}
                />
                <Button onClick={handleVocabLookup} disabled={isLoading || !vocabWord.trim()}>
                  <Target className="w-4 h-4" />
                </Button>
              </div>
              
              {vocabDefinition && (
                <div className="bg-surface-2 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Definition & Example:</p>
                  <p className="text-sm">{vocabDefinition}</p>
                </div>
              )}
              
              <div className="bg-brand-blue/5 border border-brand-blue/20 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-brand-blue">Word of the Day</h4>
                <p className="text-sm"><strong>Paradigm</strong> - A typical example or pattern of something; a model.</p>
                <p className="text-xs text-text-secondary mt-1">"The new teaching methods represent a paradigm shift in education."</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentHelpWidget;