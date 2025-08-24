import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Eye, List, Loader2 } from "lucide-react";

interface CorrectionSpan {
  text: string;
  status: "neutral" | "error" | "improvement";
}

interface SentencePair {
  original: string;
  corrected: string;
  changes_made: string[];
}

interface CorrectionData {
  original_spans: CorrectionSpan[];
  corrected_spans: CorrectionSpan[];
  sentence_pairs: SentencePair[];
  summary: {
    total_corrections: number;
    error_types: string[];
  };
}

interface AIWritingCorrectionProps {
  userSubmission: string;
  taskTitle: string;
  onGenerate?: () => void;
}

const AIWritingCorrection: React.FC<AIWritingCorrectionProps> = ({
  userSubmission,
  taskTitle,
  onGenerate,
}) => {
  const [loading, setLoading] = useState(false);
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"full" | "sentences">("full");
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateCorrections = async () => {
    setLoading(true);
    setError(null);
    setHasGenerated(true);
    
    try {
      console.log('🎯 Generating corrections for:', taskTitle);
      
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-writing-corrections',
        {
          body: { userSubmission },
        }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate corrections');
      }

      if (!data) {
        throw new Error('No correction data received');
      }

      console.log('✅ Corrections generated successfully:', data);
      setCorrectionData(data);
      onGenerate?.();
    } catch (err: any) {
      console.error('❌ Error generating corrections:', err);
      setError(err.message || 'Failed to generate corrections');
    } finally {
      setLoading(false);
    }
  };

  const renderSpans = (spans: CorrectionSpan[], isOriginal: boolean) => {
    return spans.map((span, index) => {
      const baseClasses = "transition-all duration-200";
      let statusClasses = "";
      
      if (span.status === "error") {
        statusClasses = "bg-destructive/10 text-destructive border-b-2 border-destructive/50";
      } else if (span.status === "improvement") {
        statusClasses = "bg-brand-green/10 text-brand-green border-b-2 border-brand-green/50";
      }

      return (
        <span key={index} className={`${baseClasses} ${statusClasses}`}>
          {span.text}
        </span>
      );
    });
  };

  const renderFullTextView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Original Text */}
      <Card className="border-2 border-destructive/30">
        <CardHeader className="bg-destructive/5 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Your Answer (Errors highlighted)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-sm leading-relaxed space-y-1">
            {correctionData?.original_spans && renderSpans(correctionData.original_spans, true)}
          </div>
        </CardContent>
      </Card>

      {/* Corrected Text */}
      <Card className="border-2 border-brand-green/30">
        <CardHeader className="bg-brand-green/5 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-brand-green" />
            Improved Version (Enhancements highlighted)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-sm leading-relaxed space-y-1">
            {correctionData?.corrected_spans && renderSpans(correctionData.corrected_spans, false)}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSentenceView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Original Text Column */}
      <Card className="border-2 border-destructive/30">
        <CardHeader className="bg-destructive/5 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Your Answer (Sentence by Sentence)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {correctionData?.sentence_pairs?.map((pair, index) => (
            <div key={index} className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <div className="text-xs font-medium text-destructive mb-1">Sentence {index + 1}</div>
              <p className="text-sm leading-relaxed">{pair.original}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Corrected Text Column */}
      <Card className="border-2 border-brand-green/30">
        <CardHeader className="bg-brand-green/5 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-brand-green" />
            Improved Version (Sentence by Sentence)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {correctionData?.sentence_pairs?.map((pair, index) => (
            <div key={index} className="space-y-2">
              <div className="p-3 bg-brand-green/5 rounded-lg border border-brand-green/20">
                <div className="text-xs font-medium text-brand-green mb-1">Sentence {index + 1}</div>
                <p className="text-sm leading-relaxed">{pair.corrected}</p>
              </div>
              {pair.changes_made && pair.changes_made.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-brand-blue">Changes: </span>
                  {pair.changes_made.join(', ')}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            AI Correction Analysis for {taskTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-blue" />
              <p className="text-sm text-text-secondary">
                Analyzing your writing and generating improvements...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">AI Correction Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <div>
              <p className="font-medium">Unable to generate corrections</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={generateCorrections} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasGenerated && !correctionData) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-brand-blue" />
            <div>
              <p className="font-medium">AI Writing Corrections Available</p>
              <p className="text-sm text-text-secondary mt-1">Get detailed corrections and improvements for your {taskTitle}</p>
            </div>
            <Button onClick={generateCorrections} className="mt-4">
              Generate AI Corrections
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!correctionData) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-brand-blue" />
            AI Correction Analysis for {taskTitle}
          </CardTitle>
          
          {/* View Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "full" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("full")}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Full Text View
            </Button>
            <Button
              variant={viewMode === "sentences" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("sentences")}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Sentence-by-Sentence
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {correctionData.summary && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="bg-brand-blue/10 text-brand-blue border-brand-blue/30">
              {correctionData.summary.total_corrections} corrections made
            </Badge>
            {correctionData.summary.error_types?.map((type, index) => (
              <Badge key={index} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                {type}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {viewMode === "full" ? renderFullTextView() : renderSentenceView()}
        
      </CardContent>
    </Card>
  );
};

export default AIWritingCorrection;