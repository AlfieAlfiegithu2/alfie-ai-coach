import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";

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
        <CardTitle className={`flex items-center gap-2 ${colorScheme}`}>
          <div className={`p-2 rounded-xl bg-current/10`}>
            <Icon className="w-4 h-4" />
          </div>
          {taskTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasCorrections ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side - Original with errors (red highlights) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-semibold text-text-primary">Original Text</h3>
                <Badge variant="destructive" className="text-xs">
                  {corrections.length} errors
                </Badge>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-2xl text-sm max-h-80 overflow-y-auto leading-relaxed">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: displayOriginal.replace(/\n/g, '<br>') 
                  }}
                  className="annotated-text text-text-primary"
                />
              </div>
              
              {/* Error details */}
              {corrections.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                    Error Details ({Math.min(5, corrections.length)} of {corrections.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {corrections.slice(0, 5).map((correction, index) => (
                      <div key={index} className="bg-destructive/5 border border-destructive/20 p-3 rounded-xl">
                        <div className="space-y-2">
                          <Badge variant="destructive" className="text-xs">
                            {correction.error_type}
                          </Badge>
                          <div>
                            <span className="text-xs text-text-tertiary uppercase tracking-wide">Error:</span>
                            <div className="text-sm text-destructive font-medium">{correction.original_text}</div>
                          </div>
                          {correction.explanation && (
                            <div className="text-xs text-text-secondary">{correction.explanation}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {corrections.length > 5 && (
                      <div className="text-xs text-text-secondary text-center p-2">
                        +{corrections.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side - Corrected version (green highlights) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-green" />
                <h3 className="text-sm font-semibold text-text-primary">AI Correction</h3>
                <Badge className="text-xs bg-brand-green/10 text-brand-green border-brand-green/30">
                  Revised
                </Badge>
              </div>
              <div className="bg-brand-green/5 border border-brand-green/20 p-4 rounded-2xl text-sm max-h-80 overflow-y-auto leading-relaxed">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: displayCorrected.replace(/\n/g, '<br>') 
                  }}
                  className="annotated-text text-text-primary"
                />
              </div>
              
              {/* Correction details */}
              {corrections.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                    Applied Corrections
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {corrections.slice(0, 5).map((correction, index) => (
                      <div key={index} className="bg-brand-green/5 border border-brand-green/20 p-3 rounded-xl">
                        <div className="space-y-2">
                          <Badge className="text-xs bg-brand-green/10 text-brand-green border-brand-green/30">
                            {correction.error_type}
                          </Badge>
                          <div>
                            <span className="text-xs text-text-tertiary uppercase tracking-wide">Corrected to:</span>
                            <div className="text-sm text-brand-green font-medium">{correction.corrected_text}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-3 p-4 rounded-2xl text-sm max-h-60 overflow-y-auto text-text-secondary leading-relaxed">
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