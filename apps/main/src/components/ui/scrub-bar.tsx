"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const ScrubBarContainer = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    duration?: number
    onScrub?: (value: number) => void
    onScrubStart?: () => void
    onScrubEnd?: () => void
  }
>(({ className, duration, value, onScrub, onScrubStart, onScrubEnd, children, ...props }, ref) => {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center gap-2",
        className
      )}
      min={0}
      max={duration || 100}
      value={typeof value === 'number' ? [value] : value}
      onValueChange={(vals) => onScrub?.(vals[0])}
      onValueCommit={onScrubEnd}
      onPointerDown={onScrubStart}
      {...props}
    >
      {children}
    </SliderPrimitive.Root>
  )
})
ScrubBarContainer.displayName = "ScrubBarContainer"

const ScrubBarTrack = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Track>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Track>
>(({ className, children, ...props }, ref) => (
  <SliderPrimitive.Track
    ref={ref}
    className={cn(
      "relative h-1 w-full grow overflow-visible rounded-full bg-stone-200/80 dark:bg-stone-700",
      className
    )}
    {...props}
  >
    {children}
  </SliderPrimitive.Track>
))
ScrubBarTrack.displayName = "ScrubBarTrack"

const ScrubBarProgress = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Range>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Range>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Range
    ref={ref}
    className={cn("absolute h-full bg-amber-600/60 dark:bg-amber-500/60 rounded-full transition-all duration-150 ease-out", className)}
    {...props}
  />
))
ScrubBarProgress.displayName = "ScrubBarProgress"

const ScrubBarThumb = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Thumb>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Thumb> & {
    "data-scrubbing"?: boolean
  }
>(({ className, "data-scrubbing": isScrubbing, ...props }, ref) => (
  <SliderPrimitive.Thumb
    ref={ref}
    className={cn(
      "block h-3 w-3 rounded-full border-2 border-amber-400/80 bg-white shadow-sm ring-offset-white transition-all duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-amber-500/80 dark:bg-stone-950",
      "hover:scale-110",
      isScrubbing && "scale-110",
      className
    )}
    {...props}
  />
))
ScrubBarThumb.displayName = "ScrubBarThumb"

const ScrubBarTimeLabel = ({ 
  time, 
  className 
}: { 
  time: number
  className?: string 
}) => {
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <span className={cn("text-[10px] font-mono text-stone-500 tabular-nums", className)}>
      {formatTime(time)}
    </span>
  )
}

export {
  ScrubBarContainer,
  ScrubBarTrack,
  ScrubBarProgress,
  ScrubBarThumb,
  ScrubBarTimeLabel,
}

