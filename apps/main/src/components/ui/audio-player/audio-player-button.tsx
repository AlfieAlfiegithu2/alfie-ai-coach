"use client"

import { PauseIcon, PlayIcon } from "lucide-react"
import { useAudioPlayer } from "./audio-player-provider"
import { Button, ButtonProps } from "@/components/ui/button"

interface AudioPlayerButtonProps extends Omit<ButtonProps, "onClick"> {}

export function AudioPlayerButton(props: AudioPlayerButtonProps) {
  const { togglePlayPause, isPlaying } = useAudioPlayer()

  return (
    <Button {...props} onClick={togglePlayPause}>
      {isPlaying ? (
        <PauseIcon className="h-4 w-4" />
      ) : (
        <PlayIcon className="h-4 w-4" />
      )}
      <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
    </Button>
  )
}





