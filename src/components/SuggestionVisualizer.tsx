import React from "react";

export type Span = {
  text: string;
  status: "error" | "improvement" | "neutral";
};

interface SuggestionVisualizerProps {
  originalSpans: Span[];
  suggestedSpans: Span[];
  dimNeutral?: boolean;
}

const spanClass = (status: Span["status"], side: "left" | "right", dimNeutral = false) => {
  // Use semantic brand tokens from the design system
  if (side === "left") {
    if (status === "error") {
      return "bg-brand-red/10 text-brand-red border-b-2 border-brand-red/50";
    }
    return dimNeutral ? "text-text-primary opacity-50" : "text-text-primary";
  }
  // right side
  if (status === "improvement") {
    return "bg-brand-green/10 text-brand-green border-b-2 border-brand-green/50";
  }
  return dimNeutral ? "text-text-primary opacity-50" : "text-text-primary";
};

export const SuggestionVisualizer: React.FC<SuggestionVisualizerProps> = ({ originalSpans, suggestedSpans, dimNeutral = false }) => {
  // Split spans into sentences for sentence-by-sentence comparison
  const createSentenceGroups = (spans: Span[]) => {
    const sentences: Span[][] = [];
    let currentSentence: Span[] = [];
    
    spans.forEach(span => {
      const text = span.text;
      const parts = text.split(/([.!?]+\s+)/);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.trim()) {
          if (part.match(/[.!?]+\s+/)) {
            // Sentence ending
            currentSentence.push({ ...span, text: part });
            sentences.push([...currentSentence]);
            currentSentence = [];
          } else {
            // Regular text
            currentSentence.push({ ...span, text: part });
          }
        }
      }
    });
    
    if (currentSentence.length > 0) {
      sentences.push(currentSentence);
    }
    
    return sentences;
  };

  const originalSentences = createSentenceGroups(originalSpans);
  const suggestedSentences = createSentenceGroups(suggestedSpans);
  const maxSentences = Math.max(originalSentences.length, suggestedSentences.length);

  return (
    <div className="space-y-4">
      {Array.from({ length: maxSentences }, (_, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original sentence */}
          <div className="rounded-2xl bg-surface-3 p-4 border border-border">
            {index === 0 && (
              <div className="text-caption mb-2 text-text-tertiary">Your Transcription (areas for improvement highlighted)</div>
            )}
            <div className="text-sm leading-relaxed text-text-secondary">
              {originalSentences[index]?.map((s, i) => (
                <span key={`o-${index}-${i}`} className={spanClass(s.status, "left", dimNeutral)}>{s.text}</span>
              )) || <span className="text-text-tertiary italic">No corresponding sentence</span>}
            </div>
          </div>
          
          {/* Suggested sentence */}
          <div className="rounded-2xl bg-surface-3 p-4 border border-border">
            {index === 0 && (
              <div className="text-caption mb-2 text-text-tertiary">AI Suggested Answer (improvements highlighted)</div>
            )}
            <div className="text-sm leading-relaxed text-text-secondary">
              {suggestedSentences[index]?.map((s, i) => (
                <span key={`c-${index}-${i}`} className={spanClass(s.status, "right", dimNeutral)}>{s.text}</span>
              )) || <span className="text-text-tertiary italic">No corresponding sentence</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SuggestionVisualizer;