import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PenTool, MessageSquare, TrendingUp, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Typing animation component for numbers
const TypingNumber = ({ targetValue, duration = 2000, className = "", isCurrency = false }: { targetValue: string | number, duration?: number, className?: string, isCurrency?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      if (typeof targetValue === 'number') {
        setDisplayValue(Math.floor(targetValue * easeOutQuart));
      } else if (typeof targetValue === 'string') {
        const numericValue = parseFloat(targetValue.toString().match(/[\d.]+/)?.[0] || '0');
        setDisplayValue(Math.floor(numericValue * easeOutQuart));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [targetValue, duration]);

  let displayText = '';
  if (typeof targetValue === 'number') {
    displayText = isCurrency ? displayValue.toLocaleString() : displayValue.toString();
  } else if (typeof targetValue === 'string') {
    const suffix = targetValue.toString().replace(/[\d.]+/, '').trim();
    displayText = `${displayValue}${suffix ? ` ${suffix}` : ''}`;
  }

  return <span className={className}>{displayText}</span>;
};

interface SkillsProgressChartProps {
  className?: string;
}

const SkillsProgressChart = ({ className }: SkillsProgressChartProps) => {
  const { t } = useTranslation();
  const [activeSkill, setActiveSkill] = useState<string | null>('overall');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const skills = [
    {
      id: 'ielts',
      label: 'IELTS',
      icon: TrendingUp,
      color: '#d97757',
      baseline: 3.2,
      target: 7.1,
    },
    {
      id: 'toeic',
      label: 'TOEIC',
      icon: null,
      color: '#3b82f6',
      baseline: 550,
      target: 900,
    },
    {
      id: 'toefl',
      label: 'TOEFL',
      icon: null,
      color: '#10b981',
      baseline: 60,
      target: 110,
    },
    {
      id: 'pte',
      label: 'PTE',
      icon: null,
      color: '#f59e0b',
      baseline: 42,
      target: 85,
    },
  ];

  // Generate sample progress data for each skill (monthly intervals)
  const generateProgressData = (skill: typeof skills[0]) => {
    const data = [];
    const baseline = skill.baseline;
    const target = skill.target;
    const improvement = target - baseline;
    const totalMonths = 6; // 6 months track

    // Generate monthly data points
    for (let month = 0; month <= totalMonths; month++) {
      let progressRatio;
      
      if (month === 0) {
          progressRatio = 0;
      } else {
        // Generate a more natural S-curve (sigmoid-like) but keeping the upward trend
        // This looks more realistic than a pure exponential curve
        // S-curve formula: 1 / (1 + e^(-k(x-x0)))
        
        const x = (month / totalMonths) * 6 - 3; // Map 0..1 to -3..3 range for sigmoid
        let ratio = 1 / (1 + Math.exp(-x));
        
        // Normalize to 0..1 range
        // Sigmoid at -3 is ~0.047, at 3 is ~0.952
        const minSigmoid = 1 / (1 + Math.exp(3));
        const maxSigmoid = 1 / (1 + Math.exp(-3));
        ratio = (ratio - minSigmoid) / (maxSigmoid - minSigmoid);
        
        // Add small random noise for "natural" look, but keep it mostly monotonic
        const noise = (Math.random() - 0.5) * 0.05;
        progressRatio = Math.max(0, Math.min(1, ratio + noise));
      }

      let score = baseline + improvement * progressRatio;
      
      // Ensure we hit exact target at the end
      if (month === totalMonths) score = target;

      // Calculate student count for this level
      const baseStudents = 1200;
      const studentCount = Math.floor(
        baseStudents * (month / totalMonths) * (0.8 + Math.random() * 0.4) + (month * 100)
      );

      data.push({
        month: month === 0 ? 'Start' : `Month ${month}`,
        score: Math.max(baseline, Math.min(target, Math.round(score * 10) / 10)),
        label: month === 0 ? 'Starting Point' : `Month ${month} Progress`,
        description: `${Math.round(score * 10) / 10} Band Score`,
        students: studentCount
      });
    }

    return data;
  };

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  const chartVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={variants}
    >
      <Card className="bg-[#fcfaf8] border-[#e6e0d4] shadow-sm overflow-hidden min-h-[500px]">
        <CardContent className="pt-8">
          {/* Skills Selection */}
          <motion.div variants={itemVariants} className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {skills.map((skill) => {
              const isActive = activeSkill === skill.id || (activeSkill === 'overall' && skill.id === 'ielts');
              return (
                <motion.button
                  key={skill.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSkill(skill.id)}
                  className={`p-3 rounded-lg border transition-all duration-300 ${activeSkill === skill.id
                      ? 'border-[#d97757] bg-white shadow-md'
                      : 'border-[#e6e0d4] bg-[#faf8f6] hover:bg-white hover:border-[#d97757]/50'
                    }`}
                >
                  <div className="text-center">
                    <div className={`text-sm font-bold font-serif ${activeSkill === skill.id ? 'text-[#2d2d2d]' : 'text-[#666666]'}`}>
                      {skill.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Chart Display */}
          <AnimatePresence mode="wait">
             <motion.div
                key={activeSkill || 'default'}
                variants={chartVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="relative"
              >
                {(() => {
                  const skill = skills.find(s => s.id === (activeSkill === 'overall' ? 'ielts' : activeSkill)) || skills[0];
                  const chartData = generateProgressData(skill);
                  const IconComponent = skill.icon;

                  return (
                    <div className="bg-white rounded-xl p-6 border border-[#e6e0d4] shadow-sm">
                      {/* Skill Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-[#2d2d2d] font-serif">
                            {skill.label} Mastery Path
                            </h3>
                        </div>
                      </div>

                      {/* Chart */}
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e0d4" />
                            <XAxis
                              dataKey="month"
                              stroke="#666666"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontFamily: "'Montserrat', sans-serif", fill: '#666666' }}
                              dy={10}
                            />
                            <YAxis
                              stroke="#666666"
                              fontSize={12}
                              domain={[Math.floor(skill.baseline * 0.8), Math.ceil(skill.target * 1.1)]}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `${value}`}
                              tick={{ fontFamily: "'Montserrat', sans-serif", fill: '#666666' }}
                              dx={-10}
                            />
                            <Tooltip
                              cursor={{ fill: '#f5f2e8', opacity: 0.5 }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white border border-[#e6e0d4] rounded-lg p-3 shadow-lg">
                                      <p className="font-serif font-bold text-[#2d2d2d] mb-1">{data.month}</p>
                                      <div className="flex items-baseline gap-2">
                                        <p className="text-xl font-bold text-[#d97757]">
                                            {data.score}
                                        </p>
                                        <span className="text-xs text-[#666666] font-medium uppercase">Band Score</span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar
                              dataKey="score"
                              fill={skill.color}
                              radius={[4, 4, 0, 0]}
                              animationDuration={1500}
                              barSize={40}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bottom Stats removed */}
                    </div>
                  );
                })()}
              </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SkillsProgressChart;