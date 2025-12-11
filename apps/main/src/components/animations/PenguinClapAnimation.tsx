import { useEffect, useRef } from 'react';

interface PenguinClapAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  speed?: number;
  // Optional: allow overriding the animation source if you have a different penguin asset
  src?: string;
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

const PenguinClapAnimation = ({
  size = 'md',
  className = '',
  speed = 1,
  src,
}: PenguinClapAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: { width: '140px', height: '140px' },
    md: { width: '240px', height: '240px' },
    lg: { width: '360px', height: '360px' },
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

  // NOTE: Placeholder celebratory animation. Replace `defaultSrc` with the original penguin-clapping asset URL if available.
  const defaultSrc =
    src || 'https://lottie.host/0fe81d4c-ce6d-47ce-9f32-cbf478902f97/IONCXdpNpV.lottie';

  return (
    <div className={`flex items-center justify-center ${className}`} ref={containerRef}>
      <dotlottie-wc src={defaultSrc} style={sizeStyles[size]} speed={speed.toString()} autoplay loop />
    </div>
  );
};

export default PenguinClapAnimation;
