import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Scissors, X } from 'lucide-react';

interface AudioTrimmerProps {
  audioFile: string;
  onTrimComplete: (trimmedAudioUrl: string, startTime: number, endTime: number) => void;
  onClose?: () => void;
}

export const AudioTrimmer = ({ audioFile, onTrimComplete, onClose }: AudioTrimmerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setTrimRange([0, 100]);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioFile]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Start from trim start position
      const startTime = (trimRange[0] / 100) * duration;
      audio.currentTime = startTime;
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrimRangeChange = (values: number[]) => {
    setTrimRange([values[0], values[1]]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTrimComplete = () => {
    const startTime = (trimRange[0] / 100) * duration;
    const endTime = (trimRange[1] / 100) * duration;
    
    // For now, just pass the original audio URL with trim timestamps
    // In a full implementation, you would use Web Audio API to actually trim the audio
    onTrimComplete(audioFile, startTime, endTime);
  };

  const startTime = (trimRange[0] / 100) * duration;
  const endTime = (trimRange[1] / 100) * duration;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Audio Trimmer
        </h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <audio ref={audioRef} src={audioFile} preload="metadata" />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Trim Range Slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Trim Range</label>
            <Slider
              value={trimRange}
              onValueChange={handleTrimRangeChange}
              max={100}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Start: {formatTime(startTime)}</span>
              <span>End: {formatTime(endTime)}</span>
              <span>Duration: {formatTime(endTime - startTime)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleTrimComplete} className="flex-1">
              <Scissors className="h-4 w-4 mr-2" />
              Apply Trim
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AudioTrimmer;

