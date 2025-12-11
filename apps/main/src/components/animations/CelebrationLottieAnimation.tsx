import { useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: { width: '150px', height: '150px' },
    md: { width: '300px', height: '300px' }, 
    lg: { width: '400px', height: '400px' }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const dotlottie = container.querySelector('dotlottie-wc');
      if (dotlottie) {
        dotlottie.setAttribute('speed', speed.toString());
      }
    }
  }, [speed]);

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