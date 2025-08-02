interface CatLoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

const CatLoadingAnimation = ({ 
  size = 'md', 
  className = "",
  message = "Loading..."
}: CatLoadingAnimationProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin`}>
        <img 
          src="/lovable-uploads/c1ab595f-8894-4f83-8bed-f87c5e7bb066.png"
          alt="Loading cat"
          className="w-full h-full object-contain"
        />
      </div>
      <p className="text-text-secondary text-sm font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default CatLoadingAnimation;