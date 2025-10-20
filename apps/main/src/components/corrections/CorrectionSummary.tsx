import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface CorrectionSummaryProps {
  summary: {
    totalCorrections: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

const categoryLabels = {
  grammar: "Grammar",
  vocabulary: "Vocabulary", 
  style: "Style",
  punctuation: "Punctuation",
  structure: "Structure"
};

const severityConfig = {
  major: { 
    label: "Major Issues", 
    color: "text-brand-red bg-brand-red/10 border-brand-red/30",
    icon: <AlertTriangle className="w-4 h-4" />
  },
  moderate: { 
    label: "Moderate Issues", 
    color: "text-brand-orange bg-brand-orange/10 border-brand-orange/30",
    icon: <TrendingUp className="w-4 h-4" />
  },
  minor: { 
    label: "Minor Improvements", 
    color: "text-brand-blue bg-brand-blue/10 border-brand-blue/30",
    icon: <CheckCircle className="w-4 h-4" />
  }
};

export const CorrectionSummary: React.FC<CorrectionSummaryProps> = ({ summary }) => {
  const getWritingQuality = (totalCorrections: number) => {
    if (totalCorrections === 0) return { label: "Excellent", color: "text-brand-green", progress: 100 };
    if (totalCorrections <= 3) return { label: "Very Good", color: "text-brand-blue", progress: 85 };
    if (totalCorrections <= 8) return { label: "Good", color: "text-brand-orange", progress: 70 };
    if (totalCorrections <= 15) return { label: "Needs Improvement", color: "text-brand-red", progress: 50 };
    return { label: "Needs Significant Work", color: "text-brand-red", progress: 30 };
  };

  const quality = getWritingQuality(summary.totalCorrections);

  return (
    <Card className="card-elevated border-l-4 border-l-brand-blue/50">
      <CardHeader>
        <CardTitle className="text-heading-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-blue" />
          Correction Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Overall Writing Quality</span>
            <Badge className={`${quality.color} bg-current/10`}>{quality.label}</Badge>
          </div>
          <Progress value={quality.progress} className="h-2" />
          <div className="text-caption text-text-tertiary">
            {summary.totalCorrections === 0 
              ? "No corrections needed - excellent work!" 
              : `${summary.totalCorrections} areas for improvement identified`}
          </div>
        </div>

        {/* Severity Breakdown */}
        {summary.totalCorrections > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-primary">Issues by Severity</div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(severityConfig).map(([key, config]) => {
                const count = summary.bySeverity[key] || 0;
                return (
                  <div key={key} className={`rounded-lg p-3 border ${config.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {config.icon}
                      <span className="text-xs font-medium">{config.label}</span>
                    </div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {summary.totalCorrections > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-primary">Areas for Improvement</div>
            <div className="space-y-2">
              {Object.entries(summary.byCategory)
                .filter(([_, count]) => count > 0)
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between py-1">
                    <span className="text-sm text-text-secondary">{categoryLabels[category as keyof typeof categoryLabels]}</span>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};