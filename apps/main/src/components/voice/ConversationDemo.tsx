"use client";

import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui/card";

type TokenTextPart = {
  type: "text";
  tokens?: string[];
  text: string;
};

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  parts: TokenTextPart[];
};

const allMessages: DemoMessage[] = [
  {
    id: "1",
    role: "user",
    parts: [
      { type: "text", text: "Hi, can you help me improve my IELTS speaking?" },
    ],
  },
  {
    id: "2",
    role: "assistant",
    parts: [
      {
        type: "text",
        tokens: [
          "Absolutely!",
          " Let's",
          " focus",
          " on",
          " short",
          " answers",
          " with",
          " clear",
          " structure",
          ".",
          " Try",
          " this",
          ":",
          " opening",
          ",",
          " idea",
          ",",
          " example",
          ",",
          " and",
          " closing",
          ".",
          " What's",
          " a",
          " topic",
          " you'd",
          " like",
          " to",
          " practice",
          " today",
          "?",
        ],
        text:
          "Absolutely! Let's focus on short answers with clear structure. Try this: opening, idea, example, and closing. What's a topic you'd like to practice today?",
      },
    ],
  },
];

const speak = (text: string) => {
  try {
    if (typeof window === "undefined") return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {
    // swallow — Web Speech API optional
  }
};

const ConversationDemo = () => {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const lastSpokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];
    let currentMessageIndex = 0;

    const addNextMessage = () => {
      if (currentMessageIndex >= allMessages.length) return;

      const message = allMessages[currentMessageIndex];
      const part = message.parts[0];

      if (message.role === "assistant" && "tokens" in part && part.tokens) {
        setStreamingMessageIndex(currentMessageIndex);
        setStreamingContent("");

        let currentContent = "";
        let tokenIndex = 0;

        const streamInterval = setInterval(() => {
          if (tokenIndex < (part.tokens as string[]).length) {
            currentContent += (part.tokens as string[])[tokenIndex];
            setStreamingContent(currentContent);
            tokenIndex++;
          } else {
            clearInterval(streamInterval);
            setMessages((prev) => [...prev, message]);
            setStreamingMessageIndex(null);
            setStreamingContent("");

            // speak once when message completes
            if (lastSpokenIdRef.current !== message.id) {
              speak(part.text);
              lastSpokenIdRef.current = message.id;
            }

            currentMessageIndex++;
            timeouts.push(setTimeout(addNextMessage, 500));
          }
        }, 60);

        intervals.push(streamInterval);
      } else {
        setMessages((prev) => [...prev, message]);
        if (message.role === "assistant" && lastSpokenIdRef.current !== message.id) {
          speak(part.text);
          lastSpokenIdRef.current = message.id;
        }
        currentMessageIndex++;
        timeouts.push(setTimeout(addNextMessage, 600));
      }
    };

    timeouts.push(setTimeout(addNextMessage, 800));

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      intervals.forEach((i) => clearInterval(i));
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <Card className="relative mx-auto my-0 size-full h-[400px] py-0">
      <div className="flex h-full flex-col p-4 gap-3 overflow-hidden">
        {messages.length === 0 && streamingMessageIndex === null ? (
          <div className="m-auto text-center text-muted-foreground">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-muted" />
            <div className="text-base font-medium">Start a conversation</div>
            <div className="text-sm">This is a simulated conversation</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow ${message.role === 'assistant' ? 'bg-card border border-border' : 'bg-primary text-primary-foreground'}`}>
                  {message.parts.map((part, i) => (
                    <p key={`${message.id}-${i}`} className="whitespace-pre-wrap leading-relaxed">{part.text}</p>
                  ))}
                </div>
              </div>
            ))}
            {streamingMessageIndex !== null && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow bg-card border border-border">
                  <p className="whitespace-pre-wrap leading-relaxed">{streamingContent || "\u200B"}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ConversationDemo;


