"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Response = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed", className)}
    {...props}
  />
))
Response.displayName = "Response"

export { Response }

