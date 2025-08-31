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
  improvementSuggestions?: Array<{
    issue?: string;
    sentence_quote?: string;
    improved_version?: string;
    explanation?: string;
  }>;
  originalSpans?: ComparisonSpan[];
  correctedSpans?: ComparisonSpan[];
  sentenceComparisons?: Array<{
    original?: string;
    improved?: string;
    issue?: string;
    explanation?: string;
    original_spans?: ComparisonSpan[];
    corrected_spans?: ComparisonSpan[];
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

const processTextForComparison = (
  originalText: string,
  suggestions?: Array<{
    issue?: string;
    sentence_quote?: string;
    improved_version?: string;
    explanation?: string;
  }>
) => {
  // Split text into sentences for processing
  const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceComparisons = [];
  
  let processedOriginal = originalText;
  let processedImproved = originalText;

  if (suggestions && suggestions.length > 0) {
    // Process suggestions to create highlighted spans
    suggestions.forEach((suggestion) => {
      if (suggestion.sentence_quote && suggestion.improved_version) {
        const quote = suggestion.sentence_quote.trim();
        const improved = suggestion.improved_version.trim();
        
        // Replace in improved version
        processedImproved = processedImproved.replace(quote, improved);
        
        // Find sentence that contains this quote
        const matchingSentence = sentences.find(s => s.includes(quote));
        if (matchingSentence) {
          sentenceComparisons.push({
            original: matchingSentence.trim() + ".",
            improved: matchingSentence.replace(quote, improved).trim() + ".",
            issue: suggestion.issue || "Enhancement suggestion",
            explanation: suggestion.explanation
          });
        }
      }
    });
    
    // Ensure ALL sentences are covered, even if no specific suggestions
    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim();
      if (cleanSentence && !sentenceComparisons.some(sc => sc.original.includes(cleanSentence))) {
        sentenceComparisons.push({
          original: cleanSentence + ".",
          improved: cleanSentence + ".", // Same as original if no improvement found
          issue: `Sentence ${index + 1}`,
          explanation: "This sentence appears to be well-written or no specific improvements were identified."
        });
      }
    });
  } else {
    // If no suggestions, create sentence comparisons from original sentences
    // This ensures sentence-by-sentence view always has content
    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim();
      if (cleanSentence) {
        sentenceComparisons.push({
          original: cleanSentence + ".",
          improved: cleanSentence + ".", // Same as original since no improvements
          issue: `Sentence ${index + 1}`,
          explanation: "No specific improvements suggested for this sentence."
        });
      }
    });
  }

  // Create spans for highlighting
  const createSpans = (text: string, isImproved: boolean): ComparisonSpan[] => {
    if (!suggestions || suggestions.length === 0) {
      return [{ text, status: "neutral" }];
    }

    const spans: ComparisonSpan[] = [];
    let currentText = text;
    let processedSuggestions = 0;
    
    suggestions.forEach((suggestion) => {
      if (suggestion.sentence_quote && suggestion.improved_version) {
        const quote = suggestion.sentence_quote.trim();
        const improved = suggestion.improved_version.trim();
        const target = isImproved ? improved : quote;
        
        const index = currentText.indexOf(target);
        if (index !== -1) {
          // Add text before the target
          if (index > 0) {
            spans.push({
              text: currentText.substring(0, index),
              status: "neutral"
            });
          }
          
          // Add the target with highlighting
          spans.push({
            text: target,
            status: isImproved ? "improvement" : "error"
          });
          
          // Update current text to continue after the target
          currentText = currentText.substring(index + target.length);
          processedSuggestions++;
        }
      }
    });
    
    // Add remaining text
    if (currentText.length > 0) {
      spans.push({
        text: currentText,
        status: "neutral"
      });
    }
    
    // If no suggestions were processed, return the full text as neutral
    if (processedSuggestions === 0) {
      return [{ text, status: "neutral" }];
    }
    
    return spans.length > 0 ? spans : [{ text, status: "neutral" }];
  };

  return {
    originalSpans: createSpans(originalText, false),
    improvedSpans: createSpans(processedImproved, true),
    sentences: sentenceComparisons
  };
};

export const WritingComparisonView: React.FC<WritingComparisonViewProps> = ({
  originalText,
  improvementSuggestions,
  originalSpans: providedOriginalSpans,
  correctedSpans: providedCorrectedSpans,
  sentenceComparisons: providedSentenceComparisons,
  title
}) => {
  const [viewMode, setViewMode] = useState<"whole" | "sentence">("whole");
  
  // Always ensure we show the complete original text
  const { originalSpans, improvedSpans, sentences } = (() => {
    // If we have AI-provided spans, use them but validate they contain the full text
    if (providedOriginalSpans && providedCorrectedSpans) {
      const originalSpansText = providedOriginalSpans.map(span => span.text).join('');
      const correctedSpansText = providedCorrectedSpans.map(span => span.text).join('');
      
      // If the spans don't contain the full original text, fall back to processing
      if (originalSpansText.trim() !== originalText.trim()) {
        console.warn('⚠️ AI-provided spans incomplete, falling back to full text processing');
        return processTextForComparison(originalText, improvementSuggestions);
      }
      
      return {
        originalSpans: providedOriginalSpans,
        improvedSpans: providedCorrectedSpans,
        sentences: providedSentenceComparisons || []
      };
    }
    
    // Fall back to processing the full text
    return processTextForComparison(originalText, improvementSuggestions);
  })();

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