import LottieAnimation from './LottieAnimation';

// Default loading animation data - a simple spinning circle
const defaultLoadingData = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 100,
  "h": 100,
  "nm": "Loading",
  "ddd": 0,
  "assets": [],
  "layers": [{
    "ddd": 0,
    "ind": 1,
    "ty": 4,
    "nm": "Circle",
    "sr": 1,
    "ks": {
      "o": {"a": 0, "k": 100},
      "r": {"a": 1, "k": [{"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]}, {"t": 60, "s": [360]}]},
      "p": {"a": 0, "k": [50, 50, 0]},
      "a": {"a": 0, "k": [0, 0, 0]},
      "s": {"a": 0, "k": [100, 100, 100]}
    },
    "ao": 0,
    "shapes": [{
      "ty": "gr",
      "it": [{
        "d": 1,
        "ty": "el",
        "s": {"a": 0, "k": [40, 40]},
        "p": {"a": 0, "k": [0, 0]}
      }, {
        "ty": "st",
        "c": {"a": 0, "k": [0.2, 0.6, 1, 1]},
        "o": {"a": 0, "k": 100},
        "w": {"a": 0, "k": 3}
      }, {
        "ty": "tr",
        "p": {"a": 0, "k": [0, 0]},
        "a": {"a": 0, "k": [0, 0]},
        "s": {"a": 0, "k": [100, 100]},
        "r": {"a": 0, "k": 0},
        "o": {"a": 0, "k": 100}
      }]
    }],
    "ip": 0,
    "op": 60,
    "st": 0
  }]
};

interface LoadingAnimationProps {
  animationData?: any;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingAnimation = ({ 
  animationData = defaultLoadingData, 
  size = 'md', 
  className = "" 
}: LoadingAnimationProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <LottieAnimation
        animationData={animationData}
        className="w-full h-full"
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default LoadingAnimation;