import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Bot, 
  User, 
  Send, 
  BookOpen, 
  Target, 
  Zap,
  X 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface InteractiveSpeakingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  questionText: string;
  questionType: string;
  partNumber: number;
}

const InteractiveSpeakingAssistant = ({ 
  isOpen, 
  onClose, 
  questionText, 
  questionType, 
  partNumber 
}: InteractiveSpeakingAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize welcome message when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Hello! I'm your AI Speaking Assistant for ${questionType}. I can help you with vocabulary, structure, and grammar specific to your current question. What would you like help with?`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, questionType]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const helpButtons = [
    {
      id: "vocabulary",
      label: "Suggest vocabulary",
      icon: BookOpen,
      description: "Get relevant vocabulary for this topic"
    },
    {
      id: "structure", 
      label: "Help with structure",
      icon: Target,
      description: "Learn how to organize your answer"
    },
    {
      id: "grammar",
      label: "Grammar tips",
      icon: Zap,
      description: "Useful grammar for this question"
    }
  ];

  const generateContextualPrompt = (helpType: string, customMessage?: string): string => {
    if (customMessage) {
      return `The student is working on Part ${partNumber} of the IELTS Speaking test with the question: "${questionText}". They asked: "${customMessage}". Provide helpful, specific advice.`;
    }

    switch (helpType) {
      case "vocabulary":
        return `The student is working on the question: '${questionText}'. They have asked for 'relevant vocabulary'. Provide exactly **3-4 advanced lexical items** with very brief, one-line definitions. Do not provide example sentences unless the word is very unusual.`;

      case "structure":
        return `The student is working on the question: '${questionText}'. They have asked for 'help with structure'. Provide a simple, 2-3 step structure for answering this specific question.`;

      case "grammar":
        return `The student is working on the question: '${questionText}'. They have asked for 'useful grammar'. Suggest **one or two specific grammatical structures** that are relevant to this question.`;

      default:
        return `The student is working on Part ${partNumber} of the IELTS Speaking test with the question: "${questionText}". Provide helpful, specific advice.`;
    }
  };

  const sendMessage = async (message: string, helpType?: string) => {
    if (!message.trim() && !helpType) return;

    // Add user message (only if it's a custom message, not a help button click)
    if (!helpType) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: message,
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
          context: 'english_tutor'
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm unable to provide assistance right now. Please try again.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      toast({
        title: "AI Assistant Error",
        description: "Failed to get assistance. Please try again.",
        variant: "destructive"
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
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

  const handleHelpButtonClick = (helpType: string) => {
    sendMessage('', helpType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Speaking Assistant - {questionType}
          </DialogTitle>
        </DialogHeader>

        {/* Question Context */}
        <Card className="bg-primary/5 border-primary/20 flex-shrink-0">
          <CardContent className="p-4">
            <h4 className="font-semibold text-primary mb-2">Current Question:</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {questionText || "Question text not available"}
            </p>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-[350px] max-h-[450px] bg-muted/30 rounded-lg p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!message.isUser && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
              {message.isUser && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Help Buttons */}
        <div className="flex-shrink-0 space-y-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {helpButtons.map((button) => {
              const IconComponent = button.icon;
              return (
                <Button
                  key={button.id}
                  onClick={() => handleHelpButtonClick(button.id)}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-primary border-primary/20 hover:bg-primary/5"
                  disabled={isLoading}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
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
              placeholder="Ask me anything about this question..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InteractiveSpeakingAssistant;