interface VideoBackgroundProps {
  videoSrc: string;
  fallbackImage?: string;
  overlay?: boolean;
  overlayOpacity?: number;
  className?: string;
}

const VideoBackground = ({ 
  videoSrc, 
  fallbackImage = "/lovable-uploads/hero-image.jpg",
  overlay = true,
  overlayOpacity = 50,
  className = ""
}: VideoBackgroundProps) => {
  return (
    <div className={`fixed inset-0 w-full h-full ${className}`}>
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onError={(e) => {
          // Fallback to image if video fails
          const target = e.currentTarget;
          target.style.display = 'none';
          if (fallbackImage) {
            const img = document.createElement('img');
            img.src = fallbackImage;
            img.className = 'absolute inset-0 w-full h-full object-cover';
            target.parentElement?.appendChild(img);
          }
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        {/* Fallback for browsers that don't support video */}
        {fallbackImage && (
          <img 
            src={fallbackImage} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </video>
      
      {overlay && (
        <div 
          className={`absolute inset-0 bg-background/${overlayOpacity} backdrop-blur-[1px]`}
        />
      )}
    </div>
  );
};

export default VideoBackground;