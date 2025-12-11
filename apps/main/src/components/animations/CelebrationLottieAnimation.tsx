import { useEffect, useRef } from 'react';
import { useDotLottieLoader } from './useDotLottieLoader';

interface CelebrationLottieAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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

const CelebrationLottieAnimation = ({
  size = 'md',
  className = "",
  speed = 1
}: CelebrationLottieAnimationProps) => {
  const isReady = useDotLottieLoader();
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: { width: '150px', height: '150px' },
    md: { width: '300px', height: '300px' },
    lg: { width: '400px', height: '400px' }
  };

  useEffect(() => {
    if (isReady) {
      const container = containerRef.current;
      if (container) {
        const dotlottie = container.querySelector('dotlottie-wc');
        if (dotlottie) {
          dotlottie.setAttribute('speed', speed.toString());
        }
      }
    }
  }, [speed, isReady]);

  if (!isReady) {
    // Show a placeholder while the dotlottie script loads
    return (
      <div className={`flex items-center justify-center ${className}`} ref={containerRef}>
        <div
          className="animate-pulse bg-gray-200 rounded"
          style={sizeStyles[size]}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} ref={containerRef}>
      <dotlottie-wc
        src="https://lottie.host/0fe81d4c-ce6d-47ce-9f32-cbf478902f97/IONCXdpNpV.lottie"
        style={sizeStyles[size]}
        speed={speed.toString()}
        autoplay
        loop
      />
    </div>
  );
};

export default CelebrationLottieAnimation;