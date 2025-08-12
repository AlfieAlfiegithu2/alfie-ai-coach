import React from "react";

export interface SentencePair {
  original_sentence: string;
  suggested_sentence: string;
}

interface SentenceComparisonProps {
  pairs: SentencePair[];
}

const SentenceComparison: React.FC<SentenceComparisonProps> = ({ pairs }) => {
  return (
    <div className="space-y-3">
      {pairs.map((p, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <div className="text-caption text-text-tertiary mb-1">Your Answer (Sentence {idx + 1})</div>
            <div className="text-sm leading-relaxed text-text-secondary">
              {p.original_sentence}
            </div>
          </div>
          <div>
            <div className="text-caption text-text-tertiary mb-1">AI Suggested Answer (Sentence {idx + 1})</div>
            <div className="text-sm leading-relaxed text-text-secondary">
              {p.suggested_sentence}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SentenceComparison;
