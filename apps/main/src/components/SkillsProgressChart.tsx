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
      id: 'overall',
      label: 'Overall Progress',
      icon: TrendingUp,
      color: '#6366f1',
      baseline: 3.0,
      target: 7.0,
    },
    {
      id: 'reading',
      label: 'Reading',
      icon: BookOpen,
      color: '#3b82f6',
      baseline: 3.0,
      target: 7.0,
    },
    {
      id: 'listening',
      label: 'Listening',
      icon: Volume2,
      color: '#10b981',
      baseline: 3.0,
      target: 7.0,
    },
    {
      id: 'writing',
      label: 'Writing',
      icon: PenTool,
      color: '#f59e0b',
      baseline: 3.0,
      target: 7.0,
    },
    {
      id: 'speaking',
      label: 'Speaking',
      icon: MessageSquare,
      color: '#ef4444',
      baseline: 3.0,
      target: 7.0,
    },
  ];

  // Generate sample progress data for each skill (weekly intervals)
  const generateProgressData = (skill: typeof skills[0]) => {
    const data = [];
    const baseline = skill.baseline;
    const target = skill.target;
    const improvement = target - baseline;
    const totalWeeks = 20; // 20 weeks for more granular data

    // Start (baseline)
    data.push({
      week: 'Week 0',
      score: baseline,
      label: 'Initial Level',
      description: `${baseline} Band Score`,
      students: 0
    });

    // Generate weekly data points
    for (let week = 1; week <= totalWeeks; week++) {
      // Calculate score based on week (more gradual at first, then steeper)
      let progressRatio;
      if (week <= 4) {
        // First month: slower initial progress
        progressRatio = (week / 4) * 0.3; // 30% of total improvement in first month
      } else if (week <= 12) {
        // Middle period: accelerated progress
        progressRatio = 0.3 + ((week - 4) / 8) * 0.5; // Next 50% over 8 weeks
      } else {
        // Final period: rapid completion
        progressRatio = 0.8 + ((week - 12) / 8) * 0.2; // Final 20% over last 8 weeks
      }

      let score = baseline + improvement * progressRatio;
      // Add slight imperfection - not exactly linear
      score += (Math.random() - 0.5) * 0.08;

      // Calculate student count for this week - different baseline for each skill
      const baseStudents = skill.id === 'reading' ? 1456 :
        skill.id === 'listening' ? 1324 :
          skill.id === 'writing' ? 1189 :
            skill.id === 'speaking' ? 1247 : 1247;

      const studentCount = Math.floor(
        baseStudents * (week / totalWeeks) * (0.8 + Math.random() * 0.4) // Some randomness in student growth
      );

      data.push({
        week: `Week ${week}`,
        score: Math.max(baseline, Math.min(target, Math.round(score * 10) / 10)),
        label: `Week ${week} Progress`,
        description: `${Math.round(score * 10) / 10} Band Score`,
        students: studentCount
      });
    }

    // Target (final goal) - different final numbers for each skill
    const finalStudents = skill.id === 'reading' ? 6234 :
      skill.id === 'listening' ? 5891 :
        skill.id === 'writing' ? 5476 :
          skill.id === 'speaking' ? 5683 : 5683;

    data.push({
      week: 'Target',
      score: target,
      label: 'Goal Achieved',
      description: `${target} Band Score target`,
      students: finalStudents
    });

    return data;
  };

  const chartConfig = {
    score: {
      label: "Band Score",
      color: "hsl(var(--chart-1))",
    },
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
      <Card className="bg-white/10 border-white/20 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-4">
          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-slate-700" />
            <CardTitle className="text-slate-800 text-xl">
              English Skills Progress
            </CardTitle>
          </motion.div>
          <motion.p variants={itemVariants} className="text-sm text-slate-600">
            See your overall progress and click any skill to explore individual journeys • Based on 5,683 active students
          </motion.p>
        </CardHeader>

        <CardContent>
          {/* Skills Selection */}
          <motion.div variants={itemVariants} className="mb-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
            {skills.map((skill) => {
              const IconComponent = skill.icon;
              const isActive = activeSkill === skill.id;
              return (
                <motion.button
                  key={skill.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSkill(skill.id)}
                  className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 ${isActive
                      ? 'border-slate-400 bg-slate-50 shadow-md'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                >
                  <div className="text-left">
                    <div className={`text-sm font-medium ${isActive ? 'text-slate-800' : 'text-slate-700'}`}>
                      {skill.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Chart Display */}
          <AnimatePresence mode="wait">
            {activeSkill && activeSkill !== 'overall' && (
              <motion.div
                key={activeSkill}
                variants={chartVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="border-t border-slate-200 pt-6"
              >
                {(() => {
                  const skill = skills.find(s => s.id === activeSkill);
                  if (!skill) return null;

                  const chartData = generateProgressData(skill);
                  const IconComponent = skill.icon;

                  return (
                    <>
                      {/* Skill Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <IconComponent className="h-5 w-5" style={{ color: skill.color }} />
                        <h3 className="text-lg font-semibold text-slate-800">
                          {skill.label} Progress
                        </h3>
                        <Badge
                          variant="secondary"
                          className="ml-auto"
                          style={{ backgroundColor: `${skill.color}15`, color: skill.color }}
                        >
                          {skill.baseline} → {skill.target} Band
                        </Badge>
                      </div>

                      {/* Chart */}
                      <div className="h-64 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                            <XAxis
                              dataKey="week"
                              stroke="#64748b"
                              fontSize={12}
                              tick={{ fontFamily: 'Inter, sans-serif' }}
                            />
                            <YAxis
                              stroke="#64748b"
                              fontSize={12}
                              domain={[0, 9]}
                              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                              tickFormatter={(value) => `${value}`}
                              tick={{ fontFamily: 'Inter, sans-serif' }}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-lg p-3 shadow-lg">
                                      <p className="font-medium text-slate-800">{data.label}</p>
                                      <p className="text-sm text-slate-600">{data.description}</p>
                                      <p className="text-lg font-bold mt-1" style={{ color: skill.color }}>
                                        {data.score} Band Score
                                      </p>
                                      {data.students > 0 && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          {data.students.toLocaleString()} students at this level
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="score"
                              stroke={skill.color}
                              strokeWidth={3}
                              fill="transparent"
                              dot={{ fill: skill.color, strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: skill.color, strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Progress Stats */}
                      <motion.div className="grid grid-cols-2 gap-4 text-center" variants={itemVariants}>
                        <motion.div className="p-3 bg-slate-50 rounded-lg hover:shadow-md transition-shadow" whileHover={{ scale: 1.02 }}>
                          <div className="text-lg font-bold text-slate-800">
                            <TypingNumber targetValue="4.6" duration={1500} />
                            <span> Months</span>
                          </div>
                          <div className="text-xs text-slate-600">Average Timeline</div>
                        </motion.div>
                        <motion.div className="p-3 bg-slate-50 rounded-lg hover:shadow-md transition-shadow" whileHover={{ scale: 1.02 }}>
                          <div className="text-lg font-bold text-slate-800">
                            <TypingNumber
                              targetValue={chartData[chartData.length - 1]?.students || 0}
                              duration={1500}
                              isCurrency={false}
                            />
                          </div>
                          <div className="text-xs text-slate-600">Students Reached Target</div>
                        </motion.div>
                      </motion.div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Default Overall Chart */}
          {activeSkill === 'overall' && (
            <motion.div
              key="overall"
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              className="border-t border-slate-200 pt-6"
            >
              {(() => {
                const skill = skills.find(s => s.id === 'overall');
                if (!skill) return null;

                const chartData = generateProgressData(skill);

                return (
                  <>
                    {/* Skill Header */}
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {skill.label}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="ml-auto"
                        style={{ backgroundColor: `${skill.color}15`, color: skill.color }}
                      >
                        Overall Average
                      </Badge>
                    </div>

                    {/* Chart */}
                    <div className="h-64 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                          <XAxis
                            dataKey="week"
                            stroke="#64748b"
                            fontSize={12}
                            tick={{ fontFamily: 'Inter, sans-serif' }}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            domain={[0, 9]}
                            ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                            tickFormatter={(value) => `${value}`}
                            tick={{ fontFamily: 'Inter, sans-serif' }}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-lg p-3 shadow-lg">
                                    <p className="font-medium text-slate-800">{data.label}</p>
                                    <p className="text-sm text-slate-600">{data.description}</p>
                                    <p className="text-lg font-bold mt-1" style={{ color: skill.color }}>
                                      {data.score} Band Score
                                    </p>
                                    {data.students > 0 && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {data.students.toLocaleString()} students at this level
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke={skill.color}
                            strokeWidth={3}
                            fill="transparent"
                            dot={{ fill: skill.color, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: skill.color, strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Progress Stats */}
                    <motion.div className="grid grid-cols-2 gap-4 text-center" variants={itemVariants}>
                      <motion.div className="p-3 bg-slate-50 rounded-lg hover:shadow-md transition-shadow" whileHover={{ scale: 1.02 }}>
                        <div className="text-lg font-bold text-slate-800">
                          <TypingNumber targetValue="4.6" duration={1500} />
                          <span> Months</span>
                        </div>
                        <div className="text-xs text-slate-600">Average Timeline</div>
                      </motion.div>
                      <motion.div className="p-3 bg-slate-50 rounded-lg hover:shadow-md transition-shadow" whileHover={{ scale: 1.02 }}>
                        <div className="text-lg font-bold text-slate-800">
                          <TypingNumber
                            targetValue={chartData[chartData.length - 1]?.students || 0}
                            duration={1500}
                            isCurrency={false}
                          />
                        </div>
                        <div className="text-xs text-slate-600">Students Reached Target</div>
                      </motion.div>
                    </motion.div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SkillsProgressChart;
