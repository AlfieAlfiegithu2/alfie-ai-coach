"use client"

import { useAudioPlayer } from "./audio-player-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AudioPlayerSpeedProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function AudioPlayerSpeed({ variant = "ghost", size = "icon" }: AudioPlayerSpeedProps) {
  const { speed, setSpeed } = useAudioPlayer()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          {speed}x
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {speeds.map((speedOption) => (
          <DropdownMenuItem
            key={speedOption}
            onClick={() => setSpeed(speedOption)}
            className={speed === speedOption ? "bg-accent" : ""}
          >
            {speedOption}x
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}





