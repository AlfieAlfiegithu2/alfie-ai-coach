import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Bot, User, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your IELTS/PTE/TOEFL/General English Assistant. I can help you with:\n\n• Question types and strategies\n• Grammar and vocabulary explanations\n• Study tips and test preparation\n• Error analysis and feedback\n• Practice guidance\n\nWhat would you like to know?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Predefined responses for common questions
  const responses: Record<string, string> = {
    'writing': 'For IELTS Writing, focus on:\n\n• Task 1: Describe data clearly with overview, key trends, and specific details\n• Task 2: Plan your essay with clear introduction, body paragraphs with examples, and conclusion\n• Aim for 150+ words (Task 1) and 250+ words (Task 2)\n• Practice cohesion with linking words\n• Check grammar and vocabulary accuracy\n\nWould you like specific tips for Task 1 or Task 2?',
    'speaking': 'IELTS Speaking has 3 parts:\n\n• Part 1: Personal questions (4-5 minutes)\n• Part 2: Individual presentation (3-4 minutes)\n• Part 3: Discussion (4-5 minutes)\n\nTips:\n• Speak naturally and clearly\n• Extend your answers with examples\n• Use varied vocabulary and grammar\n• Don\'t memorize responses\n• Practice fluency over perfection\n\nNeed help with any specific part?',
    'reading': 'IELTS Reading strategies:\n\n• Skim the passage first for main ideas\n• Read questions before detailed reading\n• Look for keywords and synonyms\n• Manage time: 20 minutes per passage\n• Practice different question types\n• Don\'t spend too long on one question\n\nWhich reading question type would you like help with?',
    'listening': 'IELTS Listening tips:\n\n• Listen for keywords and synonyms\n• Predict answers from context\n• Write as you listen\n• Check spelling and grammar\n• Use time between sections wisely\n• Practice with different accents\n\nAny specific listening challenges I can help with?',
    'grammar': 'Common grammar areas for English tests:\n\n• Tenses (present perfect vs past simple)\n• Articles (a, an, the)\n• Prepositions (in, on, at)\n• Conditional sentences\n• Passive voice\n• Modal verbs\n\nWhich grammar topic would you like me to explain?',
    'vocabulary': 'Building vocabulary for English tests:\n\n• Learn academic word lists\n• Practice collocations\n• Use vocabulary in context\n• Learn word families (noun, verb, adjective)\n• Practice synonyms and paraphrasing\n• Read widely for exposure\n\nWant specific vocabulary for any topic?',
    'band': 'IELTS Band scores explained:\n\n• Band 9: Expert user\n• Band 8: Very good user\n• Band 7: Good user (often required)\n• Band 6: Competent user\n• Band 5: Modest user\n\nEach skill is scored separately, then averaged. Most universities require 6.5-7.0 overall.\n\nWhat band score are you aiming for?'
  };

  const getResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // Check for specific keywords
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }
    
    // Fallback responses
    if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return 'I\'m here to help! I can assist with:\n\n• IELTS, PTE, TOEFL test strategies\n• Grammar and vocabulary questions\n• Writing and speaking practice\n• Test preparation tips\n• Error explanations\n\nJust ask me about any specific topic!';
    }
    
    if (lowerMessage.includes('score') || lowerMessage.includes('band')) {
      return 'Test scores vary by exam:\n\n• IELTS: Bands 1-9 (half bands allowed)\n• PTE: Scores 10-90\n• TOEFL: Total 0-120 (each skill 0-30)\n\nWhat\'s your target score and which test are you taking?';
    }
    
    return 'I understand you\'re asking about "' + message + '". Let me help you with that!\n\nFor specific guidance, try asking about:\n• Writing techniques\n• Speaking strategies\n• Grammar rules\n• Vocabulary building\n• Test preparation\n\nWhat specific aspect would you like to focus on?';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getResponse(inputMessage),
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="btn-primary rounded-full w-14 h-14 shadow-xl hover:scale-110 transition-all duration-200"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`glass-effect transition-all duration-300 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'} shadow-xl border-border/30`}>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-brand-blue" />
              </div>
              <div>
                <CardTitle className="text-lg">English Assistant</CardTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  IELTS • PTE • TOEFL • General
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-brand-blue" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                      message.sender === 'user'
                        ? 'bg-brand-blue text-white'
                        : 'bg-surface-3 text-text-primary'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-xs mt-2 opacity-70 ${
                      message.sender === 'user' ? 'text-white/70' : 'text-text-tertiary'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3 h-3 text-brand-green" />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-brand-blue" />
                  </div>
                  <div className="bg-surface-3 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about grammar, vocabulary, test tips..."
                  className="input-modern flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="btn-primary px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Chatbot;