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
  // Standardized sizes - md (96px) is the default for consistency
  const sizeClasses = {
    sm: "w-16 h-16",   // 64px
    md: "w-24 h-24",   // 96px - standard size across all pages
    lg: "w-24 h-24"    // 96px - same as md for consistency
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
      <p className="text-sm font-medium animate-pulse" style={{ color: '#8B6914', fontFamily: 'Georgia, serif' }}>
        {message}
      </p>
    </div>
  );
};

export default CatLoadingAnimation;