"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Conversation = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col h-full", className)}
    {...props}
  />
))
Conversation.displayName = "Conversation"

const ConversationContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto", className)}
    data-conversation-content
    {...props}
  />
))
ConversationContent.displayName = "ConversationContent"

const ConversationEmptyState = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    title?: string
    description?: string
    icon?: React.ReactNode
  }
>(
  (
    {
      className,
      title = "No messages yet",
      description,
      icon,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center",
        className,
      )}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="text-sm font-medium">{title}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </>
      )}
    </div>
  ),
)
ConversationEmptyState.displayName = "ConversationEmptyState"

const ConversationScrollButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute bottom-4 right-4 z-10 rounded-full bg-background p-2 shadow-lg ring-1 ring-border transition-all hover:shadow-xl",
      className,
    )}
    onClick={() => {
      // Simple scroll to bottom implementation
      const scrollContainer = document.querySelector('[data-conversation-content]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }}
    {...props}
  />
))
ConversationScrollButton.displayName = "ConversationScrollButton"

export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
}
