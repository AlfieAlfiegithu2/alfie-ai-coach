import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Maximize2, Minimize2, X, Send, Move } from 'lucide-react';
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
  imageContext?: string;
  isVisible: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

export const DraggableChatbot: React.FC<DraggableChatbotProps> = ({
  taskType,
  taskInstructions,
  imageContext,
  isVisible,
  onClose,
  initialPosition,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 });
  
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Cache for storing previous Q&A pairs
  const responseCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: `Hi! I'm Foxbot, your expert IELTS Writing tutor for ${taskType}. I'm here to coach you through the writing process with strategic guidance on structure, vocabulary, and techniques. What specific aspect of your essay would you like to work on?`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isVisible, taskType, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent, action?: 'drag' | 'resize') => {
    e.preventDefault(); // Prevent text selection
    document.body.style.userSelect = 'none'; // Prevent text selection globally
    
    if (action === 'resize') {
      setIsResizing(true);
      setResizeOffset({
        x: e.clientX - position.x - size.width,
        y: e.clientY - position.y - size.height,
      });
    } else {
      setIsDragging(true);
      const rect = chatRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
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
    document.body.style.userSelect = ''; // Restore text selection
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

  const typeMessage = (fullText: string, messageId: string) => {
    setIsTyping(true);
    setTypingMessage('');
    let currentIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        const char = fullText[currentIndex];
        setTypingMessage(prev => prev + char);
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTypingMessage('');
        
        // Add the complete message to messages
        const completeMessage: Message = {
          id: messageId,
          text: fullText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, completeMessage]);
      }
    }, 30); // Adjust typing speed here (lower = faster)
  };

  const sendMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Create cache key based on message and task context
    const cacheKey = `${message.toLowerCase().trim()}-${taskType}-${taskInstructions.slice(0, 50)}`;
    
    // Check cache first
    const cachedResponse = responseCache.current.get(cacheKey);
    if (cachedResponse) {
      console.log('🚀 Using cached response for:', message.slice(0, 30));
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: cachedResponse,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, responseMessage]);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are Foxbot, an expert IELTS Writing tutor helping with ${taskType}. Task instructions: ${taskInstructions}. Use the Foxbot persona and guidelines to provide strategic coaching that guides students to find answers themselves rather than giving direct answers.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          context: 'catbot',
          imageContext: imageContext,
          taskType: taskType,
          taskInstructions: taskInstructions
        }
      });

      if (error) throw error;

      const responseText = data.response || 'Sorry, I encountered an issue. Please try again.';
      
      // Cache the response for future use
      responseCache.current.set(cacheKey, responseText);
      console.log('💾 Cached response for:', message.slice(0, 30));
      
      // Add response message immediately
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, responseMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Handle different types of errors with appropriate messages
      let errorText = 'Sorry, I\'m having trouble connecting right now. Please try again.';
      
      if (error?.message?.includes('service temporarily unavailable') || error?.statusCode === 503) {
        errorText = '🔧 Foxbot is being updated! Please try again in a moment.';
      } else if (error?.statusCode === 429) {
        errorText = '⏰ I\'m getting lots of requests! Please wait a moment and try again.';
      } else if (error?.statusCode >= 500) {
        errorText = '⚠️ Technical issue detected. The team has been notified. Try again soon!';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
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
        message = 'What vocabulary would be most useful for this specific task?';
        break;
      case 'structure':
        message = 'How should I structure my response for this specific task?';
        break;
      case 'grammar':
        message = 'What grammar points should I focus on for this type of task?';
        break;
    }
    if (message) sendMessage(message);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={chatRef}
      className="fixed z-50 transition-all duration-300 ease-in-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: isDragging ? 'rotate(2deg)' : 'rotate(0deg)',
      }}
      onMouseDown={undefined}
    >
      <Card className="bg-background/95 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
        {/* Header */}
        <div 
          className="drag-handle flex items-center justify-between p-3 bg-muted/30 rounded-t-lg cursor-move"
          onMouseDown={(e) => handleMouseDown(e, 'drag')}
        >
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/dc03c5f0-f40a-40f2-a71a-0b12438f0f6b.png" alt="Foxbot" className="w-8 h-8 rounded-full object-cover" />
            <span className="font-semibold text-sm">Foxbot Assistant</span>
            <Move className="w-3 h-3 text-muted-foreground ml-1" />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 hover:bg-white/20 rounded-md"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="h-10 w-10 p-0 hover:bg-muted/60 rounded-md"
            >
              <X className="w-5 h-5" />
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
            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                 >
                   <div className="whitespace-pre-wrap">{message.text}</div>
                 </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg text-sm">
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
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-primary/30 hover:bg-primary/50 transition-colors rounded-tl-lg"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-primary/60 rounded-full"></div>
        </div>
      </Card>
    </div>
  );
};
