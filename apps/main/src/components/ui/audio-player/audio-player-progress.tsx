"use client"

import { useAudioPlayer } from "./audio-player-provider"
import { Slider } from "@/components/ui/slider"

interface AudioPlayerProgressProps {
  className?: string
}

export function AudioPlayerProgress({ className }: AudioPlayerProgressProps) {
  const { currentTime, duration, seek } = useAudioPlayer()

  const handleSeek = (value: number[]) => {
    seek(value[0])
  }

  return (
    <Slider
      value={[currentTime]}
      max={duration}
      step={0.1}
      onValueChange={handleSeek}
      className={className}
    />
  )
}


