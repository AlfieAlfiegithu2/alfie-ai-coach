import LottieAnimation from './LottieAnimation';

// Simple hover animation data
const hoverAnimationData = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 30,
  "w": 100,
  "h": 100,
  "nm": "Button Hover",
  "ddd": 0,
  "assets": [],
  "layers": [{
    "ddd": 0,
    "ind": 1,
    "ty": 4,
    "nm": "Glow",
    "sr": 1,
    "ks": {
      "o": {"a": 1, "k": [
        {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
        {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 15, "s": [100]},
        {"t": 30, "s": [0]}
      ]},
      "r": {"a": 0, "k": 0},
      "p": {"a": 0, "k": [50, 50, 0]},
      "a": {"a": 0, "k": [0, 0, 0]},
      "s": {"a": 1, "k": [
        {"i": {"x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833]}, "o": {"x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167]}, "t": 0, "s": [80, 80, 100]},
        {"i": {"x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833]}, "o": {"x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167]}, "t": 15, "s": [120, 120, 100]},
        {"t": 30, "s": [80, 80, 100]}
      ]}
    },
    "ao": 0,
    "shapes": [{
      "ty": "gr",
      "it": [{
        "d": 1,
        "ty": "el",
        "s": {"a": 0, "k": [30, 30]},
        "p": {"a": 0, "k": [0, 0]}
      }, {
        "ty": "fl",
        "c": {"a": 0, "k": [1, 1, 1, 0.3]},
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
    "op": 30,
    "st": 0
  }]
};

interface ButtonHoverAnimationProps {
  isHovered: boolean;
  className?: string;
}

const ButtonHoverAnimation = ({ isHovered, className = "" }: ButtonHoverAnimationProps) => {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <LottieAnimation
        animationData={hoverAnimationData}
        className="w-full h-full"
        loop={false}
        autoplay={isHovered}
      />
    </div>
  );
};

export default ButtonHoverAnimation;