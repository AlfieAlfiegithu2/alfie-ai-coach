import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomAudioPlayerProps {
    src: string;
    className?: string;
    style?: React.CSSProperties;
    accentColor?: string;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ 
    src, 
    className, 
    style,
    accentColor = '#3b82f6' // Default blue
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [volume, setVolume] = useState(1);

    // Format time helper
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
            if (!isDragging) {
                setCurrentTime(audio.currentTime);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        // Try to load metadata immediately if already available
        if (audio.readyState >= 1) {
            setDuration(audio.duration);
        }

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, [isDragging]);

    // Reset player when src changes
    useEffect(() => {
        setCurrentTime(0);
        setIsPlaying(false);
        setDuration(0);
    }, [src]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
    }, [isPlaying]);

    const restart = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        setCurrentTime(0);
        audio.play().catch(console.error);
    }, []);

    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    // Calculate time from mouse/touch position
    const getTimeFromPosition = useCallback((clientX: number): number => {
        if (!progressRef.current || duration <= 0) return 0;
        const rect = progressRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        return percentage * duration;
    }, [duration]);

    // Handle click on progress bar
    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const newTime = getTimeFromPosition(e.clientX);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    }, [getTimeFromPosition]);

    // Handle drag start
    const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const newTime = getTimeFromPosition(clientX);
        setCurrentTime(newTime);
    }, [getTimeFromPosition]);

    // Handle drag move and end
    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const newTime = getTimeFromPosition(clientX);
            setCurrentTime(newTime);
        };

        const handleEnd = () => {
            setIsDragging(false);
            // Only seek when drag ends
            if (audioRef.current) {
                audioRef.current.currentTime = currentTime;
            }
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, currentTime, getTimeFromPosition]);

    return (
        <div 
            className={cn(
                "rounded-xl p-3 flex items-center gap-3 select-none",
                className
            )} 
            style={style}
        >
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-9 w-9 rounded-lg transition-all duration-200 shrink-0",
                    "hover:scale-105 active:scale-95"
                )}
                style={{ 
                    color: accentColor,
                    backgroundColor: `${accentColor}15`,
                }}
                onClick={togglePlay}
            >
                {isPlaying ? (
                    <Pause className="h-4 w-4" />
                ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                )}
            </Button>

            {/* Time Display - Current */}
            <span 
                className="text-xs font-mono tabular-nums w-10 text-right"
                style={{ color: `${accentColor}90` }}
            >
                {formatTime(currentTime)}
            </span>

            {/* Progress Bar Container */}
            <div 
                ref={progressRef}
                className={cn(
                    "flex-1 h-10 flex items-center cursor-pointer group relative",
                    isDragging && "cursor-grabbing"
                )}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                onClick={handleProgressClick}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {/* Track Background */}
                <div 
                    className="w-full h-2 rounded-full relative overflow-visible"
                    style={{ backgroundColor: `${accentColor}20` }}
                >
                    {/* Progress Fill */}
                    <div 
                        className="absolute left-0 top-0 h-full rounded-full transition-all ease-out"
                        style={{ 
                            width: `${progress}%`,
                            backgroundColor: accentColor,
                            transitionDuration: isDragging ? '0ms' : '100ms'
                        }}
                    />
                    
                    {/* Thumb */}
                    <div
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all duration-150",
                            "shadow-sm",
                            isDragging ? "w-4 h-4 scale-110" : "w-3 h-3",
                            (isHovering || isDragging) ? "opacity-100 scale-100" : "opacity-0 scale-75"
                        )}
                        style={{ 
                            left: `${progress}%`,
                            backgroundColor: accentColor,
                            boxShadow: isDragging ? `0 0 0 4px ${accentColor}30` : `0 1px 3px ${accentColor}40`
                        }}
                    />
                </div>
            </div>

            {/* Time Display - Duration */}
            <span 
                className="text-xs font-mono tabular-nums w-10"
                style={{ color: `${accentColor}70` }}
            >
                {formatTime(duration)}
            </span>

            {/* Restart Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg transition-all duration-200 shrink-0 hover:scale-105"
                style={{ 
                    color: `${accentColor}80`,
                }}
                onClick={restart}
            >
                <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            {/* Mute Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg transition-all duration-200 shrink-0 hover:scale-105"
                style={{ 
                    color: `${accentColor}80`,
                }}
                onClick={toggleMute}
            >
                {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                )}
            </Button>
        </div>
    );
};
