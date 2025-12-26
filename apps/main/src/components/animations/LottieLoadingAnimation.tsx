import { useRef } from 'react';

interface LottieLoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  speed?: number;
}

const LottieLoadingAnimation = ({
  size = 'md',
  className = "",
  speed = 1
}: LottieLoadingAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: { width: '120px', height: '120px' },
    md: { width: '200px', height: '200px' },
    lg: { width: '300px', height: '300px' }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} ref={containerRef}>
      <dotlottie-wc
        src="https://lottie.host/f9eec83f-15c9-410c-937c-c3a0d2024d6a/EoOyrmY8jW.lottie"
        style={sizeStyles[size]}
        speed={speed.toString()}
        autoplay
        loop
      />
    </div>
  );
};

export default LottieLoadingAnimation;