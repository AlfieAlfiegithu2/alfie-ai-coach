import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

interface CountdownTimerProps {
  targetDate: string | null;
}

const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    totalDays: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        // Estimate total days (assuming a reasonable study period, e.g., 6 months = 180 days)
        // If days > 180, use days as total, otherwise use 180 as baseline
        const totalDays = Math.max(days, 180);
        const percentage = Math.min((days / totalDays) * 100, 100);

        setTimeLeft({ days, totalDays, percentage });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000 * 60 * 60); // Update hourly instead of every second

    return () => clearInterval(timer);
  }, [targetDate]);

  // Always render container to prevent layout shifts, but show empty state if no date
  if (!targetDate || !timeLeft) {
    return (
      <div className="bg-white/10 border-white/20 rounded-xl p-4 backdrop-blur-xl min-h-[100px] flex items-center justify-center">
        <span className="text-sm text-slate-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
          No deadline set
        </span>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (timeLeft.percentage / 100) * circumference;
  const getColor = () => {
    if (timeLeft.percentage > 50) return 'text-green-600';
    if (timeLeft.percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrokeColor = () => {
    if (timeLeft.percentage > 50) return 'stroke-green-600';
    if (timeLeft.percentage > 25) return 'stroke-yellow-600';
    return 'stroke-red-600';
  };

  return (
    <div className="bg-white/10 border-white/20 rounded-xl p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-slate-600" />
        <span className="text-sm lg:text-base font-normal text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {t('countdown.deadline', { defaultValue: 'Deadline' })}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Circular Progress Indicator */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="transform -rotate-90 w-20 h-20">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="rgba(148, 163, 184, 0.3)"
              strokeWidth="6"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-500 ${getStrokeColor()}`}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-lg font-semibold ${getColor()}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                {timeLeft.days}
              </div>
              <div className="text-[9px] text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Days
              </div>
            </div>
          </div>
        </div>

        {/* Date and Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {format(new Date(targetDate), 'MMM dd, yyyy')}
          </div>
          <div className="text-xs text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {timeLeft.days === 1 
              ? '1 day remaining'
              : `${timeLeft.days} days remaining`
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
