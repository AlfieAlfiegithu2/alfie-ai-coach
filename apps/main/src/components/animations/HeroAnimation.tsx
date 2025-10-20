import LottieAnimation from './LottieAnimation';

// Default hero animation data - floating elements
const defaultHeroData = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 90,
  "w": 400,
  "h": 300,
  "nm": "Hero",
  "ddd": 0,
  "assets": [],
  "layers": [{
    "ddd": 0,
    "ind": 1,
    "ty": 4,
    "nm": "Float",
    "sr": 1,
    "ks": {
      "o": {"a": 0, "k": 80},
      "r": {"a": 0, "k": 0},
      "p": {"a": 1, "k": [
        {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 0, "s": [200, 150, 0]},
        {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 45, "s": [200, 130, 0]},
        {"t": 90, "s": [200, 150, 0]}
      ]},
      "a": {"a": 0, "k": [0, 0, 0]},
      "s": {"a": 0, "k": [100, 100, 100]}
    },
    "ao": 0,
    "shapes": [{
      "ty": "gr",
      "it": [{
        "ty": "rc",
        "s": {"a": 0, "k": [60, 60]},
        "p": {"a": 0, "k": [0, 0]},
        "r": {"a": 0, "k": 10}
      }, {
        "ty": "fl",
        "c": {"a": 0, "k": [0.2, 0.6, 1, 0.3]},
        "o": {"a": 0, "k": 100}
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
    "op": 90,
    "st": 0
  }]
};

interface HeroAnimationProps {
  animationData?: any;
  className?: string;
}

const HeroAnimation = ({ 
  animationData = defaultHeroData, 
  className = "" 
}: HeroAnimationProps) => {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <LottieAnimation
        animationData={animationData}
        className="w-full h-full opacity-20"
        loop={true}
        autoplay={true}
        speed={0.5}
      />
    </div>
  );
};

export default HeroAnimation;