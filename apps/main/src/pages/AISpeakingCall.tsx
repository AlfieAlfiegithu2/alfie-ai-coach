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
  pronunciation?: { score: number; feedback: string };
};

type SpeechMode = 'web-speech' | 'google-cloud' | 'none';

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

  const recognitionRef = useRef<any>(null);
  const conversationHistoryRef = useRef('Starting new IELTS Speaking practice session');
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationIntervalRef = useRef<any>(null);
  const recognitionRestartingRef = useRef(false);
  const isPlayingTtsRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const googleCloudIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const googleCloudChunksRef = useRef<Uint8Array[]>([]);

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
      setTimeout(() => {
        try {
          if (recognitionRef.current && callState !== 'idle') {
            recognition.start();
            addDebugLog('🔄 Recognition restarted after onend');
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

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, livePartial]);

  const playGreetingAndListen = async () => {
    try {
      addDebugLog('🎤 Playing AI greeting...');
      const greetingText = "Hello! I'm English Tutora, your IELTS Speaking coach. Let's practice together. What would you like to talk about today?";
      
      // Use Google Cloud TTS for greeting (same as responses)
      const googleCloudApiKey = 'AIzaSyB4b-vDRpqbEZVMye8LBS6FugK1Wtgm1Us';
      addDebugLog(`📝 Calling Google Cloud TTS with voice: ${selectedVoice}`);
      
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text: greetingText },
            voice: { languageCode: 'en-US', name: selectedVoice },
            audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 0.95 },
          }),
        }
      );

      if (!response.ok) {
        addDebugLog(`❌ Google Cloud TTS error: ${response.status} ${response.statusText}`);
        throw new Error(`Greeting TTS failed: ${response.statusText}`);
      }

      const data = await response.json();
      const audioContent = data.audioContent;

      if (!audioContent) {
        addDebugLog('❌ No audio content in greeting response');
        throw new Error('No audio content returned');
      }

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
        setTranscript(prev => [...prev, { speaker: 'tutora', text: greetingText }]);
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          addDebugLog('PLAY_END greeting');
          isPlayingTtsRef.current = false;
          addDebugLog('✅ Greeting finished, starting to listen...');
          setCallState('listening');
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
              addDebugLog('🎤 Speech recognition started');
            } catch (e) {
              addDebugLog('⚠️ Could not start recognition: ' + String(e));
            }
          }, 500);
        };
        
        audioRef.current.onerror = (e) => {
          addDebugLog('❌ Audio playback error: ' + String(e));
          isPlayingTtsRef.current = false;
          setCallState('listening');
          recognitionRef.current?.start();
        };
        
        audioRef.current.play().catch(e => {
          addDebugLog('❌ Could not play audio: ' + String(e));
          isPlayingTtsRef.current = false;
          setCallState('listening');
          recognitionRef.current?.start();
        });
      }
    } catch (e) {
      addDebugLog('❌ Greeting error: ' + String(e));
      addDebugLog('📝 Starting listening anyway...');
      setCallState('listening');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        addDebugLog('⚠️ Could not start: ' + String(err));
      }
    }
  };

  const handleStudentTranscript = async (studentText: string) => {
    addDebugLog(`📢 Processing student text: "${studentText}"`);
    setTranscript(prev => [...prev, { speaker: 'student', text: studentText }]);
    setCallState('thinking');

    try {
      addDebugLog('🤔 Calling Gemini for IELTS coaching...');
      
      // Build system prompt for English Tutora
      const systemPrompt = customSystemPrompt || `You are English Tutora, an expert IELTS Speaking coach. Your role is to help students prepare for the IELTS Speaking exam.

Instructions:
- Analyze the student's response based on IELTS band descriptors: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.
- Provide concise, actionable feedback (1-2 sentences max, 120 characters).
- Always end with a follow-up question to keep the conversation flowing.
- Be encouraging but honest about areas for improvement.
- Format your response as JSON: { "response": "...", "feedback_category": "fluency|vocabulary|grammar|pronunciation", "score": 0-9 }`;

      // Build conversation context
      const conversationContext = conversationHistoryRef.current || 'Starting IELTS Speaking practice';
      
      // Call Gemini 2.5 Flash directly with full context
      const coachResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'AIzaSyB4b-vDRpqbEZVMye8LBS6FugK1Wtgm1Us',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: systemPrompt
              }]
            },
            contents: [
              {
                role: 'user',
                parts: [{
                  text: `Context: ${conversationContext}\n\nStudent's latest response: "${studentText}"\n\nProvide coaching feedback as JSON.`
                }]
              }
            ],
            generationConfig: {
              maxOutputTokens: 150,
              temperature: 0.7,
            }
          })
        }
      );

      if (!coachResponse.ok) {
        addDebugLog(`❌ Gemini coaching error: ${coachResponse.status}`);
        throw new Error(`Coach API failed: ${coachResponse.statusText}`);
      }

      const coachData = await coachResponse.json();
      const responseText = coachData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON from response
      let tutorResponse = 'Great! Keep practicing your speaking skills.';
      let feedbackCategory = 'fluency';
      let score = 6;
      
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          tutorResponse = parsed.response || tutorResponse;
          feedbackCategory = parsed.feedback_category || feedbackCategory;
          score = parsed.score || score;
        } else {
          tutorResponse = responseText.substring(0, 120) || tutorResponse;
        }
      } catch (parseErr) {
        addDebugLog('⚠️ Could not parse Gemini JSON response, using text');
        tutorResponse = responseText.substring(0, 120) || tutorResponse;
      }

      const pronunciationFeedback = {
        score: score,
        feedback: `${feedbackCategory}: ${tutorResponse}`,
        positive: 'Keep speaking naturally'
      };

      addDebugLog(`✅ Coach response: "${tutorResponse}"`);
      addDebugLog(`🎯 Score: ${score}/9, Category: ${feedbackCategory}`);

      // Update conversation history
      conversationHistoryRef.current += `\nStudent: ${studentText}\nTutor: ${tutorResponse}`;

      addDebugLog('🔊 Calling Google Cloud TTS for response...');

      // Use Google Cloud TTS for faster response (0.5-1s, professional quality)
      const googleCloudApiKey = 'AIzaSyB4b-vDRpqbEZVMye8LBS6FugK1Wtgm1Us';
      
      const ttsResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text: tutorResponse.substring(0, 5000) },
            voice: { languageCode: 'en-US', name: 'en-US-Neural2-C' }, // Premium neural voice
            audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 0.95 }, // Clear, slightly slower
          }),
        }
      );

      if (!ttsResponse.ok) {
        addDebugLog(`❌ Google Cloud TTS error: ${ttsResponse.status}`);
        throw new Error(`TTS failed: ${ttsResponse.statusText}`);
      }

      const ttsData = await ttsResponse.json();
      const audioContent = ttsData.audioContent;
      
      if (!audioContent) {
        addDebugLog('❌ No audio content from Google Cloud TTS');
        throw new Error('No audio returned from TTS');
      }
      
      addDebugLog(`✅ TTS_FETCH Google Cloud (${audioContent.length} bytes)`);
      
      // Convert base64 to Blob for MP3
      const binaryString = atob(audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      
      // Add tutor response to transcript with pronunciation score
      setTranscript(prev => [...prev, {
        speaker: 'tutora',
        text: tutorResponse,
        pronunciation: pronunciationFeedback
      }]);

      // Play audio with mic coordination
      if (audioRef.current) {
        try { recognitionRef.current?.stop(); } catch {}
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
            try {
              recognitionRef.current?.start();
              addDebugLog('🎤 Recognition restarted');
            } catch (e) {
              addDebugLog('⚠️ Could not restart recognition: ' + String(e));
            }
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
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
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
    recognitionRef.current?.stop();
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
