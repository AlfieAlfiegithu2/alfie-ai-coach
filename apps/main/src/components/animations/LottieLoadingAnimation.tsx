import { useEffect, useRef } from 'react';
import { useDotLottieLoader } from './useDotLottieLoader';

interface LottieLoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
  speed?: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-wc': {
        src: string;
        style?: React.CSSProperties;
        speed?: string;
        autoplay?: boolean;
        loop?: boolean;
      };
    }
  }
}

const LottieLoadingAnimation = ({ 
  size = 'md', 
  className = "",
  message = "Loading...",
  speed = 1
}: LottieLoadingAnimationProps) => {
  useDotLottieLoader();
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: { width: '120px', height: '120px' },
    md: { width: '200px', height: '200px' }, 
    lg: { width: '300px', height: '300px' }
  };

  useEffect(() => {
    // Ensure the web component is properly loaded
    const container = containerRef.current;
    if (container) {
      const dotlottie = container.querySelector('dotlottie-wc');
      if (dotlottie) {
        // Force re-render if needed
        dotlottie.setAttribute('speed', speed.toString());
      }
    }
  }, [speed]);

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`} ref={containerRef}>
      <dotlottie-wc
        src="https://lottie.host/f9eec83f-15c9-410c-937c-c3a0d2024d6a/EoOyrmY8jW.lottie"
        style={sizeStyles[size]}
        speed={speed.toString()}
        autoplay
        loop
      />
      <p className="text-text-secondary text-sm font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default LottieLoadingAnimation;