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
    improvement_areas: string[];
  };
}

interface AIWritingCorrectionProps {
  userSubmission: string;
  taskTitle: string;
}

const AIWritingCorrection: React.FC<AIWritingCorrectionProps> = ({
  userSubmission,
  taskTitle,
}) => {
  const [loading, setLoading] = useState(false);
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"full" | "sentences">("full");

  useEffect(() => {
    if (userSubmission && userSubmission.trim().length > 10) {
      generateCorrections();
    }
  }, [userSubmission]);

  const generateCorrections = async () => {
    setLoading(true);
    setError(null);
    
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
        statusClasses = "bg-red-100 text-red-800 border-b-2 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-600";
      } else if (span.status === "improvement") {
        statusClasses = "bg-green-100 text-green-800 border-b-2 border-green-300 dark:bg-green-900/20 dark:text-green-200 dark:border-green-600";
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
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-950/30 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
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
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardHeader className="bg-green-50 dark:bg-green-950/30 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
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
    <div className="space-y-4">
      {correctionData?.sentence_pairs?.map((pair, index) => (
        <Card key={index} className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sentence {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Original Sentence */}
            <div>
              <div className="text-xs font-medium text-red-600 mb-1 uppercase tracking-wide">Original</div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm leading-relaxed">{pair.original}</p>
              </div>
            </div>

            {/* Improved Sentence */}
            <div>
              <div className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wide">Improved</div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm leading-relaxed">{pair.corrected}</p>
              </div>
            </div>

            {/* Changes Made */}
            {pair.changes_made && pair.changes_made.length > 0 && (
              <div>
                <div className="text-xs font-medium text-blue-600 mb-2 uppercase tracking-wide">Changes Made</div>
                <div className="space-y-1">
                  {pair.changes_made.map((change, changeIndex) => (
                    <Badge key={changeIndex} variant="outline" className="text-xs">
                      {change}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
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
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-muted-foreground">
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

  if (!correctionData) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
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
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
              {correctionData.summary.total_corrections} corrections made
            </Badge>
            {correctionData.summary.error_types?.map((type, index) => (
              <Badge key={index} variant="outline" className="bg-red-50 dark:bg-red-950/20">
                {type}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {viewMode === "full" ? renderFullTextView() : renderSentenceView()}
        
        {/* Improvement Areas */}
        {correctionData.summary?.improvement_areas && correctionData.summary.improvement_areas.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Key Improvement Areas</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
              {correctionData.summary.improvement_areas.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIWritingCorrection;