import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, List } from "lucide-react";

export type ComparisonSpan = {
  text: string;
  status: "error" | "improvement" | "neutral";
};

interface WritingComparisonViewProps {
  originalText: string;
  sentenceAnalysis?: Array<{
    original_spans: ComparisonSpan[];
    improved_spans: ComparisonSpan[];
    explanation: string;
  }>;
  title: string;
}

const spanClass = (status: ComparisonSpan["status"], side: "original" | "improved") => {
  if (side === "original") {
    if (status === "error") {
      return "bg-destructive/10 text-destructive border-b-2 border-destructive/50";
    }
    return "text-text-primary";
  }
  // improved side
  if (status === "improvement") {
    return "bg-brand-green/10 text-brand-green border-b-2 border-brand-green/50";
  }
  return "text-text-primary";
};

const processSentenceAnalysis = (
  originalText: string,
  sentenceAnalysis?: Array<{
    original_spans: ComparisonSpan[];
    improved_spans: ComparisonSpan[];
    explanation: string;
  }>
) => {
  if (!sentenceAnalysis || sentenceAnalysis.length === 0) {
    // If no analysis, split text into sentences and return as neutral
    const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return {
      originalSpans: [{ text: originalText, status: "neutral" as const }],
      improvedSpans: [{ text: originalText, status: "neutral" as const }],
      sentences: sentences.map((sentence, index) => ({
        original: sentence.trim() + ".",
        improved: sentence.trim() + ".",
        explanation: "No specific improvements provided for this sentence."
      }))
    };
  }

  // Combine all spans for whole text view
  const combinedOriginalSpans = sentenceAnalysis.flatMap(analysis => analysis.original_spans);
  const combinedImprovedSpans = sentenceAnalysis.flatMap(analysis => analysis.improved_spans);

  // Create sentence-by-sentence comparisons
  const sentences = sentenceAnalysis.map((analysis) => ({
    original: analysis.original_spans.map(span => span.text).join(''),
    improved: analysis.improved_spans.map(span => span.text).join(''),
    original_spans: analysis.original_spans,
    corrected_spans: analysis.improved_spans,
    explanation: analysis.explanation
  }));

  return {
    originalSpans: combinedOriginalSpans,
    improvedSpans: combinedImprovedSpans,
    sentences
  };
};

export const WritingComparisonView: React.FC<WritingComparisonViewProps> = ({
  originalText,
  sentenceAnalysis,
  title
}) => {
  const [viewMode, setViewMode] = useState<"whole" | "sentence">("sentence");
  
  const { originalSpans, improvedSpans, sentences } = processSentenceAnalysis(originalText, sentenceAnalysis);

  if (!originalText.trim()) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-heading-4">Writing Analysis - {title}</h4>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "whole" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("whole")}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Whole View
          </Button>
          <Button
            variant={viewMode === "sentence" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("sentence")}
            className="flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Sentence by Sentence
          </Button>
        </div>
      </div>

      {viewMode === "whole" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-3 h-3 bg-destructive/20 rounded-full"></span>
                Your Writing
                <Badge variant="outline" className="text-xs text-destructive">
                  Issues highlighted
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed">
                {originalSpans.map((span, i) => (
                  <span key={`original-${i}`} className={spanClass(span.status, "original")}>
                    {span.text}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-green/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-3 h-3 bg-brand-green/20 rounded-full"></span>
                AI Suggested Improvements
                <Badge variant="outline" className="text-xs text-brand-green">
                  Enhancements highlighted
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed">
                {improvedSpans.map((span, i) => (
                  <span key={`improved-${i}`} className={spanClass(span.status, "improved")}>
                    {span.text}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {sentences.length > 0 ? (
            sentences.map((sentence, i) => (
              <Card key={i} className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-text-primary">
                    {sentence.issue || `Sentence ${i + 1}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-text-tertiary">Original</p>
                      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <div className="text-sm leading-relaxed">
                          {sentence.original_spans ? (
                            sentence.original_spans.map((span, spanI) => (
                              <span key={`orig-${spanI}`} className={spanClass(span.status, "original")}>
                                {span.text}
                              </span>
                            ))
                          ) : (
                            sentence.original
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-text-tertiary">Improved</p>
                      <div className="p-3 bg-brand-green/5 border border-brand-green/20 rounded-lg">
                        <div className="text-sm leading-relaxed">
                          {sentence.corrected_spans ? (
                            sentence.corrected_spans.map((span, spanI) => (
                              <span key={`corr-${spanI}`} className={spanClass(span.status, "improved")}>
                                {span.text}
                              </span>
                            ))
                          ) : (
                            sentence.improved
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {sentence.explanation && (
                    <div className="p-3 bg-surface-2 border border-border rounded-lg">
                      <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Explanation</p>
                      <p className="text-sm text-text-secondary">
                        {typeof sentence.explanation === 'string' 
                          ? sentence.explanation 
                          : typeof sentence.explanation === 'object' && sentence.explanation.explanation
                          ? sentence.explanation.explanation
                          : 'Improvement suggestion available.'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border border-border">
              <CardContent className="py-6 text-center">
                <p className="text-text-secondary">No specific sentence-level improvements available for this task.</p>
                <p className="text-sm text-text-tertiary mt-1">Use the whole view to see your complete writing.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default WritingComparisonView;