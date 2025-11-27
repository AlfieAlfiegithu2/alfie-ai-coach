import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scissors } from 'lucide-react';
import { toast } from 'sonner';

interface AudioTrimmerProps {
    audioFile: File;
    onTrimComplete: (trimmedFile: File, startTime: number, endTime: number) => void;
}

export function AudioTrimmer({ audioFile, onTrimComplete }: AudioTrimmerProps) {
    const [duration, setDuration] = useState(0);
    const [range, setRange] = useState([0, 0]);
    const [trimming, setTrimming] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Create object URL only when file changes
    const audioUrl = useState(() => URL.createObjectURL(audioFile))[0];

    useEffect(() => {
        // Cleanup object URL on unmount
        return () => URL.revokeObjectURL(audioUrl);
    }, [audioUrl]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            const dur = audio.duration;
            setDuration(dur);
            setRange([0, dur]);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, [audioFile]);

    const handleTrim = async () => {
        const [startTime, endTime] = range;

        if (startTime >= endTime) {
            toast.error('Start time must be before end time');
            return;
        }

        setTrimming(true);
        try {
            // Get audio buffer from file
            const arrayBuffer = await audioFile.arrayBuffer();

            // Create audio context
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const audioContext = audioContextRef.current;

            // Decode audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Calculate trim parameters
            const startSample = Math.floor(startTime * audioBuffer.sampleRate);
            const endSample = Math.floor(endTime * audioBuffer.sampleRate);
            const trimmedLength = endSample - startSample;

            // Create new buffer with trimmed audio
            const trimmedBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                trimmedLength,
                audioBuffer.sampleRate
            );

            // Copy trimmed audio data to new buffer
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                const trimmedData = trimmedBuffer.getChannelData(channel);

                for (let i = 0; i < trimmedLength; i++) {
                    trimmedData[i] = channelData[startSample + i];
                }
            }

            // Convert buffer to WAV blob
            const wav = audioBufferToWav(trimmedBuffer);
            const blob = new Blob([wav], { type: 'audio/wav' });

            // Create File object
            const trimmedFile = new File([blob], audioFile.name.replace(/\.[^/.]+$/, '') + '_trimmed.wav', {
                type: 'audio/wav'
            });

            onTrimComplete(trimmedFile, startTime, endTime);
            toast.success(`Audio trimmed: ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s`);
        } catch (error: any) {
            console.error('Trim error:', error);
            toast.error(`Failed to trim audio: ${error.message}`);
        } finally {
            setTrimming(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-purple-500" />
                    Trim Audio
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    className="w-full"
                    onTimeUpdate={(e) => {
                        const currentTime = e.currentTarget.currentTime;
                        if (currentTime < range[0]) {
                            e.currentTarget.currentTime = range[0];
                        } else if (currentTime > range[1]) {
                            e.currentTarget.currentTime = range[0];
                            e.currentTarget.pause();
                        }
                    }}
                />

                <div className="space-y-4">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Start: {formatTime(range[0])}</span>
                        <span>End: {formatTime(range[1])}</span>
                    </div>

                    <div className="relative h-10 flex items-center select-none">
                        {/* Start Slider */}
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={range[0]}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (val < range[1]) setRange([val, range[1]]);
                            }}
                            className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                        />
                        {/* End Slider */}
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={range[1]}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (val > range[0]) setRange([range[0], val]);
                            }}
                            className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                        />

                        {/* Visual track */}
                        <div className="absolute w-full h-2 bg-secondary rounded-full overflow-hidden z-10">
                            <div
                                className="h-full bg-purple-200 dark:bg-purple-900/50"
                                style={{
                                    left: `${(range[0] / duration) * 100}%`,
                                    right: `${100 - (range[1] / duration) * 100}%`,
                                    position: 'absolute'
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Duration: {formatTime(duration)}</span>
                        <span>Trimmed Length: {formatTime(range[1] - range[0])}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={handleTrim}
                        disabled={trimming}
                        className="flex-1"
                    >
                        {trimming ? 'Trimming...' : 'Apply Trim'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper function to convert AudioBuffer to WAV format
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg. bytes/sec
    setUint16(buffer.numberOfChannels * 2); // block-align
    setUint16(16); // 16-bit (hardcoded)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return arrayBuffer;
}
