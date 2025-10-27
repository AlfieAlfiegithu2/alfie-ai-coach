import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mic, Volume2, Bot, User, Sparkles, MessageSquare, Send, Settings, Globe, Target, Brain } from 'lucide-react';
import { ElevenLabsVoiceOptimized } from '@/components/ElevenLabsVoiceOptimized';
import { VoiceSelection } from '@/components/VoiceSelection';
import { TopicSelection } from '@/components/TopicSelection';
import { ModeSelection } from '@/components/ModeSelection';
import { supabase } from '@/integrations/supabase/client';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

type Msg = { role: 'assistant' | 'user'; content: string };
type TutorJSON = {
  tutor_reply: string;
  translated_reply?: string;
  micro_feedback: string[];
  scores: { fluency: number; lexical: number; grammar: number; pronunciation: number };
  follow_up: string;
  keywords: string[];
  conversation_starter?: string;
};

const SpeakingTutor = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [autoplay, setAutoplay] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastAI, setLastAI] = useState<TutorJSON | null>(null);
  const [model, setModel] = useState<'gpt-4o-mini' | 'gpt-4o'>('gpt-4o-mini');
  const [initialLoading, setInitialLoading] = useState(true);
  const [conversationMode, setConversationMode] = useState<'waiting' | 'active' | 'paused'>('waiting');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('9BWtsMINqrJLrRacOk9x'); // Default to Rachel
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [showTopicSelection, setShowTopicSelection] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'topic' | 'voice' | 'mode' | 'ready' | 'complete'>('topic');
  const [conversationModeType, setConversationModeType] = useState<'gemini' | 'structured'>('gemini'); // gemini = simple, structured = complex with scores
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isAIListening, setIsAIListening] = useState(false);
  const [autoListening, setAutoListening] = useState(true); // Auto-listening mode
  const { toast } = useToast();

  const smoothScores = useRef({ fluency: 6.0, lexical: 6.0, grammar: 6.0, pronunciation: 6.0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef({ final: '', interim: '', isFinal: false });

  const displayedScores = useMemo(() => smoothScores.current, [lastAI]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation with AI greeting
  useEffect(() => {
    if (onboardingStep === 'ready') {
      setInitialLoading(true);
      const initializeConversation = async () => {
        try {
      // Use different functions based on mode for initialization too
      const initFunctionName = conversationModeType === 'gemini' ? 'gemini-chat' : 'conversation-tutor';
      const initRequestBody = conversationModeType === 'gemini'
        ? {
            message: `Start a conversation practice session about ${selectedTopic?.replace('-', ' ') || 'general topics'}. Ask an engaging opening question to begin our English speaking practice.`,
            context: 'english_tutor'
          }
        : {
            initialize: true,
            prefs: {
              model,
              targetLanguage: selectedLanguage || undefined
            },
            topic: selectedTopic
          };

      const { data, error } = await supabase.functions.invoke(initFunctionName, {
        body: initRequestBody
      });

          if (error) throw error;

          // Handle initialization response based on mode
          let reply: string;
          let json: TutorJSON | null = null;

          if (conversationModeType === 'gemini') {
            reply = data?.response || 'Hi! Let\'s practice speaking. What do you enjoy doing in your free time?';
            setLastAI(null);
          } else {
            json = data?.json || null;
            reply = data?.reply || json?.tutor_reply || json?.follow_up || 'Hi! Let\'s practice speaking. What do you enjoy doing in your free time?';
            setLastAI(json);
          }

          setMessages([{ role: 'assistant', content: reply }]);
          setConversationMode('active');

          // Enable auto-listening after conversation starts
          setTimeout(() => {
            setAutoListening(true);
          }, 2000);
        } catch (e) {
          console.error('Failed to initialize conversation:', e);
          // Fallback message
          const fallbackMessage = 'Hi! Let\'s practice speaking. What do you enjoy doing in your free time?';
          setMessages([{ role: 'assistant', content: fallbackMessage }]);
          setConversationMode('active');

          // Enable auto-listening for fallback too
          setTimeout(() => {
            setAutoListening(true);
          }, 2000);

          toast({
            title: "Connection Issue",
            description: "Using fallback greeting. Please check your connection.",
            variant: "destructive"
          });
        } finally {
          setInitialLoading(false);
        }
      };

      initializeConversation();
    }
  }, [model, toast, onboardingStep, selectedTopic]);

  const append = (m: Msg) => setMessages(prev => [...prev, m]);

  const handleVoiceResponse = async (text: string) => {
    if (!text.trim() || aiThinking) return;

    console.log('Voice response received:', text);
    setIsAIListening(false); // Stop listening when user starts speaking
    setAutoListening(false); // Temporarily disable auto-listening during processing

    // Add the user's message to the chat
    append({ role: 'user', content: text.trim() });
    setConversationMode('active');

    // Call the tutor with the conversation history
    await callTutor([...messages, { role: 'user', content: text.trim() }]);

    // Re-enable auto-listening after AI responds
    setTimeout(() => {
      setAutoListening(true);
    }, 2000);
  };

  const handleTextSubmit = async (text: string) => {
    if (!text.trim() || aiThinking) return;

    console.log('Text input received:', text);
    setIsAIListening(false); // Stop listening when user submits text
    setAutoListening(false); // Temporarily disable auto-listening during processing

    // Add the user's message to the chat
    append({ role: 'user', content: text.trim() });
    setTextInput('');
    setShowTextInput(false);
    setConversationMode('active');

    // Call the tutor with the conversation history
    await callTutor([...messages, { role: 'user', content: text.trim() }]);

    // Re-enable auto-listening after AI responds
    setTimeout(() => {
      setAutoListening(true);
    }, 2000);
  };

  const callTutor = async (msgs: Msg[]) => {
    setAiThinking(true);
    setIsAIListening(false); // Stop listening when AI starts thinking
    try {
      console.log('🤖 Calling tutor with messages:', msgs);
      console.log('📋 Mode:', conversationModeType, 'Language:', selectedLanguage);

      // Use different functions based on mode
      const functionName = conversationModeType === 'gemini' ? 'gemini-chat' : 'conversation-tutor';
      const requestBody = conversationModeType === 'gemini'
        ? {
            message: `Continue our conversation naturally. Previous context: ${msgs.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nStudent just said: ${msgs[msgs.length - 1]?.content || ''}\n\nRespond as an English tutor helping with speaking practice.`,
            context: 'english_tutor'
          }
        : {
            messages: msgs.map(m => ({ role: m.role, content: m.content })),
            prefs: {
              model,
              targetLanguage: selectedLanguage || undefined
            }
          };

      console.log(`📤 Calling ${functionName}:`, { requestBody });

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      console.log(`📥 ${functionName} response:`, {
        data,
        error,
        status: data?.status,
        hasResponse: !!data?.response,
        hasJson: !!data?.json,
        hasReply: !!data?.reply
      });

      if (error) {
        console.error(`❌ ${functionName} error:`, error);
        console.error(`❌ Error details:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`API Error: ${error.message || JSON.stringify(error)}`);
      }

      // Check if response indicates failure
      if (data?.success === false) {
        console.error(`❌ ${functionName} returned failure:`, data.error);
        throw new Error(`API returned failure: ${data.error}`);
      }

      // Check if we got a valid response
      if (!data) {
        console.error(`❌ ${functionName} returned no data`);
        throw new Error(`API returned no data`);
      }

      // Handle response based on mode
      let reply: string;
      let json: TutorJSON | null = null;

      if (conversationModeType === 'gemini') {
        reply = data?.response || 'I\'m sorry, I didn\'t understand that. Could you say that again?';
        setLastAI(null); // No structured data in gemini mode
        console.log('💬 Gemini response:', reply.substring(0, 100));

        if (!data?.response) {
          console.warn('⚠️ Gemini response missing:', { dataKeys: Object.keys(data || {}) });
        }
      } else {
        // Parse response - handle both old format (data.json) and new format (data contains json directly)
        json = data?.json || data;

        // Validate that we have the necessary fields
        if (!json?.tutor_reply && !json?.follow_up && !data?.reply) {
          console.warn('⚠️ Response missing expected fields:', {
            hasJson: !!json,
            dataKeys: Object.keys(data || {}),
            jsonKeys: Object.keys(json || {})
          });
        }

        reply = data?.reply || json?.tutor_reply || json?.follow_up || 'Could you tell me more about that?';
        console.log('📝 Structured response:', {
          reply: reply.substring(0, 100),
          hasScores: !!json?.scores,
          dataKeys: Object.keys(data || {}),
          jsonKeys: Object.keys(json || {})
        });

        // Smooth score updates (small deltas) - only for structured mode
        if (json?.scores) {
          const s = smoothScores.current;
          const next = json.scores;
          const lerp = (a: number, b: number) => a + Math.max(-0.3, Math.min(0.3, b - a));
          smoothScores.current = {
            fluency: lerp(s.fluency, next.fluency),
            lexical: lerp(s.lexical, next.lexical),
            grammar: lerp(s.grammar, next.grammar),
            pronunciation: lerp(s.pronunciation, next.pronunciation)
          };
        }
      }

      setLastAI(json);
      append({ role: 'assistant', content: reply });

      console.log('✅ AI reply added:', reply);

      // After AI responds, set up listening state (auto mode)
      setTimeout(() => {
        if (autoListening && !isListening) {
          setIsAIListening(true);
        }
      }, 1000);
    } catch (e) {
      console.error('❌ Error in callTutor:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      console.error('📋 Full error details:', {
        message: errorMessage,
        stack: e instanceof Error ? e.stack : 'No stack',
        conversationModeType,
        selectedLanguage
      });

      // Check if it's a network error or API error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        append({ role: 'assistant', content: 'I\'m having trouble connecting right now. Please check your internet connection and try again.' });
      } else {
        append({ role: 'assistant', content: 'Sorry—I didn\'t catch that. Could you please say that again more clearly?' });
      }

      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setAiThinking(false);
    }
  };



  // Auto-start listening when AI finishes speaking
  useEffect(() => {
    if (!isAISpeaking && !isListening && !aiThinking && autoListening && conversationMode === 'active') {
      // Auto-start listening after a brief delay
      const timer = setTimeout(() => {
        if (!isListening && !isAISpeaking && !aiThinking) {
          console.log('🔄 Auto-starting speech recognition...');
          startListening();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAISpeaking, isListening, aiThinking, autoListening, conversationMode]);

  const startListening = () => {
    if (isListening || isAISpeaking || aiThinking) {
      console.log('⚠️ Already listening, AI is speaking, or AI is thinking, skipping...');
      return;
    }

    setIsListening(true);
    setIsAIListening(false); // Clear AI listening state when user starts speaking

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive"
      });
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Keep listening continuously
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('✅ Speech recognition STARTED (continuous mode)');
        transcriptRef.current = { final: '', interim: '', isFinal: false };
      };

      recognitionRef.current.onresult = async (event: any) => {
        console.log('🎤 Speech result event:', { resultIndex: event.resultIndex, resultsLength: event.results.length });

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            transcriptRef.current.final += transcript + ' ';
            transcriptRef.current.isFinal = true;
            console.log('✅ FINAL speech:', { transcript, confidence, fullFinal: transcriptRef.current.final });
          } else {
            transcriptRef.current.interim = transcript;
            console.log('📝 INTERIM speech:', transcript);
          }
        }

        // Clear existing timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Process final result after silence
        if (transcriptRef.current.isFinal && transcriptRef.current.final.trim()) {
          silenceTimeoutRef.current = setTimeout(async () => {
            const finalText = transcriptRef.current.final.trim();
            console.log('⏱️ Processing final speech:', finalText);
            if (finalText && finalText.length > 3) { // Only process if meaningful content
              await handleVoiceResponse(finalText);
              // Reset for next speech input
              transcriptRef.current = { final: '', interim: '', isFinal: false };
            }
          }, 1500); // Wait 1.5 seconds after speech ends
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        setIsListening(false);

        const errorMessages: Record<string, string> = {
          'no-speech': '🔇 No speech detected. Still listening...',
          'audio-capture': '🎤 No microphone detected. Please check permissions.',
          'network': '🌐 Network error. Check your connection.',
          'not-allowed': '❌ Microphone access denied. Please allow microphone access.',
          'service-not-allowed': '🚫 Speech recognition service blocked.',
          'language-not-supported': '🌍 Language not supported.',
        };

        // For non-critical errors, try to restart automatically
        const shouldRetry = ['no-speech', 'audio-capture', 'network'].includes(event.error);

        if (shouldRetry && autoListening) {
          console.log('🔄 Auto-retrying speech recognition in 2 seconds...');
          toast({
            title: "Voice Error",
            description: errorMessages[event.error] || 'Voice recognition error - retrying...',
            variant: "destructive"
          });

          setTimeout(() => {
            if (autoListening && !isAISpeaking) {
              startListening();
            }
          }, 2000);
        } else {
          toast({
            title: "Voice Error",
            description: errorMessages[event.error] || 'Voice recognition error',
            variant: "destructive"
          });
        }
      };

      recognitionRef.current.onend = () => {
        console.log('⏹️ Speech recognition ended');
        setIsListening(false);

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Auto-restart if in auto-listening mode and not speaking or thinking
        if (autoListening && !isAISpeaking && !aiThinking && transcriptRef.current.final.trim()) {
          console.log('⏹️ Processing remaining text:', transcriptRef.current.final);
          handleVoiceResponse(transcriptRef.current.final.trim());
          transcriptRef.current = { final: '', interim: '', isFinal: false };
        }

        // Auto-restart listening if in auto mode and AI is not speaking or thinking
        if (autoListening && !isAISpeaking && !aiThinking) {
          console.log('🔄 Auto-restarting speech recognition...');
          setTimeout(() => {
            if (autoListening && !isAISpeaking && !aiThinking) {
              startListening();
            }
          }, 1000);
        }
      };
    }

    try {
      recognitionRef.current.start();
      console.log('🚀 Recognition.start() called (continuous mode)');
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);

      // Retry once after error
      if (autoListening) {
        setTimeout(() => {
          if (autoListening && !isAISpeaking) {
            startListening();
          }
        }, 2000);
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setAutoListening(false); // Disable auto mode when manually stopped
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  };

  const toggleAutoListening = () => {
    if (autoListening) {
      stopListening();
    } else {
      setAutoListening(true);
      if (!isAISpeaking && !aiThinking) {
        startListening();
      }
    }
  };

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    setOnboardingStep('voice');
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language || null);
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    setOnboardingStep('mode');
    setShowVoiceSelection(false);
  };

  const handleModeSelect = (mode: 'gemini' | 'structured') => {
    setConversationModeType(mode);
    setOnboardingStep('ready');
  };

  const handleStartConversation = () => {
    setOnboardingStep('ready');
    setShowTopicSelection(false);
  };

  const handleSkipSetup = () => {
    setOnboardingStep('ready');
    setShowTopicSelection(false);
    setShowVoiceSelection(false);
  };

  const startNewTopic = async () => {
    setInitialLoading(true);
    setMessages([]);
    setLastAI(null);
    setConversationMode('waiting');

    // Re-initialize with a new topic
    try {
      // Use different functions based on mode for new topic
      const newTopicFunctionName = conversationModeType === 'gemini' ? 'gemini-chat' : 'conversation-tutor';
      const newTopicRequestBody = conversationModeType === 'gemini'
        ? {
            message: 'Start a completely different conversation topic. Ask an engaging new question to change the subject.',
            context: 'english_tutor'
          }
        : {
            initialize: true,
            prefs: {
              model,
              targetLanguage: selectedLanguage || undefined
            },
            new_topic: true
          };

      const { data, error } = await supabase.functions.invoke(newTopicFunctionName, {
        body: newTopicRequestBody
      });

      if (error) throw error;

      // Handle new topic response based on mode
      let reply: string;
      let json: TutorJSON | null = null;

      if (conversationModeType === 'gemini') {
        reply = data?.response || 'Hi! Let\'s practice speaking. What do you enjoy doing in your free time?';
        setLastAI(null);
      } else {
        json = data?.json || null;
        reply = data?.reply || json?.tutor_reply || json?.follow_up || 'Hi! Let\'s practice speaking. What do you enjoy doing in your free time?';
        setLastAI(json);
      }

      setMessages([{ role: 'assistant', content: reply }]);
      setConversationMode('active');

      // Enable auto-listening after conversation starts
      setTimeout(() => {
        setAutoListening(true);
      }, 2000);
    } catch (e) {
      console.error('Failed to start new topic:', e);
      const fallbackMessage = 'Hi! Let\'s practice speaking. What do you enjoy doing in your free time?';
          setMessages([{ role: 'assistant', content: fallbackMessage }]);
          setConversationMode('active');

          // Enable auto-listening even for fallback
          setTimeout(() => {
            setAutoListening(true);
          }, 2000);

          toast({
            title: "Connection Issue",
            description: "Using fallback greeting. Please check your connection.",
            variant: "destructive"
          });
        } finally {
          setInitialLoading(false);
        }
  };

  // Show onboarding flow first
  if (onboardingStep !== 'ready' && onboardingStep !== 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {onboardingStep === 'topic' ? (
          <TopicSelection
            selectedTopic={selectedTopic}
            selectedLanguage={selectedLanguage}
            onTopicSelect={handleTopicSelect}
            onLanguageSelect={handleLanguageSelect}
            onStart={handleStartConversation}
            onSkip={handleSkipSetup}
          />
        ) : onboardingStep === 'voice' ? (
          <VoiceSelection
            selectedVoice={selectedVoice}
            onVoiceSelect={handleVoiceSelect}
            onClose={() => setShowVoiceSelection(false)}
          />
        ) : (
          <ModeSelection
            selectedMode={conversationModeType === 'gemini' ? 'gemini' : 'structured'}
            onModeSelect={handleModeSelect}
            onBack={() => setOnboardingStep('voice')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Premium Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Speaking Coach</h1>
                <p className="text-sm text-gray-600 font-medium">Professional English Practice</p>
                <div className="flex items-center gap-2">
                  <Badge variant={conversationMode === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {conversationMode === 'active' ? 'Active' : 'Starting...'}
                  </Badge>
                  {selectedTopic && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      <Target className="w-3 h-3 mr-1" />
                      {selectedTopic.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                  {selectedLanguage && selectedLanguage !== 'en' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <Globe className="w-3 h-3 mr-1" />
                      {LANGUAGES.find(l => l.code === selectedLanguage)?.flag} {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${conversationModeType === 'gemini' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                    <Brain className="w-3 h-3 mr-1" />
                    {conversationModeType === 'gemini' ? 'Gemini Chat' : 'Structured Mode'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={autoplay ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAutoplay(v => !v)}
                      className="h-7 px-2 text-xs"
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      {autoplay ? 'Voice On' : 'Voice Off'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVoiceSelection(true)}
                      className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Voice
                    </Button>
                    <Button
                      variant={model === 'gpt-4o-mini' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setModel('gpt-4o-mini')}
                      className="h-7 px-2 text-xs"
                    >
                      Mini
                    </Button>
                    <Button
                      variant={model === 'gpt-4o' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setModel('gpt-4o')}
                      className="h-7 px-2 text-xs"
                    >
                      Pro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewTopic}
              disabled={initialLoading}
              className="text-xs"
            >
              New Topic
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Chat Area */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Performance Dashboard */}
        <div className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Performance</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live tracking</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
              <div className="text-2xl font-bold text-blue-700">{displayedScores.fluency.toFixed(1)}</div>
              <div className="text-xs text-blue-600 font-medium">Fluency</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200/50">
              <div className="text-2xl font-bold text-purple-700">{displayedScores.lexical.toFixed(1)}</div>
              <div className="text-xs text-purple-600 font-medium">Vocabulary</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200/50">
              <div className="text-2xl font-bold text-green-700">{displayedScores.grammar.toFixed(1)}</div>
              <div className="text-xs text-green-600 font-medium">Grammar</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200/50">
              <div className="text-2xl font-bold text-orange-700">{displayedScores.pronunciation.toFixed(1)}</div>
              <div className="text-xs text-orange-600 font-medium">Pronunciation</div>
            </div>
          </div>
        </div>

        {/* Loading state for initial message */}
        {initialLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-600">Starting conversation...</p>
            </div>
          </div>
        )}

        {/* Premium Chat Messages */}
        <div className="space-y-8 mb-8 max-h-[60vh] overflow-auto bg-white/30 backdrop-blur-sm rounded-3xl p-6 border border-gray-200/30 shadow-sm">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex animate-in slide-in-from-bottom-6 duration-700 ${
                m.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className={`max-w-[85%] ${m.role === 'assistant' ? 'mr-12' : 'ml-12'}`}>
                {/* Premium Avatar */}
                <div className={`flex items-center gap-3 mb-3 transition-all duration-300 ${
                  m.role === 'assistant' ? '' : 'flex-row-reverse'
                }`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                    m.role === 'assistant'
                      ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {m.role === 'assistant' ? (
                      <Bot className="h-5 w-5 text-white" />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                      {m.role === 'assistant' ? 'AI Coach' : 'You'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {m.role === 'assistant' ? 'Professional Tutor' : 'Student'}
                    </span>
                  </div>
                </div>

                {/* Premium Message Bubble */}
                <div className={`relative transform transition-all duration-500 hover:scale-[1.01] ${
                  m.role === 'assistant'
                    ? 'bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-3xl rounded-tl-md px-6 py-4 shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white rounded-3xl rounded-tr-md px-6 py-4 shadow-lg hover:shadow-xl'
                }`}>
                  <div className="text-base leading-relaxed font-medium">{m.content}</div>

                  {/* Translation Display */}
                  {m.role === 'assistant' && lastAI?.translated_reply && selectedLanguage && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500 font-medium">
                          {LANGUAGES.find(l => l.code === selectedLanguage)?.flag} {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed text-gray-700 italic bg-gray-50 p-3 rounded-lg">
                        {lastAI.translated_reply}
                      </div>
                    </div>
                  )}

                  {/* Voice component for assistant messages */}
                  {m.role === 'assistant' && autoplay && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <ElevenLabsVoiceOptimized
                        text={m.content}
                        voiceId={selectedVoice}
                        autoPlay={true}
                        onPlayStart={() => setIsAISpeaking(true)}
                        onPlayEnd={() => {
                          setIsAISpeaking(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* AI Speaking Indicator */}
        {isAISpeaking && (
          <div className="flex justify-start mb-6">
            <div className="max-w-[80%] mr-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600">AI Tutor</span>
              </div>
              <div className="bg-white border border-gray-200/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Speaking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Listening Indicator */}
        {isAIListening && (
          <div className="flex justify-start mb-6">
            <div className="max-w-[80%] mr-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600">AI Tutor</span>
              </div>
              <div className="bg-white border border-gray-200/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Listening...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Thinking Indicator */}
        {aiThinking && (
          <div className="flex justify-start mb-6">
            <div className="max-w-[80%] mr-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600">AI Tutor</span>
              </div>
              <div className="bg-white border border-gray-200/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Micro-feedback */}
        {lastAI && messages.length > 1 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lastAI.micro_feedback?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-blue-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Quick Feedback
                  </h4>
                  <ul className="space-y-1">
                    {lastAI.micro_feedback.slice(0, 2).map((feedback, i) => (
                      <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        {feedback}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lastAI.keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-purple-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    New Vocabulary
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {lastAI.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {lastAI.conversation_starter && (
              <div className="mt-4 p-3 bg-white/50 rounded-xl border border-purple-200/50">
                <h4 className="text-sm font-semibold mb-1 text-purple-900">💡 Topic Suggestion:</h4>
                <p className="text-sm text-purple-800">{lastAI.conversation_starter}</p>
              </div>
            )}
          </div>
        )}

        {/* Text Input Option */}
        {showTextInput && (
          <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Type your response here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTextSubmit(textInput);
                  }
                }}
                className="flex-1"
                disabled={aiThinking}
              />
              <Button
                onClick={() => handleTextSubmit(textInput)}
                disabled={aiThinking || !textInput.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  setShowTextInput(false);
                  setTextInput('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Premium Voice Input */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-200/60 p-6 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* Auto-listening status indicator */}
              {autoListening && (
                <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg border border-green-400/50 flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Auto-Listening Active
                  </div>
                </div>
              )}

              <Button
                size="lg"
                onClick={toggleAutoListening}
                className={`w-20 h-20 rounded-full transition-all duration-500 shadow-2xl ${
                  isListening
                    ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse scale-110 shadow-red-500/40'
                    : autoListening && !isAISpeaking && !aiThinking
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/40 animate-pulse'
                    : isAISpeaking
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/40'
                    : aiThinking
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-yellow-500/40 animate-pulse'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-gray-500/40'
                }`}
              >
                <Mic className={`h-8 w-8 text-white transition-transform duration-500 ${
                  isListening ? 'scale-110' : autoListening ? 'animate-pulse' : ''
                }`} />
              </Button>

              {/* Status Indicators */}
              {isListening && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                  <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-2xl text-sm font-semibold animate-bounce shadow-lg border border-red-400/50">
                    🎤 Listening...
                  </div>
                </div>
              )}

              {autoListening && !isListening && !isAISpeaking && !aiThinking && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg border border-green-400/50">
                    👂 Ready to Listen
                  </div>
                </div>
              )}

              {isAISpeaking && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg border border-blue-400/50">
                    🔊 AI Speaking...
                  </div>
                </div>
              )}

              {aiThinking && (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                  <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg border border-yellow-400/50">
                    🤔 AI Thinking...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {autoListening ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Auto-listening: Always ready</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="font-medium">Click microphone to start listening</span>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTextInput(!showTextInput)}
                className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all"
                disabled={aiThinking}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {showTextInput ? 'Hide Text' : 'Type Instead'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoiceSelection(true)}
                className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all"
                disabled={aiThinking}
              >
                <Globe className="h-4 w-4 mr-2" />
                Change Voice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAutoListening}
                className={`text-sm px-4 py-2 rounded-xl transition-all ${
                  autoListening
                    ? 'text-green-600 hover:text-green-900 hover:bg-green-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                disabled={aiThinking}
              >
                <Brain className="h-4 w-4 mr-2" />
                {autoListening ? 'Auto ON' : 'Auto OFF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Flow - only show if in onboarding steps */}
      {onboardingStep !== 'ready' && onboardingStep !== 'complete' && (
        <>
          {onboardingStep === 'topic' && (
            <TopicSelection
              selectedTopic={selectedTopic}
              selectedLanguage={selectedLanguage}
              onTopicSelect={handleTopicSelect}
              onLanguageSelect={handleLanguageSelect}
              onStart={handleStartConversation}
              onSkip={handleSkipSetup}
            />
          )}

          {onboardingStep === 'voice' && (
            <VoiceSelection
              selectedVoice={selectedVoice}
              onVoiceSelect={handleVoiceSelect}
              onClose={() => setShowVoiceSelection(false)}
            />
          )}

          {onboardingStep === 'mode' && (
            <ModeSelection
              selectedMode={conversationModeType === 'gemini' ? 'gemini' : 'structured'}
              onModeSelect={handleModeSelect}
              onBack={() => setOnboardingStep('voice')}
            />
          )}
        </>
      )}

      {showVoiceSelection && (
        <VoiceSelection
          selectedVoice={selectedVoice}
          onVoiceSelect={handleVoiceSelect}
          onClose={() => setShowVoiceSelection(false)}
        />
      )}
    </div>
  );
};

export default SpeakingTutor;


