"use client"

import { useAudioPlayer } from "./audio-player-provider"

interface AudioPlayerDurationProps {
  className?: string
}

export function AudioPlayerDuration({ className }: AudioPlayerDurationProps) {
  const { duration } = useAudioPlayer()

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <span className={className}>
      {formatTime(duration)}
    </span>
  )
}



