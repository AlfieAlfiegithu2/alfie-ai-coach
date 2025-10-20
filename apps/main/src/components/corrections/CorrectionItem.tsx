import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, BookOpen, Edit3, Type, Zap } from "lucide-react";

export interface EnhancedCorrection {
  id: string;
  originalText: string;
  correctedText: string;
  category: 'grammar' | 'vocabulary' | 'style' | 'punctuation' | 'structure';
  severity: 'minor' | 'moderate' | 'major';
  explanation: string;
  example?: string;
  position: { start: number; end: number };
}

interface CorrectionItemProps {
  correction: EnhancedCorrection;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'grammar': return <Edit3 className="w-4 h-4" />;
    case 'vocabulary': return <BookOpen className="w-4 h-4" />;
    case 'style': return <Type className="w-4 h-4" />;
    case 'punctuation': return <AlertCircle className="w-4 h-4" />;
    case 'structure': return <Zap className="w-4 h-4" />;
    default: return <Edit3 className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'grammar': return 'text-brand-red bg-brand-red/10 border-brand-red/30';
    case 'vocabulary': return 'text-brand-blue bg-brand-blue/10 border-brand-blue/30';
    case 'style': return 'text-brand-purple bg-brand-purple/10 border-brand-purple/30';
    case 'punctuation': return 'text-brand-orange bg-brand-orange/10 border-brand-orange/30';
    case 'structure': return 'text-brand-green bg-brand-green/10 border-brand-green/30';
    default: return 'text-text-secondary bg-surface-2 border-border';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'major': return 'bg-brand-red/20 text-brand-red border-brand-red/40';
    case 'moderate': return 'bg-brand-orange/20 text-brand-orange border-brand-orange/40';
    case 'minor': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/40';
    default: return 'bg-surface-2 text-text-secondary border-border';
  }
};

export const CorrectionItem: React.FC<CorrectionItemProps> = ({ correction }) => {
  return (
    <Card className="card-elevated border-l-4 border-l-brand-blue/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${getCategoryColor(correction.category)}`}>
            {getCategoryIcon(correction.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-xs capitalize ${getCategoryColor(correction.category)}`}>
                {correction.category}
              </Badge>
              <Badge variant="outline" className={`text-xs capitalize ${getSeverityColor(correction.severity)}`}>
                {correction.severity}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-text-tertiary text-sm font-medium">Original:</span>
                <div className="px-3 py-2 bg-brand-red/10 text-brand-red rounded-lg border border-brand-red/30">
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {correction.originalText}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-text-tertiary text-sm font-medium">Improved:</span>
                <div className="px-3 py-2 bg-brand-green/10 text-brand-green rounded-lg border border-brand-green/30">
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {correction.correctedText}
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Why this helps:</span> {correction.explanation}
              </div>
              
              {correction.example && (
                <div className="text-xs text-text-tertiary p-2 bg-surface-2 rounded border-l-2 border-brand-blue/30">
                  <span className="font-medium">Example:</span> {correction.example}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};