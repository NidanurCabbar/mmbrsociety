import React, { useEffect, useState } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  color: 'gold' | 'silver' | 'bronze';
  animationDelay: number;
  animationType: 'sparkle' | 'twinkle' | 'float';
}

export default function AnimatedStars() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const starColors: ('gold' | 'silver' | 'bronze')[] = ['gold', 'silver', 'bronze'];
      const animationTypes: ('sparkle' | 'twinkle' | 'float')[] = ['sparkle', 'twinkle', 'float'];
      const newStars: Star[] = [];

      // Generate 80 stars
      for (let i = 0; i < 80; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100, // Percentage
          y: Math.random() * 100, // Percentage
          size: Math.random() * 3 + 1, // 1-4px
          color: starColors[Math.floor(Math.random() * starColors.length)],
          animationDelay: Math.random() * 3, // 0-3 seconds delay
          animationType: animationTypes[Math.floor(Math.random() * animationTypes.length)]
        });
      }

      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="stars-container">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star star-${star.color} star-${star.animationType}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.animationDelay}s`
          }}
        />
      ))}
    </div>
  );
}