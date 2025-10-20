import React from "react";

export type Span = {
  text: string;
  status: "suggestion" | "enhancement" | "neutral";
};

interface SuggestionVisualizerProps {
  originalSpans: Span[];
  suggestedSpans: Span[];
  dimNeutral?: boolean;
  hideOriginal?: boolean;
}

const spanClass = (status: Span["status"], side: "left" | "right", dimNeutral = false) => {
  // Use semantic brand tokens from the design system
  if (side === "left") {
    if (status === "suggestion") {
      return "bg-brand-blue/10 text-brand-blue border-b-2 border-brand-blue/50";
    }
    return dimNeutral ? "text-text-primary opacity-50" : "text-text-primary";
  }
  // right side
  if (status === "enhancement") {
    return "bg-brand-green/10 text-brand-green border-b-2 border-brand-green/50";
  }
  return dimNeutral ? "text-text-primary opacity-50" : "text-text-primary";
};

export const SuggestionVisualizer: React.FC<SuggestionVisualizerProps> = ({ originalSpans, suggestedSpans, dimNeutral = false, hideOriginal = false }) => {
  const sanitize = (t: string) =>
    t
      .replace(/Ignore non[- ]English words and output the best English interpretation/gi, 'inaudible');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-3 p-4 border border-border space-y-4">
        {/* Original transcription with red highlights for errors */}
        {!hideOriginal && (
          <div>
            <div className="text-caption mb-2 text-text-tertiary">Your Writing (enhancement opportunities in blue)</div>
            <div className="text-sm leading-relaxed text-text-secondary">
              {originalSpans.map((s, i) => (
                <span key={`o-${i}`} className={spanClass(s.status, "left", dimNeutral)}>{sanitize(s.text)}</span>
              ))}
            </div>
          </div>
        )}
        {/* Enhanced version below in same container */}
        <div>
          <div className="text-caption mb-2 text-text-tertiary">Enhanced Version (improvements highlighted in green)</div>
          <div className="text-sm leading-relaxed text-text-secondary">
            {suggestedSpans.map((s, i) => (
              <span key={`c-${i}`} className={spanClass(s.status, "right", dimNeutral)}>{sanitize(s.text)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestionVisualizer;