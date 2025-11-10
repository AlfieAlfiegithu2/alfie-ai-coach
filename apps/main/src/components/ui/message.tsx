"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Message = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    from: "user" | "assistant"
  }
>(({ className, from, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex w-full gap-3",
      from === "user" ? "justify-end" : "justify-start",
      className,
    )}
    {...props}
  />
))
Message.displayName = "Message"

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex max-w-[85%] gap-3", className)}
    {...props}
  />
))
MessageContent.displayName = "MessageContent"

export { Message, MessageContent }

