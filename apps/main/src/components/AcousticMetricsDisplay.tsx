import React from 'react';
import { AcousticMetrics, interpretMetrics } from '@/lib/audioAnalyzer';
import { 
  Gauge, 
  Timer, 
  PauseCircle, 
  Activity, 
  Volume2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AcousticMetricsDisplayProps {
  metrics: AcousticMetrics;
  themeStyles?: any;
}

export const AcousticMetricsDisplay: React.FC<AcousticMetricsDisplayProps> = ({ 
  metrics, 
  themeStyles 
}) => {
  const interpreted = interpretMetrics(metrics);

  const getStatusColor = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'poor': return '#ef4444';
    }
  };

  const getStatusBg = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good': return 'rgba(34, 197, 94, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      case 'poor': return 'rgba(239, 68, 68, 0.1)';
    }
  };

  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    unit, 
    label, 
    status,
    idealRange,
    progress
  }: { 
    icon: any; 
    title: string; 
    value: number | string; 
    unit?: string;
    label: string; 
    status: 'good' | 'warning' | 'poor';
    idealRange: string;
    progress?: number;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-help"
            style={{
              borderColor: getStatusColor(status),
              backgroundColor: getStatusBg(status)
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color: getStatusColor(status) }} />
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">
                {title}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: getStatusColor(status) }}>
                {value}
              </span>
              {unit && <span className="text-sm opacity-60">{unit}</span>}
            </div>
            <div className="text-xs mt-1 opacity-80">{label}</div>
            {progress !== undefined && (
              <div className="mt-2">
                <Progress 
                  value={progress} 
                  className="h-1.5"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '--progress-background': getStatusColor(status)
                  } as any}
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{title}</p>
          <p className="text-xs opacity-80">Ideal range: {idealRange}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4" style={{ color: themeStyles?.buttonPrimary || '#3b82f6' }} />
        <h4 className="text-sm font-semibold uppercase tracking-wider">
          Speech Analysis
        </h4>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Gauge}
          title="Speech Rate"
          value={interpreted.speechRate.value}
          unit="WPM"
          label={interpreted.speechRate.label}
          status={interpreted.speechRate.status}
          idealRange="120-160 WPM"
          progress={Math.min(100, (interpreted.speechRate.value / 180) * 100)}
        />

        <MetricCard
          icon={PauseCircle}
          title="Pause Ratio"
          value={interpreted.pauseRatio.value}
          unit="%"
          label={interpreted.pauseRatio.label}
          status={interpreted.pauseRatio.status}
          idealRange="10-25%"
          progress={Math.min(100, interpreted.pauseRatio.value * 2)}
        />

        <MetricCard
          icon={Activity}
          title="Intonation"
          value={interpreted.pitchVariation.value}
          label={interpreted.pitchVariation.label}
          status={interpreted.pitchVariation.status}
          idealRange="40-80"
          progress={interpreted.pitchVariation.value}
        />

        <MetricCard
          icon={Volume2}
          title="Volume"
          value={interpreted.volumeConsistency.value}
          label={interpreted.volumeConsistency.label}
          status={interpreted.volumeConsistency.status}
          idealRange="60-90"
          progress={interpreted.volumeConsistency.value}
        />
      </div>

      {/* Duration Info */}
      <div className="flex items-center justify-between text-xs opacity-60 pt-2 border-t" style={{ borderColor: themeStyles?.border }}>
        <div className="flex items-center gap-1">
          <Timer className="w-3 h-3" />
          <span>Total: {metrics.totalDuration.toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Speaking: {metrics.speakingDuration.toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Pauses: {metrics.pauseCount}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version for inline display
 */
export const AcousticMetricsCompact: React.FC<AcousticMetricsDisplayProps> = ({ 
  metrics,
  themeStyles 
}) => {
  const interpreted = interpretMetrics(metrics);

  const getStatusIcon = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'warning': return <Minus className="w-3 h-3 text-amber-500" />;
      case 'poor': return <TrendingDown className="w-3 h-3 text-red-500" />;
    }
  };

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <Gauge className="w-3 h-3 opacity-60" />
        <span>{interpreted.speechRate.value} WPM</span>
        {getStatusIcon(interpreted.speechRate.status)}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <PauseCircle className="w-3 h-3 opacity-60" />
        <span>{interpreted.pauseRatio.value}% pauses</span>
        {getStatusIcon(interpreted.pauseRatio.status)}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <Activity className="w-3 h-3 opacity-60" />
        <span>Pitch: {interpreted.pitchVariation.value}</span>
        {getStatusIcon(interpreted.pitchVariation.status)}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <Volume2 className="w-3 h-3 opacity-60" />
        <span>Vol: {interpreted.volumeConsistency.value}</span>
        {getStatusIcon(interpreted.volumeConsistency.status)}
      </div>
    </div>
  );
};

export default AcousticMetricsDisplay;

