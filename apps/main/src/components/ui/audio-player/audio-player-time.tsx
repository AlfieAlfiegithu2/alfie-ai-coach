"use client"

import { useAudioPlayer } from "./audio-player-provider"

interface AudioPlayerTimeProps {
  className?: string
}

export function AudioPlayerTime({ className }: AudioPlayerTimeProps) {
  const { currentTime } = useAudioPlayer()

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <span className={className}>
      {formatTime(currentTime)}
    </span>
  )
}



