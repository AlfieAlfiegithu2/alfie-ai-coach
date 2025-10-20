import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import './ElasticSlider.css';

const MAX_OVERFLOW = 50;

interface VolumeSliderProps {
  defaultValue?: number;
  onVolumeChange?: (volume: number) => void;
  className?: string;
  showValueIndicator?: boolean;
}

export default function VolumeSlider({
  defaultValue = 50,
  onVolumeChange,
  className = "",
  showValueIndicator = true,
}: VolumeSliderProps) {
  const handleVolumeChange = (volume: number) => {
    // Set global audio volume for all <audio> elements in DOM
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      (audio as HTMLAudioElement).volume = volume / 100;
    });

    // Persist and broadcast volume to reach programmatic audio elements
    try {
      window.localStorage.setItem('appAudioVolume', String(volume));
      window.dispatchEvent(new CustomEvent('app:volume-change', { detail: { volume: volume / 100 } }));
    } catch {
      // no-op
    }

    onVolumeChange?.(volume);
  };

  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`slider-container ${className}`} style={{ width: expanded ? undefined : 'auto' }}>
      <Slider
        defaultValue={defaultValue}
        startingValue={0}
        maxValue={100}
        onVolumeChange={handleVolumeChange}
        rightIcon={<Volume2 size={20} />}
        showValueIndicator={showValueIndicator && expanded}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
      />
    </div>
  );
}

interface SliderProps {
  defaultValue: number;
  startingValue: number;
  maxValue: number;
  onVolumeChange?: (volume: number) => void;
  rightIcon: React.ReactNode;
  showValueIndicator?: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}

function Slider({
  defaultValue,
  startingValue,
  maxValue,
  onVolumeChange,
  rightIcon,
  showValueIndicator = true,
  expanded,
  onToggleExpanded,
}: SliderProps) {
  const [value, setValue] = useState(defaultValue);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState("middle");
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    onVolumeChange?.(value);
  }, [value, onVolumeChange]);

  useMotionValueEvent(clientX, "change", (latest) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect();
      let newValue;

      if (latest < left) {
        setRegion("left");
        newValue = left - latest;
      } else if (latest > right) {
        setRegion("right");
        newValue = latest - right;
      } else {
        setRegion("middle");
        newValue = 0;
      }

      overflow.jump(decay(newValue, MAX_OVERFLOW));
    }
  });

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect();
      let newValue = startingValue + ((e.clientX - left) / width) * (maxValue - startingValue);

      newValue = Math.min(Math.max(newValue, startingValue), maxValue);
      setValue(newValue);
      clientX.jump(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { type: "spring", bounce: 0.5 });
  };

  const getRangePercentage = () => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;

    return ((value - startingValue) / totalRange) * 100;
  };

  return (
    <>
      <motion.div className="slider-wrapper">
        <div
          ref={sliderRef}
          className="slider-root"
          onPointerMove={expanded ? handlePointerMove : undefined}
          onPointerDown={expanded ? handlePointerDown : undefined}
          onPointerUp={expanded ? handlePointerUp : undefined}
        >
          {expanded && (
            <div className="slider-track-wrapper">
              <div className="slider-track">
                <div
                  className="slider-range"
                  style={{ width: `${getRangePercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div onClick={onToggleExpanded} className="cursor-pointer">
          {rightIcon}
        </div>
      </motion.div>
      {showValueIndicator && <p className="value-indicator">{Math.round(value)}</p>}
    </>
  );
}

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }

  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);

  return sigmoid * max;
}