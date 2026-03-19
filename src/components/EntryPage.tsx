import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface EntryPageProps {
  onEnter: () => void;
}

export default function EntryPage({ onEnter }: EntryPageProps) {
  const [isDoorOpening, setIsDoorOpening] = useState(false);
  const { t } = useLanguage();

  const handleDoorClick = () => {
    setIsDoorOpening(true);
    setTimeout(() => {
      onEnter();
    }, 3000);
  };

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* YouTube Video */}
      <div 
        className={`relative cursor-pointer w-full h-full ${isDoorOpening ? 'door-animation' : ''}`}
        onClick={handleDoorClick}
      >
        <iframe
          src="https://www.youtube.com/embed/aScq4fGnS4s?autoplay=1&mute=1&loop=1&playlist=aScq4fGnS4s&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1"
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Click overlay */}
        <div className="absolute inset-0 z-10" />
      </div>
    </div>
  );
}