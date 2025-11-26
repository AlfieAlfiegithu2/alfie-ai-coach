"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CharacterAlignmentResponseModel {
    characters: string[]
    characterStartTimesSeconds: number[]
    characterEndTimesSeconds: number[]
}

interface TranscriptViewerContextValue {
    audioRef: React.RefObject<HTMLAudioElement>
    currentTime: number
    duration: number
    isPlaying: boolean
    alignment: CharacterAlignmentResponseModel
    togglePlay: () => void
    seek: (time: number) => void
}

const TranscriptViewerContext = React.createContext<TranscriptViewerContextValue | null>(null)

function useTranscriptViewer() {
    const context = React.useContext(TranscriptViewerContext)
    if (!context) {
        throw new Error("useTranscriptViewer must be used within a TranscriptViewerContainer")
    }
    return context
}

interface TranscriptViewerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    audioSrc: string
    audioType?: string
    alignment: CharacterAlignmentResponseModel
}

export function TranscriptViewerContainer({
    children,
    audioSrc,
    audioType = "audio/mpeg",
    alignment,
    className,
    ...props
}: TranscriptViewerContainerProps) {
    const audioRef = React.useRef<HTMLAudioElement>(null)
    const [currentTime, setCurrentTime] = React.useState(0)
    const [duration, setDuration] = React.useState(0)
    const [isPlaying, setIsPlaying] = React.useState(false)

    React.useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
        const handleDurationChange = () => setDuration(audio.duration)
        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener("timeupdate", handleTimeUpdate)
        audio.addEventListener("durationchange", handleDurationChange)
        audio.addEventListener("play", handlePlay)
        audio.addEventListener("pause", handlePause)
        audio.addEventListener("ended", handleEnded)

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate)
            audio.removeEventListener("durationchange", handleDurationChange)
            audio.removeEventListener("play", handlePlay)
            audio.removeEventListener("pause", handlePause)
            audio.removeEventListener("ended", handleEnded)
        }
    }, [])

    const togglePlay = React.useCallback(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
        }
    }, [isPlaying])

    const seek = React.useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time
        }
    }, [])

    const value = React.useMemo(
        () => ({
            audioRef,
            currentTime,
            duration,
            isPlaying,
            alignment,
            togglePlay,
            seek,
        }),
        [currentTime, duration, isPlaying, alignment, togglePlay, seek]
    )

    return (
        <TranscriptViewerContext.Provider value={value}>
            <div className={cn("relative", className)} {...props}>
                <audio ref={audioRef} src={audioSrc}>
                    <source src={audioSrc} type={audioType} />
                    Your browser does not support the audio element.
                </audio>
                {children}
            </div>
        </TranscriptViewerContext.Provider>
    )
}

export function TranscriptViewerAudio({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    // This component is mainly a placeholder/wrapper if custom audio controls are needed,
    // but the audio element is already rendered in the container.
    // We can use this to render custom visualizations if needed.
    return <div className={cn("", className)} {...props} />
}

export function TranscriptViewerWords({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const { alignment, currentTime, seek } = useTranscriptViewer()

    // Group characters into words
    const words = React.useMemo(() => {
        const result: {
            text: string;
            startTime: number;
            endTime: number;
            isActive: boolean;
        }[] = []

        let currentWord = ""
        let wordStartTime = -1
        let wordEndTime = -1

        alignment.characters.forEach((char, index) => {
            const startTime = alignment.characterStartTimesSeconds[index]
            const endTime = alignment.characterEndTimesSeconds[index]

            if (wordStartTime === -1) wordStartTime = startTime
            wordEndTime = endTime

            currentWord += char

            // If character is a space or last character, push the word
            if (char === " " || index === alignment.characters.length - 1) {
                // Check if this word is currently active
                const isActive = currentTime >= wordStartTime && currentTime <= wordEndTime

                result.push({
                    text: currentWord,
                    startTime: wordStartTime,
                    endTime: wordEndTime,
                    isActive
                })

                currentWord = ""
                wordStartTime = -1
                wordEndTime = -1
            }
        })

        return result
    }, [alignment, currentTime])

    return (
        <div className={cn("flex flex-wrap gap-x-0.5", className)} {...props}>
            {words.map((word, index) => (
                <span
                    key={index}
                    className={cn(
                        "cursor-pointer transition-colors duration-150 rounded px-0.5",
                        word.isActive
                            ? "bg-primary/20 text-primary font-medium"
                            : "hover:bg-muted text-foreground/80"
                    )}
                    onClick={() => seek(word.startTime)}
                >
                    {word.text}
                </span>
            ))}
        </div>
    )
}

export function TranscriptViewerScrubBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const { currentTime, duration, seek } = useTranscriptViewer()
    const progressBarRef = React.useRef<HTMLDivElement>(null)

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current) return
        const rect = progressBarRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = x / rect.width
        seek(percentage * duration)
    }

    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className={cn("w-full space-y-2", className)} {...props}>
            <div
                ref={progressBarRef}
                className="relative h-2 w-full bg-secondary rounded-full cursor-pointer overflow-hidden"
                onClick={handleClick}
            >
                <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 ease-linear"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    )
}

interface TranscriptViewerPlayPauseButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    children: (props: { isPlaying: boolean }) => React.ReactNode
}

export function TranscriptViewerPlayPauseButton({
    children,
    className,
    onClick,
    ...props
}: TranscriptViewerPlayPauseButtonProps) {
    const { isPlaying, togglePlay } = useTranscriptViewer()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        togglePlay()
        onClick?.(e)
    }

    return (
        <button
            className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", className)}
            onClick={handleClick}
            {...props}
        >
            {children({ isPlaying })}
        </button>
    )
}
