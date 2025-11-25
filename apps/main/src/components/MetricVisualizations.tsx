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
        intonation: number;
        stress: number;
        rhythm: number;
    };
    width?: number;
    height?: number;
}

export const RadarMetrics: React.FC<RadarMetricsProps> = ({ metrics, width = 300, height = 250 }) => {
    const data = [
        { subject: 'Pronunciation', A: metrics.pronunciation, fullMark: 100 },
        { subject: 'Intonation', A: metrics.intonation, fullMark: 100 },
        { subject: 'Stress', A: metrics.stress, fullMark: 100 },
        { subject: 'Rhythm', A: metrics.rhythm, fullMark: 100 },
    ];

    return (
        <div className="w-full flex justify-center">
            <div style={{ width: '100%', height: height, maxWidth: width }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Metrics"
                            dataKey="A"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="#3b82f6"
                            fillOpacity={0.2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
