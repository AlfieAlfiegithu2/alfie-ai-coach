import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface ScoreSpiderChartProps {
  task1Scores?: {
    task_achievement?: number;
    task_response?: number;
    coherence_and_cohesion?: number;
    lexical_resource?: number;
    grammatical_range_and_accuracy?: number;
  };
  task2Scores?: {
    task_achievement?: number;
    task_response?: number;
    coherence_and_cohesion?: number;
    lexical_resource?: number;
    grammatical_range_and_accuracy?: number;
  };
  className?: string;
}

export default function ScoreSpiderChart({ task1Scores, task2Scores, className = "" }: ScoreSpiderChartProps) {
  // Calculate average scores for each criterion
  const calculateAverageScores = () => {
    const t1 = task1Scores || {};
    const t2 = task2Scores || {};
    
    // Task Achievement (Task 1) / Task Response (Task 2) average
    const taScore = (
      (t1.task_achievement || 0) + 
      (t2.task_response || 0)
    ) / 2;
    
    // Coherence and Cohesion average
    const ccScore = (
      (t1.coherence_and_cohesion || 0) + 
      (t2.coherence_and_cohesion || 0)
    ) / 2;
    
    // Lexical Resource average
    const lrScore = (
      (t1.lexical_resource || 0) + 
      (t2.lexical_resource || 0)
    ) / 2;
    
    // Grammatical Range and Accuracy average
    const graScore = (
      (t1.grammatical_range_and_accuracy || 0) + 
      (t2.grammatical_range_and_accuracy || 0)
    ) / 2;

    return [
      { criterion: 'TA', score: Math.round(taScore * 2) / 2, fullName: 'Task Achievement' },
      { criterion: 'CC', score: Math.round(ccScore * 2) / 2, fullName: 'Coherence & Cohesion' },
      { criterion: 'LR', score: Math.round(lrScore * 2) / 2, fullName: 'Lexical Resource' },
      { criterion: 'GRA', score: Math.round(graScore * 2) / 2, fullName: 'Grammar & Accuracy' }
    ];
  };

  const data = calculateAverageScores();
  
  // Check if we have valid data
  const hasValidData = data.some(item => item.score > 0);
  
  if (!hasValidData) {
    return (
      <div className={`flex items-center justify-center bg-surface-3/50 rounded-lg border border-border/50 ${className}`}>
        <div className="text-center p-4">
          <div className="text-text-secondary text-sm">
            Criteria analysis
          </div>
          <div className="text-text-muted text-xs mt-1">
            Not available
          </div>
        </div>
      </div>
    );
  }

  const getBarColor = (index: number) => {
    const colors = [
      'hsl(var(--brand-blue))',
      'hsl(var(--brand-green))', 
      'hsl(var(--brand-purple))',
      'hsl(var(--brand-orange))'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={`bg-surface-3/30 rounded-lg border border-border/30 p-4 ${className}`}>
      <div className="text-center mb-4">
        <div className="text-sm font-medium text-text-primary mb-1">Criteria Analysis</div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          barCategoryGap="20%"
        >
          <XAxis 
            dataKey="criterion" 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fontWeight: 500,
              fill: 'hsl(var(--text-primary))' 
            }}
          />
          <YAxis 
            domain={[0, 9]}
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 10, 
              fill: 'hsl(var(--text-muted))' 
            }}
            tickCount={5}
          />
          <Bar 
            dataKey="score" 
            radius={[4, 4, 0, 0]}
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        {data.map((item, index) => (
          <div key={item.criterion} className="flex justify-between items-center p-2 rounded-lg bg-surface-2/50">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: getBarColor(index) }}
              />
              <span className="text-text-secondary font-medium">{item.criterion}</span>
            </div>
            <span className="text-text-primary font-semibold">{item.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}