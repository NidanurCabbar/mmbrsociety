import React, { useState, useEffect, useRef } from 'react';
import fingerprintImage from 'figma:asset/95e6c5b4973e509936b150ccfbaf13e204a809d2.png';

interface FingerprintCursorProps {
  isVisible: boolean;
  onHide: () => void;
  membershipType: 'bronze' | 'silver' | 'gold';
  initialPosition: { x: number; y: number };
}

export default function FingerprintCursor({ isVisible, onHide, membershipType, initialPosition }: FingerprintCursorProps) {
  const [position, setPosition] = useState(initialPosition);

  // Renk filtrelerini üyelik tipine göre belirle
  const getColorFilter = () => {
    switch (membershipType) {
      case 'bronze':
        // Gümüş rengi: #C0C0C0
        return 'drop-shadow(0 0 12px rgba(192, 192, 192, 0.9)) drop-shadow(0 0 24px rgba(192, 192, 192, 0.6)) brightness(1.3) saturate(0.8)';
      case 'silver':
        // Altın rengi: #FFD700
        return 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.9)) drop-shadow(0 0 24px rgba(255, 215, 0, 0.6)) brightness(1.4) saturate(1.5) hue-rotate(-15deg)';
      case 'gold':
        // Elmas rengi: #0EBFE9
        return 'drop-shadow(0 0 16px rgba(14, 191, 233, 1)) drop-shadow(0 0 32px rgba(14, 191, 233, 0.8)) brightness(1.5) saturate(1.6)';
      default:
        return 'drop-shadow(0 0 12px rgba(192, 192, 192, 0.9)) drop-shadow(0 0 24px rgba(192, 192, 192, 0.6)) brightness(1.3)';
    }
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    // Sürekli pozisyonu güncelle
    document.addEventListener('mousemove', updatePosition);
    
    // 2 saniye sonra gizle
    const timer = setTimeout(() => {
      onHide();
    }, 2000);

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      clearTimeout(timer);
    };
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(8px, 8px)',
      }}
    >
      <img 
        src={fingerprintImage} 
        alt="Fingerprint cursor" 
        className={`w-12 h-12 fingerprint-cursor-animation fingerprint-cursor-${membershipType}`}
        style={{
          filter: getColorFilter(),
        }}
      />
    </div>
  );
}