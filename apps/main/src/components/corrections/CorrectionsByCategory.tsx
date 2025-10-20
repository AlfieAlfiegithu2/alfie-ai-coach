import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CorrectionItem, EnhancedCorrection } from "./CorrectionItem";

interface CorrectionsByCategoryProps {
  corrections: EnhancedCorrection[];
}

const categoryConfig = {
  grammar: { 
    title: "Grammar & Usage", 
    description: "Fixes to grammatical errors and usage issues",
    color: "text-brand-red bg-brand-red/10 border-brand-red/30"
  },
  vocabulary: { 
    title: "Vocabulary Enhancement", 
    description: "More sophisticated and precise word choices",
    color: "text-brand-blue bg-brand-blue/10 border-brand-blue/30"
  },
  style: { 
    title: "Academic Style", 
    description: "Improvements to formality and academic tone",
    color: "text-brand-purple bg-brand-purple/10 border-brand-purple/30"
  },
  punctuation: { 
    title: "Punctuation & Mechanics", 
    description: "Corrections to punctuation and formatting",
    color: "text-brand-orange bg-brand-orange/10 border-brand-orange/30"
  },
  structure: { 
    title: "Sentence Structure", 
    description: "Enhanced sentence variety and flow",
    color: "text-brand-green bg-brand-green/10 border-brand-green/30"
  }
};

export const CorrectionsByCategory: React.FC<CorrectionsByCategoryProps> = ({ corrections }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['grammar', 'vocabulary']));

  const groupedCorrections = corrections.reduce((acc, correction) => {
    if (!acc[correction.category]) {
      acc[correction.category] = [];
    }
    acc[correction.category].push(correction);
    return acc;
  }, {} as Record<string, EnhancedCorrection[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const sortedCategories = Object.keys(groupedCorrections).sort((a, b) => {
    const severityOrder = { major: 3, moderate: 2, minor: 1 };
    const aMaxSeverity = Math.max(...groupedCorrections[a].map(c => severityOrder[c.severity] || 0));
    const bMaxSeverity = Math.max(...groupedCorrections[b].map(c => severityOrder[c.severity] || 0));
    return bMaxSeverity - aMaxSeverity;
  });

  if (corrections.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-6 text-center">
          <div className="text-text-secondary">No corrections needed - excellent work!</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedCategories.map((category) => {
        const categoryCorrections = groupedCorrections[category];
        const config = categoryConfig[category as keyof typeof categoryConfig];
        const isExpanded = expandedCategories.has(category);
        
        return (
          <Card key={category} className="card-elevated">
            <CardHeader className="pb-3">
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category)}
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <div className="flex items-center gap-3">
                  <Badge className={`${config.color} px-3 py-1`}>
                    {categoryCorrections.length}
                  </Badge>
                  <div className="text-left">
                    <CardTitle className="text-heading-5">{config.title}</CardTitle>
                    <div className="text-caption text-text-tertiary">{config.description}</div>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </Button>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {categoryCorrections
                    .sort((a, b) => {
                      const severityOrder = { major: 3, moderate: 2, minor: 1 };
                      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                    })
                    .map((correction) => (
                      <CorrectionItem key={correction.id} correction={correction} />
                    ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};