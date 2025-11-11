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
      "relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg border-2 border-gray-200",
      agentState === "talking" && "animate-pulse",
      agentState === "listening" && "ring-2 ring-green-400",
      agentState === "thinking" && "ring-2 ring-yellow-400",
      className,
    )}
    {...props}
  >
    <div className="relative z-10 text-xs font-bold text-black">AI</div>
  </div>
))
Orb.displayName = "Orb"

export { Orb }

