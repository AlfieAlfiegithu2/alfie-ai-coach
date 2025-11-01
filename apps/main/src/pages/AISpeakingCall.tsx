"use client";

import React, { useEffect, useRef, useState } from 'react';
import StudentLayout from '@/components/StudentLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type TranscriptSegment = {
  speaker: 'student' | 'tutora';
  text: string;
  translation?: string;
  pronunciation?: { score: number; feedback: string };
};

type SpeechMode = 'web-speech' | 'google-cloud' | 'none';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

const AISpeakingCall: React.FC = () => {
  const { toast } = useToast();
  const [callState, setCallState] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'error'>('idle');
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [livePartial, setLivePartial] = useState('');
  const [duration, setDuration] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [speechMode, setSpeechMode] = useState<'web-speech' | 'google-cloud' | 'none'>('web-speech');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-Chirp3-HD-Kore');
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  const AVAILABLE_VOICES = [
    // Chirp3 Premium Voices (Latest, Most Natural)
    { id: 'en-US-Chirp3-HD-Kore', name: 'Kore - Professional', gender: 'Female' },
    { id: 'en-US-Chirp3-HD-Puck', name: 'Puck - Upbeat', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Zephyr', name: 'Zephyr - Bright', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Charon', name: 'Charon - Informative', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Fenrir', name: 'Fenrir - Energetic', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Leda', name: 'Leda - Youthful', gender: 'Female' },
    { id: 'en-US-Chirp3-HD-Orus', name: 'Orus - Grounded', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Alnilam', name: 'Alnilam - Strong', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Rasalgethi', name: 'Rasalgethi - Informative', gender: 'Male' },
    { id: 'en-US-Chirp3-HD-Achernar', name: 'Achernar - Soft', gender: 'Female' },
    
    // Neural2 High Quality Voices
    { id: 'en-US-Neural2-C', name: 'Neural2-C - Natural Female', gender: 'Female' },
    { id: 'en-US-Neural2-A', name: 'Neural2-A - Natural Male', gender: 'Male' },
    { id: 'en-US-Neural2-F', name: 'Neural2-F - Warm Female', gender: 'Female' },
    { id: 'en-US-Neural2-E', name: 'Neural2-E - Warm Male', gender: 'Male' },
    
    // Additional Premium Options
    { id: 'en-US-Casual-K', name: 'Casual - Conversational', gender: 'Male' },
    { id: 'en-US-Chirp-HD-F', name: 'Chirp HD - Modern Female', gender: 'Female' },
  ];
  
  const addDebugLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${msg}`);
    setDebugInfo(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Safe function to start recognition - checks state before starting
  const safeStartRecognition = () => {
    if (!recognitionRef.current) {
      addDebugLog('⚠️ Recognition not initialized');
      return false;
    }
    
    try {
      // Check if already running
      if (recognitionStateRef.current === 'listening' || recognitionStateRef.current === 'starting') {
        addDebugLog('⚠️ Recognition already running, skipping start');
        return false;
      }
      
      recognitionStateRef.current = 'starting';
      recognitionRef.current.start();
      recognitionStateRef.current = 'listening';
      addDebugLog('✅ Recognition started safely');
      return true;
    } catch (e: any) {
      const errMsg = String(e);
      if (errMsg.includes('already started')) {
        addDebugLog('⚠️ Recognition already started (caught)');
        recognitionStateRef.current = 'listening';
        return false;
      }
      addDebugLog(`❌ Failed to start recognition: ${errMsg}`);
      recognitionStateRef.current = 'idle';
      return false;
    }
  };

  // TTS function with retry logic - ALWAYS uses selectedVoice from state
  const synthesizeTTS = async (text: string, retries = 3): Promise<string> => {
    const googleCloudApiKey = 'AIzaSyB4b-vDRpqbEZVMye8LBS6FugK1Wtgm1Us';
    const voiceToUse = selectedVoice; // Capture current voice to ensure consistency
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        addDebugLog(`📞 TTS attempt ${attempt}/${retries} with voice: ${voiceToUse}...`);
        
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: { text },
              voice: { languageCode: 'en-US', name: voiceToUse },
              audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 0.95 },
            }),
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TTS failed: ${response.status} - ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        if (!data.audioContent) {
          throw new Error('No audio content returned');
        }
        
        addDebugLog(`✅ TTS successful (${data.audioContent.length} bytes)`);
        return data.audioContent;
      } catch (e: any) {
        const errMsg = String(e);
        addDebugLog(`❌ TTS attempt ${attempt} failed: ${errMsg}`);
        
        if (attempt === retries) {
          throw e;
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    
    throw new Error('TTS failed after all retries');
  };

  // Translate text using Gemini
  const translateText = async (text: string, targetLang: string): Promise<string | undefined> => {
    if (targetLang === 'en') return undefined;
    
    try {
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
      addDebugLog(`🌐 Translating "${text.substring(0, 30)}..." to ${langName}...`);
      
      const { data, error } = await supabase.functions.invoke('ai-speaking-chat', {
        body: {
          message: `Translate this English text to ${langName}: "${text}"\n\nIMPORTANT: Return ONLY the translation in ${langName}, no explanations, no English text, just the translation.`
        }
      });
      
      if (error) {
        console.error('Translation API error:', error);
        addDebugLog(`⚠️ Translation API error: ${error.message || JSON.stringify(error)}`);
        return undefined; // Return undefined if translation fails
      }
      
      if (!data?.success || !data?.response) {
        addDebugLog(`⚠️ Translation failed - no response data`);
        return undefined;
      }
      
      let translated = data.response.trim();
      
      // Clean up common issues: remove quotes, explanations, etc.
      translated = translated.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
      translated = translated.replace(/^Translation:\s*/i, ''); // Remove "Translation:" prefix
      translated = translated.replace(/^Here.*?:\s*/i, ''); // Remove "Here's the translation:" prefix
      translated = translated.split('\n')[0]; // Take first line only
      translated = translated.trim();
      
      if (!translated || translated === text || translated.length < 3) {
        addDebugLog(`⚠️ Translation result invalid or same as original`);
        return undefined;
      }
      
      addDebugLog(`✅ Translation successful: "${translated.substring(0, 50)}..."`);
      return translated;
    } catch (e) {
      console.error('Translation error:', e);
      addDebugLog(`⚠️ Translation exception: ${String(e)}`);
      return undefined; // Return undefined on error
    }
  };

  const recognitionRef = useRef<any>(null);
  const conversationHistoryRef = useRef('Starting new IELTS Speaking practice session');
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationIntervalRef = useRef<any>(null);
  const recognitionRestartingRef = useRef(false);
  const isPlayingTtsRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const googleCloudIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const googleCloudChunksRef = useRef<Uint8Array[]>([]);
  const recognitionStateRef = useRef<'idle' | 'starting' | 'listening' | 'stopping'>('idle');

  // Helpers: audio decoding/encoding
  const base64ToUint8 = (b64: string): Uint8Array => {
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch (e) {
      addDebugLog('❌ TTS_DECODE base64 failed');
      throw e;
    }
  };

  const parseAudioMime = (mime?: string): { format: string; sampleRate: number; bitsPerSample: number } => {
    if (!mime) return { format: 'unknown', sampleRate: 24000, bitsPerSample: 16 };
    const lower = mime.toLowerCase();
    const rateMatch = lower.match(/rate\s*=\s*(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    let bitsPerSample = 16;
    const lMatch = lower.match(/l(\d+)/); // audio/L16
    if (lMatch) bitsPerSample = parseInt(lMatch[1], 10) || 16;
    if (lower.includes('wav')) return { format: 'wav', sampleRate, bitsPerSample };
    if (lower.includes('l16') || lower.includes('pcm')) return { format: 'pcm', sampleRate, bitsPerSample };
    return { format: 'unknown', sampleRate, bitsPerSample };
  };

  const wrapPcmAsWav = (pcmBytes: Uint8Array, sampleRate: number, bitsPerSample: number): Uint8Array => {
    const numChannels = 1;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBytes.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;
    const writeString = (s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); offset += s.length; };
    // RIFF header
    writeString('RIFF');
    view.setUint32(offset, 36 + dataSize, true); offset += 4;
    writeString('WAVE');
    // fmt chunk
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4; // PCM chunk size
    view.setUint16(offset, 1, true); offset += 2; // PCM format
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitsPerSample, true); offset += 2;
    // data chunk
    writeString('data');
    view.setUint32(offset, dataSize, true); offset += 4;
    new Uint8Array(buffer, 44).set(pcmBytes);
    return new Uint8Array(buffer);
  };

  const buildPlayableBlobFromInlineData = (inline: { data?: string; mimeType?: string }) => {
    const { data, mimeType } = inline || {} as any;
    if (!data) throw new Error('TTS_FETCH: empty audio data');
    const meta = parseAudioMime(mimeType);
    addDebugLog(`TTS_MIMETYPE ${mimeType || 'unknown'} → format=${meta.format} rate=${meta.sampleRate} bits=${meta.bitsPerSample}`);
    const bytes = base64ToUint8(data);
    let wavBytes = bytes;
    let finalMime = 'audio/wav';
    if (meta.format !== 'wav') {
      addDebugLog('TTS_WRAP_WAV wrapping PCM → WAV');
      wavBytes = wrapPcmAsWav(bytes, meta.sampleRate, meta.bitsPerSample);
    }
    // Copy into a normal ArrayBuffer to satisfy BlobPart typing
    const ab = new ArrayBuffer(wavBytes.byteLength);
    new Uint8Array(ab).set(wavBytes);
    return new Blob([ab], { type: finalMime });
  };

  // Initialize Speech Recognition with automatic restart
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const msg = 'Browser Web Speech API not supported - will use Google Cloud Speech';
      addDebugLog('⚠️ ' + msg);
      setSpeechMode('google-cloud');
      return;
    }

    addDebugLog('✅ Web Speech API available');
    setSpeechMode('web-speech');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      addDebugLog('🎤 Speech recognition started (Web Speech API)');
      setCallState('listening');
      setLivePartial('');
    };

    recognition.onresult = (event: any) => {
      addDebugLog(`📊 onresult fired (result index: ${event.resultIndex}, total results: ${event.results.length})`);
      let interim = '';
      let isFinal = false;
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          isFinal = true;
          finalTranscript = transcript;
          addDebugLog(`✅ Final transcript: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setLivePartial(interim);
      }

      if (isFinal && finalTranscript) {
        setLivePartial('');
        handleStudentTranscript(finalTranscript);
        // Don't auto-restart here - let onend handle it
      }
    };

    recognition.onerror = (event: any) => {
      const errMsg = `Speech recognition error: ${event.error}`;
      addDebugLog('❌ ' + errMsg);
      
      if (event.error === 'no-speech') {
        addDebugLog('⚠️ No speech detected, will restart on onend');
        // Don't restart here - let onend handle it to avoid conflicts
      } else if (event.error === 'network') {
        addDebugLog('⚠️ Network error, falling back to Google Cloud Speech');
        setSpeechMode('google-cloud');
      } else if (event.error !== 'aborted') {
        toast({ title: 'Mic Error', description: errMsg, variant: 'destructive' });
        setCallState('idle');
      }
    };

    recognition.onend = () => {
      addDebugLog('🛑 Speech recognition ended');
      
      // Use guard flag to prevent simultaneous restart attempts
      if (recognitionRestartingRef.current) {
        addDebugLog('⏸️  Already restarting, skipping duplicate attempt');
        return;
      }
      // If we are playing TTS, do not restart; the player will resume mic
      if (isPlayingTtsRef.current) {
        addDebugLog('🛑 onend during TTS playback, will not restart');
        return;
      }
      
      // Set flag and delay to allow state to settle
      recognitionRestartingRef.current = true;
      recognitionStateRef.current = 'idle';
      setTimeout(() => {
        try {
          if (recognitionRef.current && callState !== 'idle' && callState !== 'speaking') {
            safeStartRecognition();
          }
        } catch (e) {
          const errMsg = String(e);
          if (!errMsg.includes('already started')) {
            addDebugLog('⚠️ Could not restart: ' + errMsg);
          }
        } finally {
          recognitionRestartingRef.current = false;
        }
      }, 300);
    };

    recognitionRef.current = recognition;
    addDebugLog('✅ Speech recognition initialized with auto-restart');

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [toast]);

  // Load saved preferences
  useEffect(() => {
    const savedLang = localStorage.getItem('ai-speaking-language');
    if (savedLang) setSelectedLanguage(savedLang);
    
    const savedShowTranslation = localStorage.getItem('ai-speaking-show-translation');
    if (savedShowTranslation !== null) {
      setShowTranslation(savedShowTranslation === 'true');
    }
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, livePartial]);

  const playGreetingAndListen = async () => {
    try {
      addDebugLog('🎤 Playing AI greeting...');
      const greetingText = "Hello! I'm English Tutora, your IELTS Speaking coach. Let's practice together. What would you like to talk about today?";
      
      // Translate greeting if needed
      let greetingTranslation: string | undefined = undefined;
      if (selectedLanguage !== 'en') {
        addDebugLog(`🌐 Translating greeting to ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}...`);
        try {
          greetingTranslation = await translateText(greetingText, selectedLanguage);
          if (greetingTranslation) {
            addDebugLog(`✅ Greeting translation complete: "${greetingTranslation.substring(0, 50)}..."`);
          } else {
            addDebugLog(`⚠️ Greeting translation returned undefined`);
          }
        } catch (e) {
          addDebugLog(`⚠️ Greeting translation failed: ${String(e)}`);
          greetingTranslation = undefined;
        }
      }
      
      addDebugLog(`📝 Calling Google Cloud TTS with voice: ${selectedVoice}`);
      
      // Get TTS audio with retry logic - ALWAYS uses selectedVoice
      const audioContent = await synthesizeTTS(greetingText); // Always use English for TTS
      
      addDebugLog(`✅ TTS_FETCH greeting (${audioContent.length} bytes)`);
      
      // Convert base64 to Blob for MP3
      const binaryString = atob(audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      
      // Play the audio
      if (audioRef.current) {
        try { recognitionRef.current?.stop(); } catch {}
        isPlayingTtsRef.current = true;
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        addDebugLog('PLAY_START greeting');
        setCallState('speaking');
        // Add greeting with translation if needed
        setTranscript(prev => [...prev, {
          speaker: 'tutora',
          text: greetingText,
          translation: greetingTranslation
        }]);
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          addDebugLog('PLAY_END greeting');
          isPlayingTtsRef.current = false;
          addDebugLog('✅ Greeting finished, starting to listen...');
          setCallState('listening');
          setTimeout(() => {
            safeStartRecognition();
          }, 500);
        };
        
        audioRef.current.onerror = (e) => {
          addDebugLog('❌ Audio playback error: ' + String(e));
          isPlayingTtsRef.current = false;
          setCallState('listening');
          setTimeout(() => safeStartRecognition(), 500);
        };
        
        audioRef.current.play().catch(e => {
          addDebugLog('❌ Could not play audio: ' + String(e));
          isPlayingTtsRef.current = false;
          setCallState('listening');
          setTimeout(() => safeStartRecognition(), 500);
        });
      }
    } catch (e) {
      addDebugLog('❌ Greeting error: ' + String(e));
      addDebugLog('📝 Starting listening anyway...');
      setCallState('listening');
      setTimeout(() => {
        safeStartRecognition();
      }, 500);
    }
  };

  const handleStudentTranscript = async (studentText: string) => {
    addDebugLog(`📢 Processing student text: "${studentText}"`);
    setTranscript(prev => [...prev, { speaker: 'student', text: studentText }]);
    setCallState('thinking');

    try {
      addDebugLog('🤔 Calling AI Speaking Chat for real conversation...');
      
      // Build CONVERSATIONAL system prompt (not just feedback)
      const systemPrompt = customSystemPrompt || `You are English Tutora, a friendly and encouraging IELTS Speaking coach who has REAL conversations with students.

Your role: NOT to give feedback on every sentence, but to:
1. ENGAGE with what the student said - respond naturally to their ideas
2. ASK follow-up questions to encourage them to speak more
3. Gently guide toward better English if needed
4. Keep responses SHORT (1-2 sentences max, under 120 chars)
5. Sound natural, not robotic
6. ALWAYS respond with at least one sentence - never stay silent

For example:
- Student: "I like to travel to beaches"
- Bad response: "Good grammar, try to add more details"
- Good response: "That's great! What's your favorite beach destination?"

Always respond conversationally, not with feedback. Your goal is to keep the student talking naturally.`;

      // IMPORTANT: Limit conversation history to last 4 turns to avoid token limit issues and speed up response
      let conversationContext = conversationHistoryRef.current || '';
      const turns = conversationContext.split('\n').filter(line => line.trim());
      const limitedTurns = turns.slice(-4); // Keep only last 4 turns (2 exchanges) for faster processing
      const limitedContext = limitedTurns.join('\n');
      
      addDebugLog(`📝 Context length: ${limitedContext.length} chars, ${turns.length} total turns, using last ${limitedTurns.length}`);

      addDebugLog(`📤 Sending request to AI Speaking Chat function...`);

      // Prepare audio data if available (last 10 seconds of audio)
      let audioBase64: string | undefined = undefined;
      if (googleCloudChunksRef.current && googleCloudChunksRef.current.length > 0) {
        try {
          const audioBlob = new Blob(googleCloudChunksRef.current.slice(-10), { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          audioBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          addDebugLog(`🎵 Prepared audio data: ${audioBase64.length} bytes`);
        } catch (audioError) {
          addDebugLog(`⚠️ Failed to prepare audio data: ${audioError}`);
        }
      }

      addDebugLog(`📤 Request body: message="${studentText.substring(0, 50)}...", audioBase64=${audioBase64 ? audioBase64.length + ' bytes' : 'none'}`);

      const { data: coachData, error: coachError } = await supabase.functions.invoke('ai-speaking-chat', {
        body: {
          message: studentText,
          audioBase64: audioBase64,
          audioMimeType: 'audio/webm'
        }
      });

      addDebugLog(`📡 Raw response: data=${JSON.stringify(coachData).substring(0, 200)}, error=${JSON.stringify(coachError)}`);

      if (coachError) {
        addDebugLog(`❌ Supabase function error: ${coachError.message}`);
        throw new Error(`Supabase function failed: ${coachError.message}`);
      }

      if (!coachData) {
        addDebugLog(`❌ No data returned from function`);
        throw new Error(`No data returned from AI Speaking Chat function`);
      }

      if (!coachData.success) {
        addDebugLog(`❌ Function returned success=false: ${coachData.error || 'Unknown error'}`);
        throw new Error(`AI Speaking Chat failed: ${coachData.error || 'Unknown error'}`);
      }

      // Extract response text from the function response
      let responseText = coachData.response;

      if (!responseText) {
        addDebugLog('❌ No text from AI Speaking Chat - using fallback');
        // Fallback response when AI fails
        responseText = `That's interesting! Can you tell me more about that?`;
      }

      addDebugLog(`✅ AI Speaking Chat response text: "${responseText.substring(0, 100)}"`);

      // Use the response directly (it's already natural conversation)
      let tutorResponse = responseText.trim().substring(0, 200);
      
      // If response is too long, truncate at sentence boundary
      if (responseText.length > 200) {
        const sentences = tutorResponse.split(/[.!?]+/);
        tutorResponse = sentences.slice(0, -1).join('. ');
        if (!tutorResponse.endsWith('.')) tutorResponse += '.';
      }

      // Ensure we always have a response
      if (!tutorResponse || tutorResponse.trim().length === 0) {
        addDebugLog('⚠️ Response was empty after processing, using fallback');
        tutorResponse = `That's interesting! Can you tell me more about that?`;
      }

      addDebugLog(`✅ Final tutor response: "${tutorResponse}"`);

      // Update conversation history with actual exchange
      conversationHistoryRef.current += `\nStudent: ${studentText}\nTutor: ${tutorResponse}`;

      addDebugLog('🔊 Calling Google Cloud TTS for response...');

      // Translate if needed - ALWAYS translate AI responses when language is selected
      // Capture selectedLanguage to ensure it doesn't change during async operations
      const currentLanguage = selectedLanguage;
      addDebugLog(`🔍 Current selectedLanguage value: "${currentLanguage}"`);
      
      let translatedText: string | undefined = undefined;
      if (currentLanguage && currentLanguage !== 'en') {
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.name || currentLanguage;
        addDebugLog(`🌐 Translating AI response to ${langName} (code: ${currentLanguage})...`);
        try {
          translatedText = await translateText(tutorResponse, currentLanguage);
          if (translatedText) {
            addDebugLog(`✅ Translation complete: "${translatedText.substring(0, 50)}..."`);
          } else {
            addDebugLog(`⚠️ Translation returned undefined - will not show translation`);
          }
        } catch (e) {
          addDebugLog(`❌ Translation exception: ${String(e)}`);
          translatedText = undefined;
        }
      } else {
        addDebugLog(`ℹ️ Translation skipped - language is "${currentLanguage}" (should be non-English code)`);
      }

      // Get TTS audio with retry logic
      const audioContent = await synthesizeTTS(tutorResponse); // Always use English for TTS
      
      addDebugLog(`✅ TTS_FETCH Google Cloud (${audioContent.length} bytes)`);
      
      // Convert base64 to Blob for MP3
      const binaryString = atob(audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      
      // Add tutor response to transcript with translation
      const newMessage = {
        speaker: 'tutora' as const,
        text: tutorResponse,
        translation: translatedText || undefined
      };
      
      addDebugLog(`📝 Adding to transcript - text: "${tutorResponse.substring(0, 30)}...", translation: ${translatedText ? `"${translatedText.substring(0, 30)}..."` : 'NONE'}`);
      addDebugLog(`📝 Message object: ${JSON.stringify({ ...newMessage, translation: translatedText || 'undefined' })}`);
      
      setTranscript(prev => [...prev, newMessage]);

      // Play audio with mic coordination
      if (audioRef.current) {
        try { 
          recognitionRef.current?.stop(); 
          recognitionStateRef.current = 'stopping';
        } catch {}
        isPlayingTtsRef.current = true;
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        addDebugLog('PLAY_START response');
        audioRef.current.play();
        setCallState('speaking');

        // When audio finishes, go back to listening
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          addDebugLog('PLAY_END response');
          isPlayingTtsRef.current = false;
          addDebugLog('⏹️ Audio finished, resuming listening');
          setCallState('listening');
          setTimeout(() => {
            safeStartRecognition();
          }, 500);
        };
      } else {
        addDebugLog('❌ No audio element available');
        setCallState('listening');
      }

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      addDebugLog('❌ Error: ' + errMsg);
      console.error('Error in conversation flow:', e);
      
      // Try to recover with a fallback response
      try {
        addDebugLog('🆘 Attempting recovery with fallback...');
        const fallbackText = "I'm having a technical issue, but I'm still here to help! Please try again.";
        
        try {
          const audioContent = await synthesizeTTS(fallbackText);
          const binaryString = atob(audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/mp3' });
          if (audioRef.current) {
            const url = URL.createObjectURL(blob);
            audioRef.current.src = url;
            audioRef.current.play();
            audioRef.current.onended = () => {
              URL.revokeObjectURL(url);
              setCallState('listening');
              setTimeout(() => safeStartRecognition(), 500);
            };
          }
        } catch (ttsErr) {
          addDebugLog('⚠️ Fallback TTS failed: ' + String(ttsErr));
        }
      } catch (recoveryErr) {
        addDebugLog('❌ Recovery failed: ' + String(recoveryErr));
      }
      
      setCallState('listening');
    }
  };

  const startCall = () => {
    addDebugLog(`▶️ Starting call (using ${speechMode})`);
    setTranscript([]);
    setDuration(0);
    setDebugInfo([]);
    conversationHistoryRef.current = 'Starting new IELTS Speaking practice session';

    // Start timer
    durationIntervalRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);

    // Play greeting and then start listening
    addDebugLog('🎤 Requesting mic access and starting greeting...');
    playGreetingAndListen();
  };

  const endCall = () => {
    addDebugLog('⏹️ Ending call');
    try {
      recognitionRef.current?.stop();
      recognitionStateRef.current = 'idle';
    } catch {}
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (googleCloudIntervalRef.current) clearInterval(googleCloudIntervalRef.current);
    setCallState('idle');
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <StudentLayout title="AI Speaking Tutor" showBackButton backPath="/ielts-portal">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Call Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">English Tutora - IELTS Speaking Practice</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Real-time voice conversation with AI coaching</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold">{formatDuration(duration)}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <span>
                    {callState === 'listening' ? '🎤 Listening' : callState === 'thinking' ? '🤔 Thinking...' : callState === 'speaking' ? '🔊 Speaking' : '⚫ Ready'}
                  </span>
                  {speechMode === 'google-cloud' && <Zap className="w-3 h-3" />}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3 justify-center pt-0">
            {callState === 'idle' && (
              <>
                {/* Voice Selection */}
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">Voice:</label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value as any)}
                    className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                    disabled={callState !== 'idle'}
                  >
                    {AVAILABLE_VOICES.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.gender})
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={startCall} size="lg" className="gap-2">
                  <Phone className="w-5 h-5" />
                  Start Call
                </Button>
              </>
            )}
            {(callState === 'listening' || callState === 'thinking' || callState === 'speaking') && (
              <>
                <Button
                  variant={muted ? 'secondary' : 'outline'}
                  onClick={() => setMuted(!muted)}
                  size="lg"
                  className="gap-2"
                >
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {muted ? 'Unmute' : 'Mute'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={endCall}
                  size="lg"
                  className="gap-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </Button>
              </>
            )}
            {callState === 'error' && (
              <Button disabled size="lg" className="gap-2">
                <Loader2 className="w-5 h-5" />
                Browser Not Supported
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Voice Agent Settings */}
        {callState === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Voice Agent Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Mother Language (for Translation)</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    localStorage.setItem('ai-speaking-language', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  AI responses will be translated to your language
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showTranslation"
                  checked={showTranslation}
                  onChange={(e) => {
                    setShowTranslation(e.target.checked);
                    localStorage.setItem('ai-speaking-show-translation', String(e.target.checked));
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="showTranslation" className="text-sm">
                  Show translations in conversation
                </label>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Voice</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  {AVAILABLE_VOICES.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Coach Prompt (Optional)</label>
                <textarea
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  placeholder="Leave blank for default English Tutora IELTS coach. Or describe your custom coaching style..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm h-24 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: "You are a pronunciation coach focused only on accent", "You are a vocabulary expert for advanced learners"
                </p>
              </div>

              <Button onClick={startCall} size="lg" className="w-full gap-2">
                <Phone className="w-5 h-5" />
                Start Call
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Transcript Display */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto space-y-3 pb-4">
            {transcript.length === 0 && !livePartial && callState === 'idle' && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Start a call to begin practicing IELTS Speaking with English Tutora.</p>
              </div>
            )}

            {transcript.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.speaker === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                  msg.speaker === 'student'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.translation && msg.translation.trim() && (
                    <p className="text-xs mt-2 pt-2 border-t border-current/30 opacity-75 italic">
                      {msg.translation}
                    </p>
                  )}
                  {msg.pronunciation && msg.pronunciation.score > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs opacity-75">
                      🎯 Pronunciation: {msg.pronunciation.feedback} ({msg.pronunciation.score}/10)
                    </div>
                  )}
                </div>
              </div>
            ))}

            {livePartial && (
              <div className={`flex ${transcript.filter(t => t.speaker === 'student').length % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm italic opacity-75 ${
                  transcript.filter(t => t.speaker === 'student').length % 2 === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                }`}>
                  {livePartial}
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </CardContent>
        </Card>

        {/* Debug Info Panel */}
        {debugInfo.length > 0 && (
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Debug Logs {speechMode === 'google-cloud' && <span className="text-xs bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded text-orange-800 dark:text-orange-200">Fallback Mode</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.map((log, i) => (
                  <div key={i} className="text-muted-foreground">{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            <p>💡 <strong>Tip:</strong> Speak naturally and at a normal pace. English Tutora will provide real-time pronunciation feedback and coaching on your IELTS Speaking performance.</p>
          </CardContent>
        </Card>

        {/* Hidden audio element for TTS playback */}
        <audio ref={audioRef} />
      </div>
    </StudentLayout>
  );
};

export default AISpeakingCall;
