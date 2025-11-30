import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ScrubBarContainer,
  ScrubBarProgress,
  ScrubBarThumb,
  ScrubBarTimeLabel,
  ScrubBarTrack,
} from "@/components/ui/scrub-bar"

interface CustomAudioPlayerProps {
    src: string;
    className?: string;
    style?: React.CSSProperties;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src, className, style }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const isScrubbingRef = useRef(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };

        const setAudioTime = () => {
            if (!isScrubbingRef.current) {
                setCurrentTime(audio.currentTime);
            }
        };
        
        const onEnded = () => setIsPlaying(false);

        // Add event listeners
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleScrub = (value: number) => {
        setCurrentTime(value);
        if (audioRef.current) {
            audioRef.current.currentTime = value;
        }
    };

    const handleScrubStart = () => {
        setIsScrubbing(true);
        isScrubbingRef.current = true;
    };

    const handleScrubEnd = () => {
        setIsScrubbing(false);
        isScrubbingRef.current = false;
        if (audioRef.current) {
             // Ensure final value is set
             audioRef.current.currentTime = currentTime;
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <div className={`bg-transparent rounded-xl p-2 pl-3 pr-3 flex items-center gap-3 ${className}`} style={style}>
            <audio ref={audioRef} src={src} preload="metadata" />

            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl bg-white hover:bg-stone-50 text-amber-800/80 transition-all duration-200 shrink-0 border border-stone-200/50 shadow-sm"
                onClick={togglePlay}
            >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <ScrubBarContainer
                value={currentTime}
                duration={duration || 100}
                onScrub={handleScrub}
                onScrubStart={handleScrubStart}
                onScrubEnd={handleScrubEnd}
                className="flex-1"
            >
                <ScrubBarTimeLabel time={currentTime} className="w-8 text-center text-amber-800/60" />
                <ScrubBarTrack className="mx-2 flex items-center">
                    <ScrubBarProgress />
                    <ScrubBarThumb data-scrubbing={isScrubbing} />
                </ScrubBarTrack>
                <ScrubBarTimeLabel time={duration} className="w-8 text-center text-amber-800/60" />
            </ScrubBarContainer>
        </div>
    );
};
