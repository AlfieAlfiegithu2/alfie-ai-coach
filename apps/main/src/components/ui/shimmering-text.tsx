"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const ShimmeringText = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    text?: string
    duration?: number
    delay?: number
    repeat?: boolean
    repeatDelay?: number
    startOnView?: boolean
    once?: boolean
    inViewMargin?: string
    spread?: number
    color?: string
    shimmerColor?: string
  }
>(({
  className,
  text = "Thinking...",
  duration = 2,
  delay = 0,
  repeat = true,
  repeatDelay = 0.5,
  startOnView = false,
  once = false,
  inViewMargin,
  spread = 2,
  color,
  shimmerColor,
  ...props
}, ref) => {
  const textLength = text.length
  const shimmerWidth = textLength * spread

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative inline-block bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 bg-clip-text text-transparent",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent before:bg-clip-text",
        className,
      )}
      style={{
        '--shimmer-color': shimmerColor || 'hsl(var(--foreground))',
        '--base-color': color || 'hsl(var(--muted-foreground))',
      } as React.CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      whileInView={startOnView ? {
        backgroundPosition: [`-${shimmerWidth}px`, `${shimmerWidth}px`],
      } : undefined}
      viewport={startOnView ? { once, margin: inViewMargin } : undefined}
      {...props}
    >
      <motion.span
        className="relative z-10"
        animate={startOnView ? undefined : {
          backgroundPosition: [`-${shimmerWidth}px`, `${shimmerWidth}px`],
        }}
        transition={{
          duration,
          delay,
          repeat: repeat ? Infinity : 0,
          repeatDelay,
          ease: "easeInOut",
        }}
        style={{
          background: `linear-gradient(90deg, transparent, var(--shimmer-color), transparent)`,
          backgroundSize: `${shimmerWidth}px 100%`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'var(--base-color)',
        }}
      >
        {text}
      </motion.span>
    </motion.div>
  )
})
ShimmeringText.displayName = "ShimmeringText"

export { ShimmeringText }
