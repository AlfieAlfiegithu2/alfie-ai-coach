import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Maximize2, Minimize2, X, MessageCircle, Send, Move } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface DraggableChatbotProps {
  taskType: string;
  taskInstructions: string;
  isVisible: boolean;
  onClose: () => void;
}

export const DraggableChatbot: React.FC<DraggableChatbotProps> = ({
  taskType,
  taskInstructions,
  isVisible,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(true);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: `Hi! I'm Catbot, your IELTS Writing assistant for ${taskType}. I can help you with vocabulary, structure, grammar, and writing techniques. How can I assist you today?`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isVisible, taskType, messages.length]);

  // Stop blinking after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsBlinking(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (e.target.closest('.drag-handle')) {
        setIsDragging(true);
        const rect = chatRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      } else if (e.target.closest('.resize-handle')) {
        setIsResizing(true);
        const rect = chatRef.current?.getBoundingClientRect();
        if (rect) {
          setResizeOffset({
            x: e.clientX - (rect.left + size.width),
            y: e.clientY - (rect.top + size.height),
          });
        }
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, Math.min(600, e.clientX - position.x - resizeOffset.x));
      const newHeight = Math.max(400, Math.min(700, e.clientY - position.y - resizeOffset.y));
      
      setSize({
        width: newWidth,
        height: newHeight,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeOffset]);

  const sendMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are Catbot, an expert IELTS Writing tutor. You're helping with ${taskType}. Task instructions: ${taskInstructions}. Provide helpful, concise advice on vocabulary, grammar, structure, and writing techniques.`
            },
            {
              role: 'user',
              content: message
            }
          ]
        }
      });

      if (error) throw error;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Sorry, I encountered an issue. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting right now. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleQuickChat = (type: string) => {
    let message = '';
    switch (type) {
      case 'vocabulary':
        message = 'Can you suggest some advanced vocabulary for this topic?';
        break;
      case 'structure':
        message = 'How should I structure my response?';
        break;
      case 'grammar':
        message = 'What grammar points should I focus on?';
        break;
    }
    if (message) sendMessage(message);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={chatRef}
      className={`fixed z-50 transition-all duration-300 ease-in-out ${isBlinking ? 'animate-pulse' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: isDragging ? 'rotate(2deg)' : 'rotate(0deg)',
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className="bg-background/95 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="drag-handle flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg cursor-move">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Catbot Assistant</span>
            <Move className="w-3 h-3 text-muted-foreground ml-1" />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Chat Content */}
        <div className={`transition-all duration-300 flex flex-col ${isMinimized ? 'h-0 overflow-hidden' : ''}`} style={{ height: isMinimized ? '0px' : `${size.height - 54}px` }}>
          {/* Quick Chat Buttons */}
          <div className="p-3 bg-muted/30 border-b">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickChat('vocabulary')}
                className="text-xs"
              >
                Vocabulary
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickChat('structure')}
                className="text-xs"
              >
                Structure
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickChat('grammar')}
                className="text-xs"
              >
                Grammar
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-2 rounded-lg text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about IELTS writing..."
                className="min-h-[40px] max-h-[80px] resize-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Resize Handle */}
        <div className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity">
          <div className="w-full h-full bg-gradient-to-tr from-transparent via-muted-foreground/30 to-muted-foreground/50 rounded-tl-lg"></div>
        </div>
      </Card>
    </div>
  );
};
