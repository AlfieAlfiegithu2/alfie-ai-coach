import React, { useEffect } from 'react';

// Declare the custom element type
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

interface DotLottieLoadingAnimationProps {
  message?: string;
  subMessage?: string;
  size?: number;
}

const DotLottieLoadingAnimation: React.FC<DotLottieLoadingAnimationProps> = ({ 
  message = "Processing...", 
  subMessage = "Please wait while we analyze your work",
  size = 300 
}) => {
  useEffect(() => {
    // Load the DotLottie Web Component script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.2/dist/dotlottie-wc.js';
    script.type = 'module';
    
    // Only add if not already loaded
    if (!document.querySelector('script[src*="dotlottie-wc"]')) {
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup is handled automatically by the browser
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="flex items-center justify-center">
        <dotlottie-wc
          src="https://lottie.host/f9eec83f-15c9-410c-937c-c3a0d2024d6a/EoOyrmY8jW.lottie"
          style={{ width: `${size}px`, height: `${size}px` }}
          speed="1"
          autoplay
          loop
        />
      </div>
      <div className="text-center space-y-2">
        <div className="text-lg font-medium text-text-primary">{message}</div>
        <div className="text-sm text-text-secondary">{subMessage}</div>
      </div>
    </div>
  );
};

export default DotLottieLoadingAnimation;