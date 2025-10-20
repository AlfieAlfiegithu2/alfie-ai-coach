interface VideoLoadingAnimationProps {
  videoSrc: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallbackSrc?: string;
}

const VideoLoadingAnimation = ({ 
  videoSrc, 
  size = 'md', 
  className = "",
  fallbackSrc
}: VideoLoadingAnimationProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  };

  return (
    <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden`}>
      <video
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          if (fallbackSrc) {
            e.currentTarget.src = fallbackSrc;
          }
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        {/* Fallback for browsers that don't support video */}
        <div className="w-full h-full bg-primary/20 animate-pulse rounded-full" />
      </video>
    </div>
  );
};

export default VideoLoadingAnimation;