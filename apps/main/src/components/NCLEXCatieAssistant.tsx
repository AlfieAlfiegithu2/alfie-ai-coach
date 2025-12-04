import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  User, 
  Send, 
  Stethoscope, 
  Brain,
  HelpCircle,
  X,
  Minimize2,
  Maximize2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useThemeStyles } from "@/hooks/useThemeStyles";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface NCLEXCatieAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  questionText: string;
  questionType: 'SATA' | 'MCQ';
  options: string[];
  rationale?: string | null;
  isReviewMode?: boolean;
}

const NCLEXCatieAssistant = ({ 
  isOpen, 
  onClose, 
  questionText, 
  questionType,
  options,
  rationale,
  isReviewMode = false
}: NCLEXCatieAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const themeStyles = useThemeStyles();

  // Initialize welcome message when opened
  useEffect(() => {
    if (isOpen) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Hello! I'm Catie, your NCLEX study companion. 🩺 I'm here to help you understand this ${questionType === 'SATA' ? 'Select All That Apply' : 'multiple choice'} question. What would you like help with?`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setIsMinimized(false);
    }
  }, [isOpen, questionText]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const helpButtons = [
    {
      id: "explain",
      label: "Explain this question",
      icon: HelpCircle,
      description: "Break down what the question is asking"
    },
    {
      id: "nursing",
      label: "Nursing concepts",
      icon: Stethoscope,
      description: "Key nursing knowledge for this topic"
    },
    {
      id: "strategy", 
      label: "NCLEX strategy tips",
      icon: Brain,
      description: "Test-taking strategies"
    }
  ];

  const generateContextualPrompt = (helpType: string, customMessage?: string): string => {
    const questionContext = `
NCLEX Question (${questionType}):
"${questionText}"

Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}
${rationale ? `\nRationale: ${rationale}` : ''}
`;

    if (customMessage) {
      return `You are Catie, a friendly and knowledgeable NCLEX tutor. The student is working on this question:

${questionContext}

The student asked: "${customMessage}"

Provide helpful, clear, and encouraging guidance. Use nursing terminology appropriately but explain concepts clearly. Keep responses concise but thorough.`;
    }

    switch (helpType) {
      case "explain":
        return `You are Catie, a friendly NCLEX tutor. The student clicked "Explain this question" for:

${questionContext}

Break down what this question is asking in simple terms. Identify:
1. The clinical scenario
2. What the question is really asking
3. Key words to focus on
${questionType === 'SATA' ? '4. Remind them this is SATA - they need to evaluate EACH option independently' : ''}

Be encouraging and conversational. End with "Would you like me to explain the nursing concepts behind this?"`;

      case "nursing":
        return `You are Catie, a friendly NCLEX tutor. The student clicked "Nursing concepts" for:

${questionContext}

Explain the key nursing concepts and knowledge needed for this question:
1. Relevant pathophysiology or nursing theory
2. Priority nursing interventions
3. Assessment findings to look for
4. Any medication considerations if applicable

Be educational but accessible. Use clinical examples. End with "Do you have any specific questions about these concepts?"`;

      case "strategy":
        return `You are Catie, a friendly NCLEX tutor. The student clicked "NCLEX strategy tips" for:

${questionContext}

Share test-taking strategies specific to this question:
1. How to approach ${questionType === 'SATA' ? 'SATA questions (evaluate each option as true/false)' : 'this type of question'}
2. Key words to identify
3. Common pitfalls to avoid
4. Prioritization tips if applicable (Maslow's, ABCs, nursing process)

Be practical and encouraging. End with "Would you like to walk through the options together?"`;

      default:
        return `You are Catie, a friendly NCLEX tutor helping with:

${questionContext}

The student asked: "${customMessage}"

Provide helpful, specific guidance in a conversational way.`;
    }
  };

  const sendMessage = async (message: string, helpType?: string) => {
    if (!message.trim() && !helpType) return;

    let userMessageText = message;
    if (helpType) {
      const buttonLabels: Record<string, string> = {
        "explain": "Explain this question",
        "nursing": "Nursing concepts",
        "strategy": "NCLEX strategy tips"
      };
      userMessageText = buttonLabels[helpType] || message;
    }

    if (userMessageText) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: userMessageText,
        isUser: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
    }

    setIsLoading(true);
    setInputMessage("");

    try {
      const prompt = generateContextualPrompt(helpType || 'custom', helpType ? undefined : message);
      
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: prompt,
          context: 'nclex_tutor'
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm having trouble right now. Please try again!",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      toast({
        title: "Catie is taking a break",
        description: "Please try again in a moment.",
        variant: "destructive"
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Oops! I had a little hiccup. Please try asking again! 💪",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ease-out ${
        isMinimized ? 'w-80' : 'w-[420px]'
      }`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Card 
        className="overflow-hidden border-2"
        style={{ 
          backgroundColor: themeStyles.theme.colors.cardBackground,
          borderColor: 'rgb(20, 184, 166)' // teal-500
        }}
      >
        {/* Header with Catie's Avatar */}
        <div 
          className="p-4 flex items-center justify-between"
          style={{ 
            background: 'linear-gradient(to right, rgb(20, 184, 166), rgb(6, 182, 212))' // teal to cyan gradient
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/1000031289.png"
                alt="Catie AI"
                className="w-12 h-12 rounded-full shadow-lg object-cover ring-2 ring-white/50"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-3 h-3 text-teal-500" />
              </div>
            </div>
            <div className="text-white">
              <h3 className="font-bold text-lg">Ask Catie</h3>
              <p className="text-xs text-white/80">Your NCLEX Study Buddy</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Current Question Context */}
            <div className="px-4 py-3 border-b" style={{ borderColor: themeStyles.border }}>
              <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Stethoscope className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-1">
                        Current Question ({questionType})
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {questionText}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages Area */}
            <ScrollArea className="h-[280px] px-4 py-3">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!message.isUser && (
                      <div className="flex-shrink-0">
                        <img
                          src="/1000031289.png"
                          alt="Catie"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        message.isUser
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>
                    {message.isUser && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0">
                      <img
                        src="/1000031289.png"
                        alt="Catie"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                    <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Help Buttons */}
            <div className="px-4 py-2 border-t" style={{ borderColor: themeStyles.border }}>
              <div className="flex flex-wrap gap-2 justify-center mb-3">
                {helpButtons.map((button) => {
                  const IconComponent = button.icon;
                  return (
                    <Button
                      key={button.id}
                      onClick={() => sendMessage('', button.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-teal-600 border-teal-200 hover:bg-teal-50 hover:border-teal-300 dark:border-teal-800 dark:hover:bg-teal-900/30"
                      disabled={isLoading}
                    >
                      <IconComponent className="w-3 h-3 mr-1.5" />
                      {button.label}
                    </Button>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Catie anything..."
                  className="flex-1 text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            Click to expand chat with Catie
          </div>
        )}
      </Card>
    </div>
  );
};

export default NCLEXCatieAssistant;

