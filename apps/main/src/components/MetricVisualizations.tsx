import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';

interface CircularScoreProps {
    score: number;
    label?: string;
    subLabel?: string;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

export const CircularScore: React.FC<CircularScoreProps> = ({
    score,
    label = "Score",
    subLabel,
    size = 120,
    strokeWidth = 8,
    color = "#3b82f6",
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-slate-100 dark:text-slate-800"
                />
                {/* Progress Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold" style={{ color }}>
                    {score}%
                </span>
                {label && <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>}
                {subLabel && <span className="text-[10px] text-slate-400">{subLabel}</span>}
            </div>
        </div>
    );
};

interface RadarMetricsProps {
    metrics: {
        pronunciation: number;
        vocabulary: number;
        grammar: number;
        intonation: number;
        fluency: number;
    };
    width?: number;
    height?: number;
}

export const RadarMetrics: React.FC<RadarMetricsProps> = ({ metrics, width = 300, height = 250 }) => {
    // Ensure all metrics have valid values (default to 0 if undefined/null)
    const safeMetrics = {
        pronunciation: Math.max(0, Math.min(100, metrics.pronunciation || 0)),
        vocabulary: Math.max(0, Math.min(100, metrics.vocabulary || 0)),
        grammar: Math.max(0, Math.min(100, metrics.grammar || 0)),
        intonation: Math.max(0, Math.min(100, metrics.intonation || 0)),
        fluency: Math.max(0, Math.min(100, metrics.fluency || 0)),
    };

    const data = [
        { subject: 'Pronunciation', A: safeMetrics.pronunciation, fullMark: 100 },
        { subject: 'Vocabulary', A: safeMetrics.vocabulary, fullMark: 100 },
        { subject: 'Grammar', A: safeMetrics.grammar, fullMark: 100 },
        { subject: 'Intonation', A: safeMetrics.intonation, fullMark: 100 },
        { subject: 'Fluency', A: safeMetrics.fluency, fullMark: 100 },
    ];

    // Check if all values are 0 (no data scenario)
    const hasData = Object.values(safeMetrics).some(v => v > 0);

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div style={{ width: width, height: height, minWidth: 200, minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="55%" data={data}>
                        <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                            tickLine={false}
                        />
                        <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 100]} 
                            tick={false} 
                            axisLine={false}
                            tickCount={5}
                        />
                        <Radar
                            name="Metrics"
                            dataKey="A"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="#3b82f6"
                            fillOpacity={hasData ? 0.3 : 0.05}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
