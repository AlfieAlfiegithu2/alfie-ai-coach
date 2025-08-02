import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full h-full ${className}`}>
      {children}
    </div>
  );
};

interface CardSwapProps {
  children: ReactNode[];
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  className?: string;
}

const CardSwap: React.FC<CardSwapProps> = ({
  children,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused && pauseOnHover) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % children.length);
    }, delay);

    return () => clearInterval(interval);
  }, [children.length, delay, isPaused, pauseOnHover]);

  const handleMouseEnter = () => {
    if (pauseOnHover) setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) setIsPaused(false);
  };

  return (
    <div 
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        {children.map((child, index) => {
          const isActive = index === currentIndex;
          const isNext = index === (currentIndex + 1) % children.length;
          const isPrev = index === (currentIndex - 1 + children.length) % children.length;

          let zIndex = 1;
          let opacity = 0;
          let scale = 0.8;
          let y = verticalDistance;
          let x = 0;

          if (isActive) {
            zIndex = 3;
            opacity = 1;
            scale = 1;
            y = 0;
            x = 0;
          } else if (isNext) {
            zIndex = 2;
            opacity = 0.7;
            scale = 0.9;
            y = verticalDistance / 2;
            x = cardDistance;
          } else if (isPrev) {
            zIndex = 2;
            opacity = 0.7;
            scale = 0.9;
            y = verticalDistance / 2;
            x = -cardDistance;
          }

          return (
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.8, y: verticalDistance }}
              animate={{
                opacity,
                scale,
                y,
                x,
                zIndex
              }}
              exit={{ opacity: 0, scale: 0.8, y: verticalDistance }}
              transition={{
                duration: 0.8,
                ease: "easeInOut"
              }}
              style={{ zIndex }}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default CardSwap;