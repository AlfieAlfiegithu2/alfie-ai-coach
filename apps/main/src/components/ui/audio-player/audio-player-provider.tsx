"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

interface AudioPlayerItem<T = any> {
  id: string
  src: string
  data?: T
}

interface AudioPlayerContextValue<T = any> {
  activeItem: AudioPlayerItem<T> | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  speed: number
  play: (item: AudioPlayerItem<T>) => void
  pause: () => void
  togglePlayPause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setSpeed: (speed: number) => void
  isItemActive: (id: string) => boolean
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)

interface AudioPlayerProviderProps<T = any> {
  children: React.ReactNode
}

export function AudioPlayerProvider<T = any>({ children }: AudioPlayerProviderProps<T>) {
  const [activeItem, setActiveItem] = useState<AudioPlayerItem<T> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.pause()
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  const play = async (item: AudioPlayerItem<T>) => {
    if (!audioRef.current) return

    if (activeItem?.id !== item.id) {
      setActiveItem(item)
      audioRef.current.src = item.src
      audioRef.current.load()
    }

    try {
      await audioRef.current.play()
    } catch (error) {
      console.error("Error playing audio:", error)
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pause()
    } else if (activeItem) {
      play(activeItem)
    }
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const isItemActive = (id: string) => {
    return activeItem?.id === id
  }

  const value: AudioPlayerContextValue<T> = {
    activeItem,
    isPlaying,
    currentTime,
    duration,
    volume,
    speed,
    play,
    pause,
    togglePlayPause,
    seek,
    setVolume,
    setSpeed,
    isItemActive,
  }

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer<T = any>(): AudioPlayerContextValue<T> {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider")
  }
  return context
}







