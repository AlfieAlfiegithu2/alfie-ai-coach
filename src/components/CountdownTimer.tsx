import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CountdownTimerProps {
  targetDate: string | null;
}

const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate || !timeLeft) {
    return null;
  }

  return (
    <div className="bg-white/10 border-white/20 rounded-xl p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
          {t('countdown.deadline', { defaultValue: 'Deadline' })}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {timeLeft.days}
          </div>
          <div className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('timeUnits.days', { defaultValue: 'Days' })}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {timeLeft.hours}
          </div>
          <div className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('timeUnits.hours', { defaultValue: 'Hours' })}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {timeLeft.minutes}
          </div>
          <div className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('timeUnits.minutes', { defaultValue: 'Minutes' })}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {timeLeft.seconds}
          </div>
          <div className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('timeUnits.seconds', { defaultValue: 'Seconds' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;