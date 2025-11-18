import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

interface AnnotatedWritingTextProps {
  taskTitle: string;
  originalText: string;
  annotatedOriginal?: string;
  annotatedCorrected?: string;
  corrections?: Array<{
    original_text: string;
    corrected_text: string;
    start_index: number;
    end_index: number;
    error_type: string;
    explanation: string;
  }>;
  icon: React.ComponentType<{ className?: string }>;
  colorScheme: string;
}

const AnnotatedWritingText: React.FC<AnnotatedWritingTextProps> = ({
  taskTitle,
  originalText,
  annotatedOriginal,
  annotatedCorrected,
  corrections = [],
  icon: Icon,
  colorScheme
}) => {
  const [showCorrections, setShowCorrections] = useState(false);

  // Fallback: If no annotated text, create simple version
  const createFallbackAnnotations = () => {
    if (!corrections.length) return { original: originalText, corrected: originalText };
    
    let annotatedOrig = originalText;
    let annotatedCorr = originalText;
    
    // Sort corrections by start_index in reverse order to avoid index shifting
    const sortedCorrections = [...corrections].sort((a, b) => b.start_index - a.start_index);
    
    for (const correction of sortedCorrections) {
      const { original_text, corrected_text, start_index, end_index, error_type, explanation } = correction;
      
      // Create error span for original
      const errorSpan = `<span class="error-text" data-type="${error_type}" data-explanation="${explanation}" title="${explanation}">${original_text}</span>`;
      annotatedOrig = annotatedOrig.substring(0, start_index) + errorSpan + annotatedOrig.substring(end_index);
      
      // Create correction span for corrected
      const correctionSpan = `<span class="correction-text" data-type="${error_type}" title="Corrected: ${explanation}">${corrected_text}</span>`;
      annotatedCorr = annotatedCorr.substring(0, start_index) + correctionSpan + annotatedCorr.substring(end_index);
    }
    
    return { original: annotatedOrig, corrected: annotatedCorr };
  };

  const fallbackAnnotations = createFallbackAnnotations();
  const displayOriginal = annotatedOriginal || fallbackAnnotations.original;
  const displayCorrected = annotatedCorrected || fallbackAnnotations.corrected;

  const hasCorrections = corrections.length > 0 || annotatedOriginal || annotatedCorrected;

  return (
    <Card className="card-modern">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${colorScheme}`}>
            <div className={`p-2 rounded-xl bg-current/10`}>
              <Icon className="w-4 h-4" />
            </div>
            {taskTitle}
          </CardTitle>
          {hasCorrections && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCorrections(!showCorrections)}
              className="gap-2"
            >
              {showCorrections ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Corrections
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Corrections
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasCorrections ? (
          <Tabs value={showCorrections ? "corrected" : "original"} onValueChange={(value) => setShowCorrections(value === "corrected")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="original" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Original (with errors)
              </TabsTrigger>
              <TabsTrigger value="corrected" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Corrected
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="original">
              <div className="bg-surface-3 p-4 rounded-2xl text-base max-h-80 overflow-y-auto text-text-secondary leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{
                    __html: displayOriginal.replace(/\n/g, '<br>')
                  }}
                  className="annotated-text"
                />
              </div>
              {corrections.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-text-primary">
                    Corrections Found ({corrections.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {corrections.slice(0, 5).map((correction, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-surface-2 rounded-lg text-xs">
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                          {correction.error_type}
                        </Badge>
                        <div>
                          <div className="text-red-600 line-through">{correction.original_text}</div>
                          <div className="text-green-600 font-medium">{correction.corrected_text}</div>
                          <div className="text-text-secondary mt-1">{correction.explanation}</div>
                        </div>
                      </div>
                    ))}
                    {corrections.length > 5 && (
                      <div className="text-xs text-text-secondary text-center">
                        +{corrections.length - 5} more corrections
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="corrected">
              <div className="bg-surface-3 p-4 rounded-2xl text-base max-h-80 overflow-y-auto text-text-secondary leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{
                    __html: displayCorrected.replace(/\n/g, '<br>')
                  }}
                  className="annotated-text"
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="bg-surface-3 p-4 rounded-2xl text-base max-h-60 overflow-y-auto text-text-secondary leading-relaxed">
            {originalText}
          </div>
        )}
      </CardContent>
      
      <style>{`
        .annotated-text .error-text {
          background-color: #fee2e2;
          color: #dc2626;
          padding: 2px 4px;
          border-radius: 4px;
          cursor: help;
          border-bottom: 2px solid #dc2626;
        }
        
        .annotated-text .correction-text {
          background-color: #dcfce7;
          color: #16a34a;
          padding: 2px 4px;
          border-radius: 4px;
          cursor: help;
          border-bottom: 2px solid #16a34a;
        }
        
        .annotated-text error[data-type] {
          background-color: #fee2e2;
          color: #dc2626;
          padding: 2px 4px;
          border-radius: 4px;
          cursor: help;
          border-bottom: 2px solid #dc2626;
        }
        
        .annotated-text correction[data-type] {
          background-color: #dcfce7;
          color: #16a34a;
          padding: 2px 4px;
          border-radius: 4px;
          cursor: help;
          border-bottom: 2px solid #16a34a;
        }
      `}</style>
    </Card>
  );
};

export default AnnotatedWritingText;