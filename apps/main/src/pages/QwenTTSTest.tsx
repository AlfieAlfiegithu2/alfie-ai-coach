import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AVAILABLE_VOICES = [
  { id: 'Cherry', name: 'Cherry - Cheerful & Friendly', gender: 'Female' },
  { id: 'Ethan', name: 'Ethan - Bright & Energetic', gender: 'Male' },
  { id: 'Nofish', name: 'Nofish - Designer Voice', gender: 'Neutral' },
  { id: 'Jennifer', name: 'Jennifer - Premium Cinematic', gender: 'Female' },
  { id: 'Ryan', name: 'Ryan - Rhythmic & Dramatic', gender: 'Male' },
  { id: 'Katerina', name: 'Katerina - Mature & Rhythmic', gender: 'Female' },
  { id: 'Elias', name: 'Elias - Academic & Clear', gender: 'Male' },
  { id: 'Jada', name: 'Shanghai-Jada - Lively', gender: 'Female' },
  { id: 'Dylan', name: 'Beijing-Dylan - Teenager', gender: 'Male' },
  { id: 'Sunny', name: 'Sichuan-Sunny - Sweet', gender: 'Female' },
  { id: 'Li', name: 'Nanjing-Li - Patient Teacher', gender: 'Female' },
  { id: 'Marcus', name: 'Shaanxi-Marcus - Sincere', gender: 'Male' },
  { id: 'Roy', name: 'Minnan-Roy - Humorous', gender: 'Male' },
  { id: 'Peter', name: 'Tianjin-Peter - Crosstalk', gender: 'Male' },
  { id: 'Rocky', name: 'Cantonese-Rocky - Witty', gender: 'Male' },
  { id: 'Kiki', name: 'Cantonese-Kiki - Sweet Friend', gender: 'Female' },
  { id: 'Eric', name: 'Sichuan-Eric - Refined', gender: 'Male' },
];

export default function QwenTTSTest() {
  const [text, setText] = useState("Hello! I'm English Tutora, your IELTS Speaking coach. Let's practice together.");
  const [selectedVoice, setSelectedVoice] = useState('Cherry');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  // LLM testing state
  const [llmMessage, setLlmMessage] = useState("What are some tips for IELTS Speaking Part 2?");
  const [llmResponse, setLlmResponse] = useState<string | null>(null);
  const [isLlmLoading, setIsLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  const testQwenTTS = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setAudioUrl(null);
    setDebugInfo('');

    try {
      console.log('🎵 Testing Qwen TTS with:', { text, voice: selectedVoice });
      setDebugInfo('🔄 Calling Edge Function...');

      const { data, error: invokeError } = await supabase.functions.invoke('openrouter-qwen-tts', {
        body: {
          text: text,
          voice: selectedVoice,
          language_type: 'English'
        }
      });

      console.log('Response:', { data, error: invokeError });
      setDebugInfo(`📥 Response received: ${data ? 'Has data' : 'No data'}, ${invokeError ? 'Has error' : 'No error'}`);

      if (invokeError) {
        console.error('Error object:', invokeError);
        console.error('Error type:', typeof invokeError);
        console.error('Error keys:', Object.keys(invokeError || {}));
        
        let errorMsg = 'Unknown error';
        if (invokeError.message) {
          errorMsg = invokeError.message;
        } else if (invokeError.context) {
          errorMsg = typeof invokeError.context === 'string' ? invokeError.context : JSON.stringify(invokeError.context);
        } else if (invokeError.details) {
          errorMsg = typeof invokeError.details === 'string' ? invokeError.details : JSON.stringify(invokeError.details);
        } else {
          errorMsg = JSON.stringify(invokeError, Object.getOwnPropertyNames(invokeError));
        }
        
        setError(errorMsg);
        setDebugInfo(`❌ Error: ${errorMsg}`);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive'
        });
        return;
      }

      if (!data) {
        setError('No data returned from function');
        setDebugInfo('❌ No data in response');
        return;
      }

      if (data.error || data.success === false) {
        const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || data);
        setError(errorMsg);
        setDebugInfo(`❌ Function returned error: ${errorMsg}`);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive'
        });
        return;
      }

      if (data.audioContent) {
        setSuccess(true);
        setDebugInfo(`✅ Audio content received (${data.audioContent.length} bytes)`);
        
        // Convert base64 to audio URL
        try {
          // Clean base64 first
          let cleanedBase64 = data.audioContent.trim().replace(/\s/g, '');
          cleanedBase64 = cleanedBase64.replace(/-/g, '+').replace(/_/g, '/');
          while (cleanedBase64.length % 4) {
            cleanedBase64 += '=';
          }
          
          setDebugInfo(`🔧 Base64 cleaned (${cleanedBase64.length} chars), decoding...`);
          
          const binaryString = atob(cleanedBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          
          setDebugInfo(`✅ Audio decoded successfully (${blob.size} bytes), creating player...`);
          
          // Auto-play audio
          const audio = new Audio(url);
          audio.play().catch(e => {
            console.error('Auto-play failed:', e);
            setDebugInfo(`⚠️ Auto-play failed: ${e.message}`);
            toast({
              title: 'Audio ready',
              description: 'Click play to listen',
            });
          });
          
          toast({
            title: 'Success!',
            description: `Audio generated successfully (${data.audioContent.length} bytes)`,
          });
        } catch (decodeError: any) {
          const errorMsg = `Failed to decode audio: ${decodeError.message || decodeError}`;
          setError(errorMsg);
          setDebugInfo(`❌ Decode error: ${errorMsg}`);
        }
      } else {
        setError('No audio content in response');
        setDebugInfo(`❌ Response keys: ${Object.keys(data).join(', ')}`);
      }

    } catch (err: any) {
      console.error('Test error:', err);
      const errorMsg = err.message || String(err);
      setError(errorMsg);
      setDebugInfo(`❌ Exception: ${errorMsg}`);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testLLM = async () => {
    setIsLlmLoading(true);
    setLlmError(null);
    setLlmResponse(null);

    try {
      console.log('🤖 Testing LLM with message:', llmMessage);
      setDebugInfo('🔄 Calling AI Speaking Chat function...');

      const { data, error: invokeError } = await supabase.functions.invoke('ai-speaking-chat', {
        body: {
          message: llmMessage,
          audioBase64: null
        }
      });

      console.log('LLM Response:', { data, error: invokeError });

      if (invokeError) {
        const errorMsg = invokeError.message || JSON.stringify(invokeError);
        setLlmError(errorMsg);
        setDebugInfo(`❌ LLM Error: ${errorMsg}`);
        toast({
          title: 'LLM Error',
          description: errorMsg,
          variant: 'destructive'
        });
        return;
      }

      if (!data) {
        setLlmError('No data returned from function');
        return;
      }

      if (data.success === false || data.error) {
        const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        setLlmError(errorMsg);
        toast({
          title: 'LLM Error',
          description: errorMsg,
          variant: 'destructive'
        });
        return;
      }

      if (data.response) {
        setLlmResponse(data.response);
        setDebugInfo('✅ LLM response received');
        toast({
          title: 'Success!',
          description: 'LLM response received',
        });
      } else {
        setLlmError('No response in data');
      }

    } catch (err: any) {
      console.error('LLM test error:', err);
      const errorMsg = err.message || String(err);
      setLlmError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLlmLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Qwen 3 TTS Flash & LLM Test Page</CardTitle>
          <CardDescription>
            Test Qwen 3 TTS Flash API for speech synthesis and LLM for conversation. Test different voices, texts, and AI responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Text to Convert</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
              maxLength={600}
            />
            <p className="text-xs text-muted-foreground">
              {text.length} / 600 characters (max for Qwen3-TTS)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger id="voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={testQwenTTS} 
            disabled={isLoading || !text.trim()}
            className="w-full"
          >
            {isLoading ? '🔄 Generating...' : '🎵 Generate Speech'}
          </Button>

          {debugInfo && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs font-mono text-blue-800">{debugInfo}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-semibold text-red-800">Error:</p>
              <p className="text-sm text-red-600 mt-1 font-mono break-all">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-semibold text-green-800">✅ Success!</p>
              <p className="text-sm text-green-600 mt-1">
                Audio generated successfully. {audioUrl && 'Playing audio...'}
              </p>
            </div>
          )}

          {audioUrl && (
            <div className="space-y-2">
              <Label>Audio Player</Label>
              <audio controls src={audioUrl} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Audio URL: {audioUrl.substring(0, 50)}...
              </p>
            </div>
          )}

          {/* LLM Testing Section */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">🤖 Test LLM Conversation</h3>
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="llm-message">LLM Message</Label>
              <Textarea
                id="llm-message"
                value={llmMessage}
                onChange={(e) => setLlmMessage(e.target.value)}
                placeholder="Enter a message to test the LLM..."
                rows={3}
              />
            </div>

            <Button 
              onClick={testLLM} 
              disabled={isLlmLoading || !llmMessage.trim()}
              className="w-full mb-4"
              variant="outline"
            >
              {isLlmLoading ? '🔄 Getting response...' : '🤖 Test LLM'}
            </Button>

            {llmError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                <p className="text-sm font-semibold text-red-800">LLM Error:</p>
                <p className="text-sm text-red-600 mt-1 font-mono break-all">{llmError}</p>
              </div>
            )}

            {llmResponse && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ LLM Response:</p>
                <p className="text-sm text-green-700 whitespace-pre-wrap">{llmResponse}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
