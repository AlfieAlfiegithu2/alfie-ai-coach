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
    const baseContext = `The student is taking an IELTS Speaking test and is working on ${questionType}. The specific question they are answering is: "${questionText}"`;
    
    if (customMessage) {
      return `${baseContext}

The student has asked: "${customMessage}"

Please provide helpful, specific advice related to their question about IELTS Speaking. Be encouraging and practical.`;
    }

    switch (helpType) {
      case "vocabulary":
        return `${baseContext}

The student has requested help with relevant vocabulary. Please provide:
- 4-5 advanced vocabulary items specifically relevant to this question  
- Brief definitions for each word/phrase
- Example of how to use each item naturally in context
- Focus on vocabulary that would help achieve band 7-8+

Keep your response concise and practical.`;

      case "structure":
        return `${baseContext}

The student has requested help with structuring their answer. Please provide:
- A clear step-by-step structure for answering this specific question
- Key points they should cover
- Logical flow and organization tips specific to ${questionType}
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
          messages: [
            {
              role: "system",
              content: "You are an expert IELTS Speaking coach. Provide specific, actionable advice that will help students achieve higher band scores. Be encouraging, practical, and concise. Format your responses clearly."
            },
            {
              role: "user",
              content: prompt
            }
          ]
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
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Speaking Assistant - {questionType}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Question Context */}
        <Card className="bg-blue-50 border-blue-200 flex-shrink-0">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Current Question:</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              {questionText || "Question text not available"}
            </p>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!message.isUser && (
                <div className="flex-shrink-0">
                  <Bot className="h-6 w-6 text-purple-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                  message.isUser
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 border border-gray-200'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
              {message.isUser && (
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <Bot className="h-6 w-6 text-purple-600" />
              <div className="bg-gray-100 border border-gray-200 p-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-200"></div>
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
                  className="rounded-full text-purple-600 border-purple-200 hover:bg-purple-50"
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
              className="bg-purple-600 hover:bg-purple-700"
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