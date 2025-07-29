import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User,
  Minimize2,
  Languages
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MinimalisticChatbotProps {
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
}

const MinimalisticChatbot: React.FC<MinimalisticChatbotProps> = ({ 
  selectedLanguage = 'en',
  onLanguageChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatSize, setChatSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedTopic, setSelectedTopic] = useState('general');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI tutor. How can I help you with your English learning today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    { code: 'hi', name: 'Hindi' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' }
  ];

  const topics = [
    { value: 'general', label: 'General' },
    { value: 'grammar', label: 'Grammar' },
    { value: 'vocabulary', label: 'Vocabulary' },
    { value: 'pronunciation', label: 'Pronunciation' },
    { value: 'writing', label: 'Writing' },
    { value: 'speaking', label: 'Speaking' },
    { value: 'reading', label: 'Reading' },
    { value: 'listening', label: 'Listening' }
  ];

  const getChatDimensions = () => {
    switch (chatSize) {
      case 'small': return 'w-80 h-96';
      case 'large': return 'w-[28rem] h-[36rem]';
      default: return 'w-96 h-[32rem]';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { 
          message: inputMessage,
          context: selectedTopic,
          language: selectedLanguage
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'I apologize, but I couldn\'t process your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again later.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const translateText = async (text: string) => {
    if (selectedLanguage === 'en') return;
    
    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { 
          message: `Translate the following text to ${selectedLanguage}: "${text}"`,
          context: 'translation'
        }
      });

      if (!error && data.response) {
        const translatedMessage: Message = {
          id: Date.now().toString(),
          text: `Translation: ${data.response}`,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, translatedMessage]);
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full glass-effect hover:glass-button shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`backdrop-blur-lg bg-background/30 border-border/20 shadow-xl transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : getChatDimensions()
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand-blue" />
            <span className="font-semibold text-sm">AI English Tutor</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <Select value={selectedLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <Languages className="h-3 w-3" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-xs">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Topic Selector */}
            <div className="px-4 py-2 border-b border-border/30">
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <span className="text-xs">Topic: {topics.find(t => t.value === selectedTopic)?.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.value} value={topic.value} className="text-xs">
                      {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ 
              height: chatSize === 'small' ? '16rem' : chatSize === 'large' ? '24rem' : '20rem' 
            }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!message.isUser && (
                    <div className="flex-shrink-0">
                      <Bot className="h-6 w-6 text-brand-blue" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                      message.isUser
                        ? 'bg-brand-blue text-white'
                        : 'glass-effect border border-border/30'
                    }`}
                  >
                    <p className="leading-relaxed">{message.text}</p>
                    {!message.isUser && selectedLanguage !== 'en' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => translateText(message.text)}
                        className="mt-2 h-6 text-xs text-brand-blue hover:text-brand-blue/80"
                      >
                        <Languages className="h-3 w-3 mr-1" />
                        Translate
                      </Button>
                    )}
                  </div>
                  {message.isUser && (
                    <div className="flex-shrink-0">
                      <User className="h-6 w-6 text-text-secondary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <Bot className="h-6 w-6 text-brand-blue" />
                  <div className="glass-effect border border-border/30 p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Always visible */}
            <div className="p-4 border-t border-border/30">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={chatSize === 'small' ? "Type here..." : "Ask me anything about English..."}
                  className="flex-1 border-border/30 bg-surface-1/80 backdrop-blur-sm text-sm min-h-[40px]"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="h-10 w-10 p-0 bg-brand-blue hover:bg-brand-blue/90 flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default MinimalisticChatbot;