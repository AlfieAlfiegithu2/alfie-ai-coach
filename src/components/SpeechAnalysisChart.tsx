import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Volume2, Zap } from "lucide-react";

interface AudioFeatures {
  confidence: number;
  audioInsights: {
    speakingRate: number;
    pauseCount: number;
    totalPauseDuration: number;
    averageConfidence: number;
  };
}

interface SpeechAnalysisChartProps {
  audioFeatures: AudioFeatures;
  transcription: string;
  part: string;
}

const SpeechAnalysisChart = ({ audioFeatures, transcription, part }: SpeechAnalysisChartProps) => {
  const { confidence, audioInsights } = audioFeatures;
  const { speakingRate, pauseCount, totalPauseDuration, averageConfidence } = audioInsights;
  
  // Calculate metrics for visualization
  const normalSpeakingRate = { min: 120, max: 180 };
  const ratePercentage = Math.min(100, Math.max(0, ((speakingRate - 80) / (200 - 80)) * 100));
  const confidencePercentage = Math.round(confidence * 100);
  const avgConfidencePercentage = Math.round(averageConfidence * 100);
  
  // Determine quality levels
  const getRateQuality = (rate: number) => {
    if (rate >= normalSpeakingRate.min && rate <= normalSpeakingRate.max) return { level: "Good", color: "text-green-600 bg-green-100" };
    if (rate < 100) return { level: "Too Slow", color: "text-orange-600 bg-orange-100" };
    if (rate > 200) return { level: "Too Fast", color: "text-red-600 bg-red-100" };
    return { level: "Acceptable", color: "text-blue-600 bg-blue-100" };
  };
  
  const getConfidenceQuality = (conf: number) => {
    if (conf >= 85) return { level: "Excellent", color: "text-green-600 bg-green-100" };
    if (conf >= 70) return { level: "Good", color: "text-blue-600 bg-blue-100" };
    if (conf >= 50) return { level: "Fair", color: "text-yellow-600 bg-yellow-100" };
    return { level: "Needs Work", color: "text-red-600 bg-red-100" };
  };
  
  const getPauseQuality = (pauses: number) => {
    if (pauses <= 3) return { level: "Fluent", color: "text-green-600 bg-green-100" };
    if (pauses <= 8) return { level: "Moderate", color: "text-blue-600 bg-blue-100" };
    if (pauses <= 15) return { level: "Hesitant", color: "text-orange-600 bg-orange-100" };
    return { level: "Choppy", color: "text-red-600 bg-red-100" };
  };
  
  const rateQuality = getRateQuality(speakingRate);
  const confidenceQuality = getConfidenceQuality(confidencePercentage);
  const pauseQuality = getPauseQuality(pauseCount);
  
  // Create pause visualization bars
  const maxPauses = 25;
  const pauseBars = Array.from({ length: Math.min(pauseCount, maxPauses) }, (_, i) => (
    <div
      key={i}
      className="w-1 bg-gradient-to-t from-red-400 to-red-600 rounded-sm animate-fade-in"
      style={{
        height: `${Math.random() * 40 + 20}px`,
        animationDelay: `${i * 50}ms`
      }}
    />
  ));

  return (
    <Card className="card-modern bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Speech Analysis for {part}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Speaking Rate Analysis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium">Speaking Rate</span>
            </div>
            <Badge className={rateQuality.color}>
              {rateQuality.level}
            </Badge>
          </div>
          
          <div className="relative">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              {/* Optimal range indicator */}
              <div 
                className="absolute h-full bg-green-200 opacity-50"
                style={{
                  left: `${((normalSpeakingRate.min - 80) / (200 - 80)) * 100}%`,
                  width: `${((normalSpeakingRate.max - normalSpeakingRate.min) / (200 - 80)) * 100}%`
                }}
              />
              {/* Current rate indicator */}
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out"
                style={{ width: `${ratePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Slow (80 wpm)</span>
              <span className="font-medium text-foreground">{Math.round(speakingRate)} wpm</span>
              <span>Fast (200+ wpm)</span>
            </div>
          </div>
        </div>

        {/* Confidence & Clarity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Speech Clarity</span>
            </div>
            <div className="relative">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${confidencePercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">{confidencePercentage}%</span>
                <Badge className={`${confidenceQuality.color} text-xs`}>
                  {confidenceQuality.level}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Fluency</span>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{pauseCount}</div>
              <div className="text-xs text-muted-foreground">Significant Pauses</div>
              <Badge className={`${pauseQuality.color} text-xs mt-1`}>
                {pauseQuality.level}
              </Badge>
            </div>
          </div>
        </div>

        {/* Pause Visualization */}
        {pauseCount > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Pause Pattern Visualization
            </h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-end gap-1 h-16 overflow-x-auto">
                {pauseBars}
                {pauseCount > maxPauses && (
                  <div className="text-xs text-muted-foreground ml-2 self-center">
                    +{pauseCount - maxPauses} more
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Each bar represents a significant pause (≥150ms) detected in your speech
              </div>
            </div>
          </div>
        )}

        {/* Quick Insights */}
        <div className="bg-card/80 rounded-lg p-4 border border-primary/10">
          <h4 className="font-medium text-sm mb-3">Quick Analysis</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total pause time:</span>
              <span className="font-medium">{Math.round(totalPauseDuration * 1000)}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Word confidence:</span>
              <span className="font-medium">{avgConfidencePercentage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Response length:</span>
              <span className="font-medium">{transcription.split(' ').length} words</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeechAnalysisChart;