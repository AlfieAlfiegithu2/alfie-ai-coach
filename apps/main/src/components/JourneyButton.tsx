import React from 'react';
import { cn } from '@/lib/utils';

interface JourneyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * JourneyButton - The default CTA button style used throughout the website
 * Based on the "Start Your Journey" button from the hero page
 */
export const JourneyButton: React.FC<JourneyButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center gap-2 font-semibold transition font-nunito',
    'bg-white/60 backdrop-blur-md border border-white/20 text-black',
    'hover:bg-white/80 shadow-lg hover:shadow-xl',
    'transform hover:scale-105',
    'focus:outline-none focus:ring-2 focus:ring-black/20',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
  ];

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-sm rounded-xl',
    lg: 'px-8 py-4 text-base rounded-xl',
  };

  const variantClasses = {
    primary: 'font-semibold',
    secondary: 'font-medium',
  };

  const allClasses = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  return (
    <button className={allClasses} {...props}>
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default JourneyButton;
