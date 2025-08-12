import React from "react";

export type Span = {
  text: string;
  status: "error" | "improvement" | "neutral";
};

interface CorrectionVisualizerProps {
  originalSpans: Span[];
  correctedSpans: Span[];
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

export const CorrectionVisualizer: React.FC<CorrectionVisualizerProps> = ({ originalSpans, correctedSpans, dimNeutral = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-surface-3 p-4 border border-border">
        <div className="text-caption mb-2 text-text-tertiary">Original (errors highlighted)</div>
        <div className="text-sm leading-relaxed text-text-secondary">
          {originalSpans.map((s, i) => (
            <span key={`o-${i}`} className={spanClass(s.status, "left", dimNeutral)}>{s.text}</span>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-surface-3 p-4 border border-border">
        <div className="text-caption mb-2 text-text-tertiary">Corrected (improvements highlighted)</div>
        <div className="text-sm leading-relaxed text-text-secondary">
          {correctedSpans.map((s, i) => (
            <span key={`c-${i}`} className={spanClass(s.status, "right", dimNeutral)}>{s.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CorrectionVisualizer;
