import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Circle, Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { formatLocalISO, getPlanDayForLocalDate, normalizeToLocalMidnight } from '@/lib/date';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface PlanTask {
  title: string;
  minutes: number;
}

interface PlanDay {
  day: number;
  tasks: PlanTask[];
}

interface PlanWeek {
  week: number;
  days: PlanDay[];
}

interface PlanData {
  durationWeeks: number;
  highlights: string[];
  quickWins: string[];
  weekly: PlanWeek[];
  meta?: {
    currentLevel: string;
    currentApproxIELTS: number;
    targetIELTS?: number | null;
    dailyMinutes?: number;
    estimatedMonths?: number;
    rationale?: string;
    targetDeadline?: string | null;
    startDateISO?: string;
  };
}

const StudyPlanTodoList = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const themeStyles = useThemeStyles();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customTask, setCustomTask] = useState({ title: '', minutes: 15 });
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeToLocalMidnight(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadPlan();
  }, [user]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      // Check local cache first
      let localCache: any = null;
      try {
        const cached = JSON.parse(localStorage.getItem('latest_plan') || 'null');
        if (cached?.plan && cached?.ts) {
          localCache = cached;
          if (cached.fresh) {
            setPlan(cached.plan as PlanData);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Error reading local cache:', e);
      }

      // Load from database - use separate queries for better reliability
      try {
        // First, get the profile with current_plan_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('current_plan_id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.warn('Error loading profile:', profileError);
        }
        
        // If profile has a current_plan_id, fetch the plan
        if (profile?.current_plan_id) {
          const { data: planRow, error: planError } = await supabase
            .from('study_plans')
            .select('plan, updated_at, created_at')
            .eq('id', profile.current_plan_id)
            .maybeSingle();
          
          if (planError) {
            console.warn('Error loading study plan:', planError);
            // If error loading plan, fall back to cache if available
            if (localCache?.plan) {
              setPlan(localCache.plan as PlanData);
            }
          } else if (planRow?.plan) {
            // Use updated_at if available, otherwise created_at, otherwise current time
            const dbTime = new Date(planRow.updated_at || planRow.created_at || Date.now()).getTime();
            const localTime = localCache?.ts || 0;
            const timeDiff = Math.abs(dbTime - localTime);
            
            if (!localCache || timeDiff > 30000) {
              setPlan(planRow.plan as PlanData);
              try {
                localStorage.setItem('latest_plan', JSON.stringify({ plan: planRow.plan, ts: Date.now() }));
              } catch (e) {
                console.warn('Error saving to localStorage:', e);
              }
            } else {
              setPlan(localCache.plan as PlanData);
            }
          } else if (localCache?.plan) {
            // No plan in DB, but we have cached plan - use it
            setPlan(localCache.plan as PlanData);
          }
        } else if (localCache?.plan) {
          // No current_plan_id, but we have cached plan - use it
          setPlan(localCache.plan as PlanData);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fallback to local cache if available
        if (localCache?.plan) {
          setPlan(localCache.plan as PlanData);
        }
      }
    } catch (error) {
      console.error('Error loading study plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to load study plan');
    } finally {
      setLoading(false);
    }
  };

  // Calculate day based on selected date - use user's local timezone
  const selectedDateLocal = useMemo(() => normalizeToLocalMidnight(selectedDate), [selectedDate]);
  const key = useMemo(() => formatLocalISO(selectedDateLocal), [selectedDateLocal]);
  const day = useMemo(() => {
    if (!plan) return null;
    try {
      return getPlanDayForLocalDate(plan, selectedDateLocal);
    } catch (error) {
      console.error('Error calculating day:', error);
      return null;
    }
  }, [plan, selectedDateLocal]);

  // Get today in user's local timezone - use a state that updates periodically
  const [currentDate, setCurrentDate] = useState(() => normalizeToLocalMidnight(new Date()));
  
  useEffect(() => {
    // Update current date every minute to catch day changes
    const interval = setInterval(() => {
      setCurrentDate(normalizeToLocalMidnight(new Date()));
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const today = currentDate;
  const yesterday = useMemo(() => {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return normalizeToLocalMidnight(y);
  }, [today]);
  const tomorrow = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return normalizeToLocalMidnight(t);
  }, [today]);
  
  const isToday = useMemo(() => {
    return selectedDateLocal.getTime() === today.getTime();
  }, [selectedDateLocal, today]);
  
  const isYesterday = useMemo(() => {
    return selectedDateLocal.getTime() === yesterday.getTime();
  }, [selectedDateLocal, yesterday]);
  
  const isTomorrow = useMemo(() => {
    return selectedDateLocal.getTime() === tomorrow.getTime();
  }, [selectedDateLocal, tomorrow]);

  // Format date in user's locale
  const formattedDate = useMemo(() => {
    return selectedDateLocal.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, [selectedDateLocal]);

  // Date navigation functions
  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(selectedDateLocal);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (direction === 'next') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setTime(today.getTime());
    }
    setSelectedDate(normalizeToLocalMidnight(newDate));
    setShowCalendar(false);
  };

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [customTasks, setCustomTasks] = useState<Array<{ title: string; minutes: number }>>([]);
  const [hiddenAi, setHiddenAi] = useState<Set<string>>(new Set());

  // Reload tasks when date changes
  useEffect(() => {
    const storageKey = formatLocalISO(selectedDateLocal);
    try {
      const savedChecked = JSON.parse(localStorage.getItem(`quicktodo-${storageKey}`) || '{}');
      setChecked(savedChecked);
    } catch {
      setChecked({});
    }
    try {
      const savedCustom = JSON.parse(localStorage.getItem(`quicktodo-custom-${storageKey}`) || '[]');
      setCustomTasks(savedCustom);
    } catch {
      setCustomTasks([]);
    }
    try {
      const savedHidden = JSON.parse(localStorage.getItem(`quicktodo-hidden-ai-${storageKey}`) || '[]');
      setHiddenAi(new Set(savedHidden));
    } catch {
      setHiddenAi(new Set());
    }
  }, [selectedDateLocal]);

  const getStorageKey = () => {
    return key || formatLocalISO(normalizeToLocalMidnight(new Date()));
  };

  const toggleTask = (index: number) => {
    const next = { ...checked, [index]: !checked[index] };
    setChecked(next);
    try {
      localStorage.setItem(`quicktodo-${getStorageKey()}`, JSON.stringify(next));
    } catch (e) {
      console.warn('Error saving task state:', e);
    }
  };

  const toggleCustomTask = (index: number) => {
    const customKey = `c${index}`;
    const next = { ...checked, [customKey]: !checked[customKey] };
    setChecked(next);
    try {
      localStorage.setItem(`quicktodo-${getStorageKey()}`, JSON.stringify(next));
    } catch (e) {
      console.warn('Error saving custom task state:', e);
    }
  };

  const addCustomTask = () => {
    if (!customTask.title.trim()) return;
    const next = [
      ...customTasks,
      {
        title: customTask.title.trim(),
        minutes: Math.max(5, Math.min(180, Number(customTask.minutes) || 15)),
      },
    ];
    setCustomTasks(next);
    setCustomTask({ title: '', minutes: 15 });
    try {
      localStorage.setItem(`quicktodo-custom-${getStorageKey()}`, JSON.stringify(next));
    } catch (e) {
      console.warn('Error saving custom tasks:', e);
    }
  };

  const removeCustomTask = (index: number) => {
    const next = customTasks.slice();
    next.splice(index, 1);
    setCustomTasks(next);
    try {
      localStorage.setItem(`quicktodo-custom-${getStorageKey()}`, JSON.stringify(next));
    } catch (e) {
      console.warn('Error removing custom task:', e);
    }
  };

  const hideAiTask = (index: number) => {
    const next = new Set(hiddenAi);
    next.add(String(index));
    setHiddenAi(next);
    try {
      localStorage.setItem(`quicktodo-hidden-ai-${getStorageKey()}`, JSON.stringify(Array.from(next)));
    } catch (e) {
      console.warn('Error hiding AI task:', e);
    }
  };

  // Calculate stats safely - keep track of original indices
  const dayTasks = useMemo(() => {
    if (!day?.tasks || !Array.isArray(day.tasks)) return [];
    return day.tasks.slice(0, 5)
      .map((task, originalIndex) => ({ task, originalIndex }))
      .filter(({ originalIndex }) => !hiddenAi.has(String(originalIndex)))
      .map(({ task, originalIndex }) => ({ ...task, originalIndex }));
  }, [day, hiddenAi]);


  // Get user stats for display
  const [userStats, setUserStats] = useState({
    totalTests: 0,
    savedWords: 0,
    dayStreak: 7,
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        // Fetch test count
        const { count: testCount } = await supabase
          .from('test_results')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Fetch vocabulary count
        const { count: vocabCount } = await supabase
          .from('user_vocabulary')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setUserStats({
          totalTests: testCount || 0,
          savedWords: vocabCount || 0,
          dayStreak: 7, // Placeholder - could be calculated from activity logs
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className={`${themeStyles.cardClassName} rounded-xl p-4`} style={themeStyles.cardStyle}>
        <p className="text-sm" style={{ color: themeStyles.textSecondary }}>{t('common.loading', { defaultValue: 'Loading...' })}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${themeStyles.cardClassName} rounded-xl p-4`} style={themeStyles.cardStyle}>
        <p className="text-sm" style={{ color: themeStyles.textSecondary }}>{error}</p>
      </div>
    );
  }

  // Always show the full UI, even when there's no plan

  return (
    <div className={`${themeStyles.cardClassName} rounded-xl p-4 lg:p-5 shadow-md flex flex-col`} style={themeStyles.cardStyle}>
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm lg:text-base font-normal" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: themeStyles.textPrimary }}>
            {formattedDate}
            {isToday && (
              <span className="ml-2 text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                Today
              </span>
            )}
            {isYesterday && (
              <span className="ml-2 text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                Yesterday
              </span>
            )}
            {isTomorrow && (
              <span className="ml-2 text-xs font-medium" style={{ color: themeStyles.textSecondary }}>
                Tomorrow
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateDate('prev')}
            className="p-1 rounded transition"
            style={{ 
              color: themeStyles.textSecondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Yesterday"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateDate('next')}
            className="p-1 rounded transition"
            style={{ 
              color: themeStyles.textSecondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Tomorrow"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="p-1 rounded transition ml-1"
            style={{ 
              color: themeStyles.textSecondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="mb-4 flex-shrink-0">
          <MiniCalendar
            plan={plan || null}
            selectedDate={selectedDateLocal}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
            }}
          />
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto mb-4 min-h-0" style={{ maxHeight: '400px' }}>
        <div className="space-y-2">
          {/* AI-generated tasks - only show if plan exists */}
          {plan && dayTasks.length > 0 && dayTasks.map((task, i) => {
            if (!task || !task.title) return null;
            const originalIndex = (task as any).originalIndex ?? i;
            const isCompleted = checked[originalIndex] === true;
            return (
              <div
                key={`ai-${originalIndex}`}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isCompleted ? 'line-through opacity-60' : 'hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: isCompleted 
                    ? (themeStyles.theme.name === 'note' ? 'rgba(245, 230, 211, 0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.1)')
                    : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.4)'),
                  borderColor: themeStyles.border,
                  boxShadow: isCompleted ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onClick={() => toggleTask(originalIndex)}
              >
                <button
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(originalIndex);
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" style={{ color: themeStyles.textSecondary }} />
                  ) : (
                    <Circle className="w-5 h-5" style={{ color: themeStyles.textAccent }} />
                  )}
                </button>
                <span className="flex-1 text-sm" style={{ 
                  fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  color: isCompleted ? themeStyles.textSecondary : themeStyles.textPrimary
                }}>
                  {task.title || 'Untitled task'}
                </span>
                <button
                  className="text-xs font-bold flex-shrink-0 z-10"
                  style={{ 
                    color: themeStyles.chartTarget,
                    opacity: isCompleted ? 0.8 : 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = isCompleted ? '0.8' : '1'}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    hideAiTask(originalIndex);
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Custom tasks */}
          {customTasks.length > 0 && customTasks.map((task, i) => {
            if (!task || !task.title) return null;
            const customKey = `c${i}`;
            const isCompleted = checked[customKey] === true;
            return (
              <div
                key={`custom-${i}`}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isCompleted ? 'line-through opacity-60' : 'hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: isCompleted 
                    ? (themeStyles.theme.name === 'note' ? 'rgba(245, 230, 211, 0.5)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.1)')
                    : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.4)'),
                  borderColor: themeStyles.border,
                  boxShadow: isCompleted ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onClick={() => toggleCustomTask(i)}
              >
                <button
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCustomTask(i);
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" style={{ color: themeStyles.textSecondary }} />
                  ) : (
                    <Circle className="w-5 h-5" style={{ color: themeStyles.textAccent }} />
                  )}
                </button>
                <span className="flex-1 text-sm" style={{ 
                  fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  color: isCompleted ? themeStyles.textSecondary : themeStyles.textPrimary
                }}>
                  {task.title || 'Untitled task'}
                </span>
                <button
                  className="text-xs font-bold flex-shrink-0 z-10"
                  style={{ 
                    color: themeStyles.chartTarget,
                    opacity: isCompleted ? 0.8 : 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = isCompleted ? '0.8' : '1'}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeCustomTask(i);
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Add Task Input - always visible at bottom */}
          <div className="flex gap-2 mt-2 pt-2 border-t flex-shrink-0" style={{ borderColor: themeStyles.border }}>
            <input
              type="text"
              value={customTask.title}
              onChange={(e) => setCustomTask({ ...customTask, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomTask();
                }
              }}
              placeholder={t('studyPlan.addTask', { defaultValue: 'Add a task...' })}
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ 
                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                borderColor: themeStyles.border,
                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                color: themeStyles.textPrimary,
                '--tw-ring-color': themeStyles.textSecondary
              } as React.CSSProperties}
            />
            <button
              onClick={addCustomTask}
              className="rounded-lg px-3 py-2 transition flex items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ 
                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                backgroundColor: themeStyles.buttonPrimary,
                color: 'white',
                minWidth: '44px',
                minHeight: '38px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimaryHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimary}
              onFocus={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.boxShadow = `0 0 0 2px ${themeStyles.buttonPrimary}40`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mini Calendar Component
const MiniCalendar = ({ 
  plan, 
  selectedDate, 
  onSelectDate 
}: { 
  plan: PlanData | null; 
  selectedDate: Date; 
  onSelectDate: (date: Date) => void;
}) => {
  const themeStyles = useThemeStyles();
  const now = new Date();
  // Initialize offset to show the month of selectedDate
  const [offset, setOffset] = useState(() => {
    const selected = normalizeToLocalMidnight(selectedDate);
    const monthDiff = (selected.getFullYear() - now.getFullYear()) * 12 + (selected.getMonth() - now.getMonth());
    return monthDiff;
  });
  
  // Update offset when selectedDate changes
  useEffect(() => {
    const selected = normalizeToLocalMidnight(selectedDate);
    const monthDiff = (selected.getFullYear() - now.getFullYear()) * 12 + (selected.getMonth() - now.getMonth());
    setOffset(monthDiff);
  }, [selectedDate]);
  
  const startISO = plan?.meta?.startDateISO || new Date().toISOString();
  const startDate = new Date(startISO);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const label = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const leading = first.getDay();
  const headers = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const blanks = Array.from({ length: leading }).map((_, i) => i);
  
  const days: Array<{ date: Date; hasTasks: boolean; allCompleted: boolean }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(first.getFullYear(), first.getMonth(), d);
    let hasTasks = false;
    let allCompleted = false;
    
    try {
      if (plan) {
        const dayObj = getPlanDayForLocalDate(plan, date);
        const tasks = dayObj?.tasks;
        if (Array.isArray(tasks) && tasks.length > 0) {
          const key = formatLocalISO(normalizeToLocalMidnight(date));
          const hidden = new Set(JSON.parse(localStorage.getItem(`quicktodo-hidden-ai-${key}`) || '[]'));
          const visibleTasks = tasks.filter((_, idx) => !hidden.has(String(idx)));
          hasTasks = visibleTasks.length > 0;
          
          if (hasTasks) {
            const checked = JSON.parse(localStorage.getItem(`quicktodo-${key}`) || '{}');
            const customTasks = JSON.parse(localStorage.getItem(`quicktodo-custom-${key}`) || '[]');
            const allAiTasksCompleted = visibleTasks.every((_, idx) => checked[idx] === true);
            const allCustomTasksCompleted = customTasks.every((_, idx) => checked[`c${idx}`] === true);
            allCompleted = allAiTasksCompleted && allCustomTasksCompleted;
          }
        }
      } else {
        // Check for custom tasks even without a plan
        const key = formatLocalISO(normalizeToLocalMidnight(date));
        const customTasks = JSON.parse(localStorage.getItem(`quicktodo-custom-${key}`) || '[]');
        if (customTasks.length > 0) {
          hasTasks = true;
          const checked = JSON.parse(localStorage.getItem(`quicktodo-${key}`) || '{}');
          allCompleted = customTasks.every((_, idx) => checked[`c${idx}`] === true);
        }
      }
    } catch {
      hasTasks = false;
      allCompleted = false;
    }
    days.push({ date, hasTasks, allCompleted });
  }

  const isSelected = (date: Date) => {
    return selectedDate.getTime() === normalizeToLocalMidnight(date).getTime();
  };
  const isTodayDate = (date: Date) => {
    return now.getFullYear() === date.getFullYear() && 
           now.getMonth() === date.getMonth() && 
           now.getDate() === date.getDate();
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${themeStyles.cardClassName}`} style={themeStyles.cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-medium" style={{ color: themeStyles.textPrimary }}>{label}</div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous"
            className="rounded-md border px-3 py-1.5 text-sm transition"
            style={{
              borderColor: themeStyles.border,
              color: themeStyles.textSecondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={() => setOffset(o => o - 1)}
          >
            ←
          </button>
          <button
            aria-label="Next"
            className="rounded-md border px-3 py-1.5 text-sm transition"
            style={{
              borderColor: themeStyles.border,
              color: themeStyles.textSecondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={() => setOffset(o => o + 1)}
          >
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm mb-3 font-medium" style={{ color: themeStyles.textSecondary }}>
        {headers.map(h => (
          <div key={h} className="text-center">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(b => (
          <div key={`b${b}`} className="h-10" />
        ))}
        {days.map((d, di) => {
          const normalizedDate = normalizeToLocalMidnight(d.date);
          const selected = isSelected(d.date);
          const isToday = isTodayDate(d.date);
          
          return (
            <button
              key={di}
              onClick={() => onSelectDate(normalizedDate)}
              className="relative h-10 rounded-lg border text-sm transition"
              style={{
                backgroundColor: selected
                  ? themeStyles.buttonPrimary
                  : isToday && !selected
                  ? (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)')
                  : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.3)'),
                borderColor: selected 
                  ? themeStyles.buttonPrimary 
                  : d.allCompleted 
                  ? '#D4AF37' 
                  : themeStyles.border,
                borderWidth: d.allCompleted ? '2px' : '1px',
                color: selected ? 'white' : (d.hasTasks ? themeStyles.textPrimary : themeStyles.textSecondary)
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = isToday && !selected
                    ? (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.6)')
                    : (themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.3)');
                }
              }}
            >
              <span className="relative z-10">{d.date.getDate()}</span>
              {d.allCompleted && (
                <div className="absolute top-0.5 right-0.5 text-[10px] z-10">⭐</div>
              )}
              {!d.allCompleted && d.hasTasks && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StudyPlanTodoList;

