import React, { useState, useMemo } from "react";
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
  loading?: boolean;
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

// Keep highlights light: only emphasize key words (not whole phrases)
const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','so','because','as','of','to','in','on','at','by','for','with','about','into','over','after','before','from','is','are','was','were','be','been','being','it','its','this','that','these','those','their','there','here','also','very','much','more','most','many','few','some','any','than','both','either','neither','not','no','do','does','did','can','could','should','would','may','might','will','shall','i','you','he','she','we','they','one','two','three'
]);

const isKeyword = (word: string) => {
  const w = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!w) return false;
  if (STOPWORDS.has(w)) return false;
  return w.length >= 4; // focus on meaningful tokens
};

const refineSpansForKeywords = (spans: ComparisonSpan[], side: 'original' | 'improved'): ComparisonSpan[] => {
  const needsRefine = (s: ComparisonSpan) => (s.status === 'improvement' || s.status === 'error') && s.text.trim().split(/\s+/).length >= 4;
  const out: ComparisonSpan[] = [];
  for (const s of spans) {
    if (!needsRefine(s)) { out.push(s); continue; }
    // Split while keeping non-word separators
    const parts = s.text.split(/(\b[^\s]+\b)/g).filter(p => p.length > 0);
    for (const p of parts) {
      const isWord = /\b[^\s]+\b/.test(p);
      if (isWord && isKeyword(p)) {
        out.push({ text: p, status: s.status });
      } else {
        out.push({ text: p, status: 'neutral' });
      }
    }
  }
  return out;
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
  // Helper: very simple word-diff to highlight only changed words
  const diffToSpans = (orig: string, imp: string): { origSpans: ComparisonSpan[]; impSpans: ComparisonSpan[] } => {
    const o = orig.split(/\s+/);
    const p = imp.split(/\s+/);
    const n = o.length; const m = p.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = o[i] === p[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    // Reconstruct LCS path
    const keepO: boolean[] = Array(n).fill(false);
    const keepP: boolean[] = Array(m).fill(false);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (o[i] === p[j]) { keepO[i] = true; keepP[j] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    const origSpans: ComparisonSpan[] = [];
    const impSpans: ComparisonSpan[] = [];
    const pushChunk = (arr: ComparisonSpan[], text: string, status: ComparisonSpan["status"]) => {
      if (text.length === 0) return;
      const t = text.replace(/\s+/g, ' ').trim();
      if (!t) return;
      arr.push({ text: t + ' ', status });
    };
    // Build spans for original
    let buf = ''; let cur: ComparisonSpan["status"] = 'neutral';
    for (let k = 0; k < n; k++) {
      const nextStatus: ComparisonSpan["status"] = keepO[k] ? 'neutral' : 'error';
      if (k === 0) { cur = nextStatus; }
      if (nextStatus !== cur) { pushChunk(origSpans, buf, cur); buf = ''; cur = nextStatus; }
      buf += (buf ? ' ' : '') + o[k];
    }
    pushChunk(origSpans, buf, cur);
    // Build spans for improved
    buf = ''; cur = 'neutral';
    for (let k = 0; k < m; k++) {
      const nextStatus: ComparisonSpan["status"] = keepP[k] ? 'neutral' : 'improvement';
      if (k === 0) { cur = nextStatus; }
      if (nextStatus !== cur) { pushChunk(impSpans, buf, cur); buf = ''; cur = nextStatus; }
      buf += (buf ? ' ' : '') + p[k];
    }
    pushChunk(impSpans, buf, cur);
    return { origSpans: origSpans.length ? origSpans : [{ text: orig, status: 'neutral' }], impSpans: impSpans.length ? impSpans : [{ text: imp, status: 'neutral' }] };
  };
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
          const originalSentence = matchingSentence.trim() + ".";
          const improvedSentence = matchingSentence.replace(quote, improved).trim() + ".";
          const d = diffToSpans(originalSentence, improvedSentence);
          sentenceComparisons.push({
            original: originalSentence,
            improved: improvedSentence,
            original_spans: d.origSpans,
            corrected_spans: d.impSpans,
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
  title,
  loading
}) => {
  const [viewMode, setViewMode] = useState<"whole" | "sentence">("whole");
  
  // Memoize spans processing to prevent recalculation on every render
  const { originalSpans, improvedSpans, sentences } = useMemo(() => {
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
  }, [originalText, improvementSuggestions, providedOriginalSpans, providedCorrectedSpans, providedSentenceComparisons]);

  // Memoize refined spans to prevent recalculation
  const refinedOriginalSpans = useMemo(() => refineSpansForKeywords(originalSpans, 'original'), [originalSpans]);
  const refinedImprovedSpans = useMemo(() => refineSpansForKeywords(improvedSpans, 'improved'), [improvedSpans]);
  const refinedSentences = useMemo(() => (sentences || []).map((s: any) => ({
    ...s,
    original_spans: s.original_spans ? refineSpansForKeywords(s.original_spans, 'original') : s.original_spans,
    corrected_spans: s.corrected_spans ? refineSpansForKeywords(s.corrected_spans, 'improved') : s.corrected_spans,
  })), [sentences]);

  // Memoize sentence building to prevent recalculation
  const buildSentencesFromWhole = useMemo((): any[] => {
    const improvedWhole = improvedSpans.map(s => s.text).join("").trim();
    const origSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + ".");
    const impSentences = improvedWhole.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + ".");
    const pairs = Math.min(origSentences.length, impSentences.length);
    const built: any[] = [];
    for (let k = 0; k < pairs; k++) {
      const a = origSentences[k];
      const b = impSentences[k];
      // quick diff (same logic as in processTextForComparison, inlined)
      const oa = a.split(/\s+/), pb = b.split(/\s+/);
      const n = oa.length, m = pb.length;
      const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = oa[i] === pb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      const keepO = Array(n).fill(false), keepP = Array(m).fill(false);
      let i = 0, j = 0; while (i < n && j < m) { if (oa[i] === pb[j]) { keepO[i] = keepP[j] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
      const orig: ComparisonSpan[] = [], imp: ComparisonSpan[] = [];
      const push = (arr: ComparisonSpan[], text: string, status: ComparisonSpan["status"]) => { const t = text.replace(/\s+/g,' ').trim(); if (t.length) arr.push({ text: t + ' ', status }); };
      let buf = '', cur: ComparisonSpan["status"] = 'neutral';
      for (let t = 0; t < n; t++) { const ns: ComparisonSpan["status"] = keepO[t] ? 'neutral' : 'error'; if (t === 0) cur = ns; if (ns !== cur) { push(orig, buf, cur); buf=''; cur=ns; } buf += (buf?' ':'') + oa[t]; }
      push(orig, buf, cur);
      buf = ''; cur = 'neutral';
      for (let t = 0; t < m; t++) { const ns: ComparisonSpan["status"] = keepP[t] ? 'neutral' : 'improvement'; if (t === 0) cur = ns; if (ns !== cur) { push(imp, buf, cur); buf=''; cur=ns; } buf += (buf?' ':'') + pb[t]; }
      push(imp, buf, cur);
      built.push({ original: a, improved: b, original_spans: orig, corrected_spans: imp });
    }
    return built;
  }, [improvedSpans, originalText]);

  const effectiveSentences = useMemo(() => {
    if (providedSentenceComparisons && providedSentenceComparisons.length > 0) {
      return providedSentenceComparisons.map((s: any) => ({
        ...s,
        original_spans: s.original_spans ? refineSpansForKeywords(s.original_spans, 'original') : s.original_spans,
        corrected_spans: s.corrected_spans ? refineSpansForKeywords(s.corrected_spans, 'improved') : s.corrected_spans,
      }));
    }
    return refinedSentences.length > 0 ? refinedSentences : buildSentencesFromWhole;
  }, [providedSentenceComparisons, refinedSentences, buildSentencesFromWhole]);

  // Memoize sentence grouping to prevent recalculation
  const grouped = useMemo(() => {
    const groupSentences = (items: any[]) => {
      const n = items.length;
      if (n <= 3) return [items];
      const introCount = Math.min(2, Math.max(1, Math.floor(n * 0.2)));
      const conclCount = Math.min(2, Math.max(1, Math.floor(n * 0.2)));
      const intro = items.slice(0, introCount);
      const body = items.slice(introCount, Math.max(introCount, n - conclCount));
      const concl = items.slice(Math.max(introCount, n - conclCount));
      return [intro, body, concl].filter(g => g.length > 0);
    };
    return groupSentences(effectiveSentences);
  }, [effectiveSentences]);

  if (!originalText.trim()) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-6">
        <div className="animate-pulse h-6 w-48 bg-surface-3 rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-40 bg-surface-3 rounded border border-border" />
          <div className="h-40 bg-surface-3 rounded border border-border" />
        </div>
      </div>
    );
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
          <Card className="border border-destructive/20 bg-surface-1 rounded-3xl shadow-sm">
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
              <div className="text-sm whitespace-pre-wrap break-words space-y-6">
                {grouped.map((group, gi) => (
                  <div key={`orig-group-${gi}`} className="space-y-2">
                    {group.map((s: any, i: number) => (
                      <p key={`whole-orig-${gi}-${i}`} className="leading-relaxed">
                        {(s.original_spans && s.original_spans.length
                          ? s.original_spans
                          : [{ text: s.original || "", status: "neutral" }]
                        ).map((span: any, spanI: number) => (
                          <span key={`whole-orig-span-${gi}-${i}-${spanI}`} className={spanClass(span.status, "original")}>
                            {span.text}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-green/20 bg-surface-1 rounded-3xl shadow-sm">
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
              <div className="text-sm whitespace-pre-wrap break-words space-y-6">
                {grouped.map((group, gi) => (
                  <div key={`imp-group-${gi}`} className="space-y-2">
                    {group.map((s: any, i: number) => (
                      <p key={`whole-imp-${gi}-${i}`} className="leading-relaxed">
                        {(s.corrected_spans && s.corrected_spans.length
                          ? s.corrected_spans
                          : [{ text: s.improved || "", status: "neutral" }]
                        ).map((span: any, spanI: number) => (
                          <span key={`whole-imp-span-${gi}-${i}-${spanI}`} className={spanClass(span.status, "improved")}>
                            {span.text}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {effectiveSentences.length > 0 ? (
            effectiveSentences.map((sentence, i) => (
              <Card key={i} className="border border-border">
                {/* Header removed per request: no "Sentence 1" labels */}
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {sentence.original_spans ? (
                            sentence.original_spans.map((span: any, spanI: number) => (
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
                      <div className="p-3 bg-brand-green/5 border border-brand-green/20 rounded-lg">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {sentence.corrected_spans ? (
                            sentence.corrected_spans.map((span: any, spanI: number) => (
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