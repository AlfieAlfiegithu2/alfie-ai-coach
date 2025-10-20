import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
}

export const TypewriterText = ({ text, speed = 50 }: TypewriterTextProps) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span>
      {displayText.split(' ').map((word, index) => (
        <span key={index}>
          {word}
          {index < displayText.split(' ').length - 1 && ' '}
        </span>
      ))}
      <span className="animate-pulse">|</span>
    </span>
  );
};