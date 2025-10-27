import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Volume2, Users, Globe, Play, Pause } from 'lucide-react';
import { ElevenLabsVoiceOptimized } from '@/components/ElevenLabsVoiceOptimized';

interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  gender: string;
  preview?: string;
}

interface VoiceSelectionProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  onClose: () => void;
}

const PREVIEW_TEXTS = {
  'US': "Hello! I'm excited to help you practice English conversation.",
  'UK': "Hello! I'm delighted to assist you with your English speaking practice.",
  'AUS': "G'day! I'm here to help you improve your English conversation skills.",
  'IND': "Namaste! I'm here to help you practice and improve your English speaking."
};

const VOICE_OPTIONS: VoiceOption[] = [
  // US Accents
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Rachel', accent: 'US', gender: 'Female' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Drew', accent: 'US', gender: 'Male' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Antoni', accent: 'US', gender: 'Male' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Elli', accent: 'US', gender: 'Female' },

  // UK Accents
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'Sarah', accent: 'UK', gender: 'Female' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Emma', accent: 'UK', gender: 'Female' },

  // Australian Accents
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Lily', accent: 'AUS', gender: 'Female' },
  { id: 'XB0fDUnXU5TFSJXzOQoQ', name: 'Charlie', accent: 'AUS', gender: 'Male' },

  // Indian Accents
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Priya', accent: 'IND', gender: 'Female' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Arjun', accent: 'IND', gender: 'Male' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Meera', accent: 'IND', gender: 'Female' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Ravi', accent: 'IND', gender: 'Male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Anaya', accent: 'IND', gender: 'Female' },
];

const ACCENT_INFO = {
  'US': { flag: '🇺🇸', name: 'American' },
  'UK': { flag: '🇬🇧', name: 'British' },
  'AUS': { flag: '🇦🇺', name: 'Australian' },
  'IND': { flag: '🇮🇳', name: 'Indian' },
};

export const VoiceSelection: React.FC<VoiceSelectionProps> = ({
  selectedVoice,
  onVoiceSelect,
  onClose,
}) => {
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  const handlePreview = (voiceId: string, accent: string) => {
    if (previewPlaying === voiceId) {
      setPreviewPlaying(null);
      return;
    }
    setPreviewPlaying(voiceId);
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Volume2 className="h-6 w-6 text-blue-500" />
            Choose Your AI Tutor's Voice
          </CardTitle>
          <p className="text-gray-600">Select the voice and accent that feels most comfortable for your learning</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Accent Groups */}
          {Object.entries(ACCENT_INFO).map(([accentCode, accentInfo]) => (
            <div key={accentCode} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{accentInfo.flag}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{accentInfo.name}</h3>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  <Users className="w-3 h-3 mr-1" />
                  {VOICE_OPTIONS.filter(v => v.accent === accentCode).length} voices
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {VOICE_OPTIONS.filter(voice => voice.accent === accentCode).map((voice) => (
                  <div key={voice.id} className="space-y-2">
                    <button
                      onClick={() => onVoiceSelect(voice.id)}
                      className={`relative w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                        selectedVoice === voice.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {selectedVoice === voice.id && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Volume2 className="w-5 h-5 text-gray-600" />
                          <span className="font-semibold text-gray-900">{voice.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {voice.gender}
                        </Badge>
                      </div>
                    </button>

                    {/* Preview Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(voice.id, voice.accent)}
                      className="w-full text-xs"
                    >
                      {previewPlaying === voice.id ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </>
                      )}
                    </Button>

                    {/* Hidden preview audio */}
                    {previewPlaying === voice.id && (
                      <ElevenLabsVoiceOptimized
                        text={PREVIEW_TEXTS[voice.accent as keyof typeof PREVIEW_TEXTS]}
                        voiceId={voice.id}
                        autoPlay={true}
                        onPlayEnd={() => setPreviewPlaying(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onVoiceSelect(selectedVoice);
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Continue with {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name || 'Selected Voice'}
            </Button>
          </div>

          {/* Voice Preview Note */}
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>Pro tip:</strong> Choose a voice that matches your learning preference.
              You can always change this later in settings!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
