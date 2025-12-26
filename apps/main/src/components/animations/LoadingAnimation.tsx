import DotLottieLoadingAnimation from './DotLottieLoadingAnimation';

interface LoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingAnimation = ({
  size = 'md',
  className = "",
}: LoadingAnimationProps) => {
  const pixelSize = size === 'sm' ? 60 : size === 'md' ? 120 : 200;

  return (
    <div className={className}>
      <DotLottieLoadingAnimation size={pixelSize} />
    </div>
  );
};

export default LoadingAnimation;