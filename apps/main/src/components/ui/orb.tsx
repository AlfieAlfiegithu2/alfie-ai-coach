"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Orb = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    agentState?: "idle" | "listening" | "thinking" | "talking" | null
    className?: string
  }
>(({ className, agentState, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg",
      agentState === "talking" && "animate-pulse",
      agentState === "listening" && "ring-2 ring-green-400",
      agentState === "thinking" && "ring-2 ring-yellow-400",
      className,
    )}
    {...props}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
    <div className="relative z-10 text-xs font-bold text-white">AI</div>
  </div>
))
Orb.displayName = "Orb"

export { Orb }

