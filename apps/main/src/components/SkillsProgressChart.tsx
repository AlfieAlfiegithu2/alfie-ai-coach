import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, TrendingUp, Clock, Target, Star } from 'lucide-react';
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
  const [activeSkill, setActiveSkill] = useState<string | null>('ielts');
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
      color: '#d97757', // Terracotta for main
      baseline: 3.5,
      target: 7.0,
      examType: 'IELTS (0-9)',
    },
    {
      id: 'toefl',
      label: 'TOEFL',
      color: '#4a3b32', // Deep Brown
      baseline: 65,
      target: 100,
      examType: 'TOEFL (0-120)',
    },
    {
      id: 'pte',
      label: 'PTE',
      color: '#6b5c51', // Warm Taupe
      baseline: 35,
      target: 75,
      examType: 'PTE (10-90)',
    },
    {
      id: 'toeic',
      label: 'TOEIC',
      color: '#8c7d72', // Light Taupe
      baseline: 450,
      target: 850,
      examType: 'TOEIC (0-990)',
    },
  ];

  // Generate sample progress data for each skill (weekly intervals)
  const generateProgressData = (skill: typeof skills[0]) => {
    const data = [];
    const baseline = skill.baseline;
    const target = skill.target;
    const improvement = target - baseline;
    const totalMonths = 5; // 5 months for cleaner data

    // Start (baseline)
    data.push({
      month: 'Month 0',
      score: baseline,
      label: 'Initial Level',
      description: `${baseline} Score`,
      students: 0
    });

    // Generate monthly data points - DRAMATIC improvement curve
    for (let month = 1; month <= totalMonths; month++) {
      // Calculate score based on month (ultra-aggressive improvement)
      let progressRatio;
      if (skill.id === 'toefl') {
        // TOEFL: Even more dramatic curve
        if (month === 1) {
          progressRatio = 0.05; // Minimal start (65 → 68)
        } else if (month === 2) {
          progressRatio = 0.60; // Massive jump (65 → 88)
        } else if (month === 3) {
          progressRatio = 0.90; // Huge improvement (65 → 96)
        } else if (month === 4) {
          progressRatio = 0.98; // Almost there (65 → 99)
        } else {
          progressRatio = 1.0; // Target achieved (65 → 100)
        }
      } else {
        // Other exams: Standard dramatic curve
        if (month === 1) {
          progressRatio = 0.08; // Only 8% of total improvement in first month
        } else if (month === 2) {
          progressRatio = 0.53; // 53% improvement by end of second month
        } else if (month === 3) {
          progressRatio = 0.88; // 88% improvement by end of third month
        } else if (month === 4) {
          progressRatio = 0.98; // 98% improvement by end of fourth month
        } else {
          progressRatio = 1.0; // Reach target by end of fifth month
        }
      }

      let score = baseline + improvement * progressRatio;
      // Add very minimal imperfection for cleaner, more impressive curve
      score += (Math.random() - 0.5) * 0.02;

      // Calculate student count for this month - based on exam popularity
      const baseStudents = skill.id === 'ielts' ? 5683 :
                          skill.id === 'toefl' ? 2847 :
                          skill.id === 'pte' ? 1923 :
                          skill.id === 'toeic' ? 3456 : 5683;

      const studentCount = Math.floor(
        baseStudents * (month / totalMonths) * (0.8 + Math.random() * 0.4) // Some randomness in student growth
      );

      data.push({
        month: `Month ${month}`,
        score: Math.max(baseline, Math.min(target, Math.round(score * 10) / 10)),
        label: `Month ${month} Progress`,
        description: `${Math.round(score * 10) / 10} Score`,
        students: studentCount
      });
    }

    // Target (final goal) - realistic achievement levels
    const finalStudents = skill.id === 'ielts' ? 5683 :
                         skill.id === 'toefl' ? 2847 :
                         skill.id === 'pte' ? 1923 :
                         skill.id === 'toeic' ? 3456 : 5683;

    data.push({
      week: 'Goal',
      score: target,
      label: 'Goal Achieved',
      description: `${target} Score achieved`,
      students: finalStudents
    });

    return data;
  };

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4 }
    }
  };

  const chartVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={variants}
    >
      <Card className="bg-white border border-[#e6e0d4] shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="pb-6 border-b border-[#f5f2e8] bg-[#faf8f6]">
        </CardHeader>

        <CardContent className="pt-8">
          {/* Skills Selection */}
          <motion.div variants={itemVariants} className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {skills.map((skill) => {
              const isActive = activeSkill === skill.id;
              return (
                <motion.button
                  key={skill.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveSkill(skill.id)}
                  className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-center text-center ${
                    isActive
                      ? 'border-[#d97757] bg-[#d97757]/5 shadow-sm'
                      : 'border-[#e6e0d4] bg-white hover:border-[#d97757]/50 hover:bg-[#faf8f6]'
                  }`}
                >
                  <span className={`text-sm font-medium font-sans ${isActive ? 'text-[#2d2d2d]' : 'text-[#666666]'}`}>
                    {skill.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Chart Display */}
          <AnimatePresence mode="wait" initial={false}>
            {activeSkill && (
              <motion.div
                key={activeSkill}
                variants={chartVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={{ minHeight: '350px' }} // Force container height to prevent shifting
              >
                {(() => {
                  const skill = skills.find(s => s.id === activeSkill);
                  if (!skill) return null;

                  const chartData = generateProgressData(skill);

                  // Dynamic Y-axis configuration based on exam
                  const getYAxisConfig = (skill: any) => {
                    if (skill.id === 'toefl') {
                      return { domain: [0, 120], ticks: [0, 30, 60, 90, 120] };
                    } else if (skill.id === 'pte') {
                      return { domain: [10, 90], ticks: [10, 30, 50, 70, 90] };
                    } else if (skill.id === 'toeic') {
                      return { domain: [0, 990], ticks: [0, 200, 400, 600, 800, 990] };
                    } else {
                      return { domain: [0, 9], ticks: [0, 2, 4, 6, 8, 9] };
                    }
                  };

                  // Dynamic stats based on exam
                  const getExamStats = (skill: any) => {
                    if (skill.id === 'toefl') {
                      return { time: "5.2", students: 2847 };
                    } else if (skill.id === 'pte') {
                      return { time: "4.8", students: 1923 };
                    } else if (skill.id === 'toeic') {
                      return { time: "6.1", students: 3456 };
                    } else {
                      return { time: "4.6", students: 5683 };
                    }
                  };

                  const yAxisConfig = getYAxisConfig(skill);
                  const examStats = getExamStats(skill);

                  return (
                    <>
                      {/* Skill Header */}
                      <div className="flex items-center gap-3 mb-8 px-2">
                        <h3 className="text-xl font-bold text-[#2d2d2d]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {skill.examType} Progress Curve
                        </h3>
                      </div>

                      {/* Chart */}
                      <div className="h-[350px] mb-8 w-full min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e6e0d4" vertical={false} />
                          <XAxis
                            dataKey="month"
                            stroke="#666666"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontFamily: 'Inter, sans-serif', fill: '#666666' }}
                            dy={10}
                          />
                          <YAxis
                            stroke="#666666"
                            fontSize={12}
                            domain={yAxisConfig.domain}
                            ticks={yAxisConfig.ticks}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontFamily: 'Inter, sans-serif', fill: '#666666' }}
                            dx={-10}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border border-[#e6e0d4] rounded-xl p-4 shadow-lg">
                                    <p className="font-serif font-medium text-[#2d2d2d] mb-1">{data.label}</p>
                                    <p className="text-sm text-[#666666] font-sans mb-2">{data.description}</p>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold font-serif text-[#d97757]">
                                        {data.score}
                                      </span>
                                      <span className="text-xs text-[#666666] font-sans uppercase tracking-wide">Score</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <defs>
                            <linearGradient id={`color-${skill.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d97757" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#d97757" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#d97757"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${skill.id})`}
                            animationDuration={1500}
                            dot={{ stroke: "#d97757", strokeWidth: 2, fill: '#fff', r: 4 }}
                            activeDot={{ stroke: "#d97757", strokeWidth: 2, fill: '#fff', r: 6 }}
                          />
                        </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Progress Stats */}
                      <motion.div className="grid grid-cols-2 gap-6 text-center" variants={itemVariants}>
                        <motion.div className="p-6 bg-[#faf8f6] rounded-2xl border border-[#f5f2e8]">
                          <div className="text-3xl font-bold text-[#2d2d2d] mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            <TypingNumber targetValue={examStats.time} duration={1500} />
                            <span className="text-lg text-[#666666] ml-1">Months</span>
                          </div>
                          <div className="text-sm text-[#666666] font-sans">Average Time to Goal</div>
                        </motion.div>
                        <motion.div className="p-6 bg-[#faf8f6] rounded-2xl border border-[#f5f2e8]">
                          <div className="text-3xl font-bold text-[#2d2d2d] mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            <TypingNumber
                              targetValue={examStats.students}
                              duration={1500}
                              isCurrency={false}
                            />
                          </div>
                          <div className="text-sm text-[#666666] font-sans">Successful Students</div>
                        </motion.div>
                      </motion.div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SkillsProgressChart;