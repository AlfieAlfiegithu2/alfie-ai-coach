import CatLoadingAnimation from './CatLoadingAnimation';

interface LoadingAnimationProps {
  // Keeping props compatible with previous usage
  animationData?: any;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

const LoadingAnimation = ({
  size = 'md',
  className = "",
  message // New prop passed through if available
}: LoadingAnimationProps) => {

  return (
    <CatLoadingAnimation
      size={size}
      className={className}
      message={message}
    />
  );
};

export default LoadingAnimation;