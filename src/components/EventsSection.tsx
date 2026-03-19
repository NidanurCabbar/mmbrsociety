import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, MapPin, Clock, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { apiService } from '../utils/api';
import { cleanEventImageUrls, shouldBlockUrl, getSafeImageUrl, getEventPlaceholder } from '../utils/urlBlocking';
import { eventUpdateManager } from '../utils/eventUpdater';
import { useLanguage } from '../contexts/LanguageContext';
import Navbar from './Navbar';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  image: string;
  description: string;
  price: string;
  detailedDescription?: string;
  artist?: string;
  genre?: string;
  duration?: string;
}

export default function EventsSection() {
  const [selectedDate, setSelectedDate] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const handleEventUpdate = useCallback(async () => {
    console.log('🔄 EventsSection: Received update notification, reloading events...');
    
    // Store current selected event ID if modal is open
    const currentSelectedEventId = selectedEvent?.id;
    
    await loadEvents();
    
    // Modal content will be updated by the useEffect that watches events changes
    if (currentSelectedEventId && showEventModal) {
      console.log('📝 EventsSection: Modal will be updated by events watcher for event:', currentSelectedEventId);
    }
  }, [selectedEvent, showEventModal]);

  useEffect(() => {
    loadEvents();
    
    // Register for event updates
    eventUpdateManager.addListener(handleEventUpdate);
    
    // Cleanup listener on unmount
    return () => {
      eventUpdateManager.removeListener(handleEventUpdate);
    };
  }, [handleEventUpdate]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showEventModal) {
        closeModal();
      }
    };

    if (showEventModal) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [showEventModal]);

  // Auto-update modal content when events data changes and modal is open
  useEffect(() => {
    if (showEventModal && selectedEvent && events.length > 0) {
      console.log('🔄 EventsSection: Events data updated, refreshing modal content...');
      const updatedEvent = events.find(event => event.id === selectedEvent.id);
      if (updatedEvent && JSON.stringify(updatedEvent) !== JSON.stringify(selectedEvent)) {
        console.log('✅ EventsSection: Found updated event data, refreshing modal:', updatedEvent.title);
        setSelectedEvent(updatedEvent);
      }
    }
  }, [events, selectedEvent, showEventModal]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Use base64 placeholders for default events instead of external URLs
  const getDefaultEvents = (): Event[] => [
    {
      id: 1,
      title: "MAHMUT ORHAN",
      date: "2026-02-07",
      time: "23:00",
      location: "MMBR Ana Salon",
      capacity: 500,
      image: getEventPlaceholder("Mahmut Orhan DJ Performance", "dj"),
      description: "7 Şubat 2026",
      price: "₺450",
      detailedDescription: "Dünyaca ünlü DJ Mahmut Orhan ile unutulmaz bir gece yaşayın. Deep house ve elektronik müziğin en iyi örnekleriyle dolu bu gecede, MMBR'nin eşsiz atmosferinde dans etmeye hazır olun.",
      artist: "Mahmut Orhan",
      genre: "Deep House / Electronic",
      duration: "5 Saat"
    },
    {
      id: 2,
      title: "VALENTINE'S DEEP HOUSE",
      date: "2026-02-14",
      time: "22:30",
      location: "MMBR Underground",
      capacity: 300,
      image: getEventPlaceholder("Valentine's Deep House Night", "house"),
      description: "14 Şubat 2026 - Sevgililer Günü",
      price: "₺500",
      detailedDescription: "Sevgililer Günü'nde aşkın ritmiyle dans edin! Deep house müziğin romantik melodileriyle bezeli özel bir gece. Underground salonumuzda, en özel anlarınızı yaşayın ve aşkınızı kutlayın.",
      artist: "Various Artists",
      genre: "Deep House / Romantic",
      duration: "6 Saat"
    },
    {
      id: 3,
      title: "TECHNO REVOLUTION",
      date: "2026-02-21",
      time: "23:30",
      location: "MMBR Main Floor",
      capacity: 400,
      image: getEventPlaceholder("Techno Revolution", "techno"),
      description: "21 Şubat 2026",
      price: "₺400",
      detailedDescription: "Techno müziğin devrimci sesleriyle dolu bir gece. Güçlü beat'ler ve hipnotik melodilerle dolu bu gecede, teknolojinin ve müziğin birleşimini yaşayın.",
      artist: "International Techno Artists",
      genre: "Techno",
      duration: "7 Saat"
    }
  ];

  const loadEvents = async (): Promise<void> => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`🎵 EventsSection: Loading events at ${timestamp}...`);
      
      // First, get default events (now using base64 placeholders)
      const defaultEvents = getDefaultEvents();
      
      try {
        // Load events from API (apiService now has global blocking built-in)
        const response = await apiService.getEvents();
        
        if (response.error) {
          // Server is offline or unavailable - use default events only
          if (response.offline) {
            console.warn('⚠️ Server offline - using default events only');
          } else {
            console.warn('⚠️ Server error - using default events:', response.error);
          }
          setEvents(defaultEvents);
        } else if (!response.events || response.events.length === 0) {
          console.log('📋 No events in database, using default events only');
          setEvents(defaultEvents);
        } else {
          console.log('✅ Events loaded from API');
          
          // Process database events with comprehensive URL cleaning
          let databaseEvents: Event[] = [];
          if (response.events && response.events.length > 0) {
            databaseEvents = response.events.map((event: any) => {
              let safeImage = event.image;
              
              // Apply global URL blocking and replace with base64 placeholders
              if (!safeImage || shouldBlockUrl(safeImage)) {
                console.log('🛡️ REPLACING with base64 placeholder:', event.title);
                safeImage = getEventPlaceholder(event.title, event.genre || '');
              }
              
              return {
                id: typeof event.id === 'string' ? event.id : event.id,
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location,
                capacity: parseInt(event.capacity) || 100,
                image: safeImage,
                description: event.description || event.shortDescription || new Date(event.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }),
                price: event.price,
                detailedDescription: event.detailedDescription || event.description || 'Etkinlik detayları yakında paylaşılacak.',
                artist: event.artist || 'Various Artists',
                genre: event.genre || 'Electronic',
                duration: event.duration || '4 Saat'
              };
            });
            
            console.log('📋 Database events processed with base64 fallbacks:', databaseEvents.map(e => ({
              title: e.title,
              hasImage: !!e.image,
              isBase64: e.image?.startsWith('data:image/') || false,
              isExternalUrl: !e.image?.startsWith('data:image/') || false
            })));
          }
          
          // Combine default events with database events
          const combinedEvents = [...defaultEvents, ...databaseEvents];
          setEvents(combinedEvents);
          
          // Final verification that all images are base64 or Supabase Storage URLs
          const externalUrls = combinedEvents.filter(e => {
            if (!e.image) return false;
            // Allow base64 images
            if (e.image.startsWith('data:image/')) return false;
            // Allow Supabase Storage URLs (both direct and signed URLs)
            if (e.image.includes('supabase.co') && e.image.includes('/storage/v1/')) return false;
            // Everything else is considered external
            return true;
          });
          
          if (externalUrls.length === 0) {
            console.log('🎉 SUCCESS: All events use safe images (base64 or Supabase Storage)');
          } else {
            console.warn('⚠️ WARNING: Some external URLs still present:', externalUrls.length);
            externalUrls.forEach(event => {
              console.warn('🔍 External URL:', event.title, '-', event.image); // Show full URL for debugging
            });
          }
          
          console.log(`📊 Total events: ${combinedEvents.length} (${defaultEvents.length} default + ${databaseEvents.length} from database)`);
        }
      } catch (apiError) {
        console.error('💥 API call failed:', apiError);
        // Fallback to default events if API fails
        setEvents(defaultEvents);
      }
    } catch (error) {
      console.error('💥 Failed to load events:', error);
      // Ultimate fallback
      setEvents(getDefaultEvents());
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = selectedDate 
    ? events.filter(event => event.date === selectedDate)
    : events;

  const displayedEvents = filteredEvents;
  
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const closeModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const handleReservationClick = () => {
    if (selectedEvent) {
      // Etkinlik bilgisini state olarak rezervasyon sayfasına taşı
      navigate('/reservation', { 
        state: { 
          fromEvent: true,
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          eventDate: selectedEvent.date,
          eventTime: selectedEvent.time,
          eventLocation: selectedEvent.location
        } 
      });
    } else {
      navigate('/reservation');
    }
    closeModal();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
      {/* Lightning Background */}
      <div className="absolute inset-0 lightning-background z-0">
        {/* Fog Layers */}
        <div className="fog-layer"></div>
        <div className="fog-layer-2"></div>
        <div className="fog-layer-3"></div>
        <div className="fog-glow"></div>
        
        {/* Floating Mist Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={`mist-particle ${i % 3 === 0 ? 'mist-particle-red' : i % 3 === 1 ? 'mist-particle-dark' : ''}`}
              style={{
                left: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 15}s`
              }}
            />
          ))}
        </div>

        {/* Fog Wisps */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={`wisp-${i}`}
              className={`fog-wisp ${i % 2 === 0 ? 'fog-wisp-red' : ''}`}
              style={{
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 10}s`,
                animationDuration: `${35 + Math.random() * 15}s`
              }}
            />
          ))}
        </div>
        <svg 
          className="absolute inset-0 w-full h-full opacity-30" 
          viewBox="0 0 1200 800" 
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feOffset dx="0" dy="0" result="offset"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="offset"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Red Lightning Bolts */}
          <path 
            d="M100,150 L120,180 L110,200 L140,240 L120,260 L150,300" 
            stroke="#b81414" 
            strokeWidth="1.2" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-red"
          />
          <path 
            d="M400,100 L430,140 L410,170 L450,220 L430,250 L470,290" 
            stroke="#b81414" 
            strokeWidth="0.8" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '2s' }}
          />
          <path 
            d="M800,180 L820,210 L800,240 L840,280 L820,310 L860,350" 
            stroke="#b81414" 
            strokeWidth="1.0" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '4s' }}
          />
          <path 
            d="M1050,60 L1070,90 L1055,110 L1080,140" 
            stroke="#b81414" 
            strokeWidth="0.6" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '7s' }}
          />
          
          {/* Green Lightning Bolts */}
          <path 
            d="M250,120 L280,160 L260,190 L300,230 L280,260 L320,300" 
            stroke="#14b814" 
            strokeWidth="1.0" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '1s' }}
          />
          <path 
            d="M600,80 L630,120 L610,150 L650,200 L630,230 L670,270" 
            stroke="#14b814" 
            strokeWidth="1.2" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '3s' }}
          />
          <path 
            d="M950,200 L980,240 L960,270 L1000,310 L980,340 L1020,380" 
            stroke="#14b814" 
            strokeWidth="0.8" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '5s' }}
          />
          <path 
            d="M50,400 L75,430 L65,450 L90,480" 
            stroke="#14b814" 
            strokeWidth="0.6" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '6.5s' }}
          />
          
          {/* White Lightning Bolts */}
          <path 
            d="M180,350 L210,390 L190,420 L230,460 L210,490 L250,530" 
            stroke="#ffffff" 
            strokeWidth="0.8" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '1.5s' }}
          />
          <path 
            d="M500,320 L530,360 L510,390 L550,430 L530,460 L570,500" 
            stroke="#ffffff" 
            strokeWidth="1.0" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '3.5s' }}
          />
          <path 
            d="M750,400 L780,440 L760,470 L800,510 L780,540 L820,580" 
            stroke="#ffffff" 
            strokeWidth="0.6" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '2.5s' }}
          />
          <path 
            d="M900,50 L915,80 L905,100 L925,130" 
            stroke="#ffffff" 
            strokeWidth="0.4" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '4.8s' }}
          />
          
          {/* Additional scattered tiny bolts */}
          <path 
            d="M350,480 L365,510 L355,530" 
            stroke="#b81414" 
            strokeWidth="0.2" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '6s' }}
          />
          <path 
            d="M720,120 L735,150 L725,170" 
            stroke="#14b814" 
            strokeWidth="0.25" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '4.5s' }}
          />
          <path 
            d="M1100,300 L1115,330 L1105,350" 
            stroke="#ffffff" 
            strokeWidth="0.15" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '5.5s' }}
          />
          <path 
            d="M300,600 L315,620 L305,640" 
            stroke="#b81414" 
            strokeWidth="0.2" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '8s' }}
          />
          <path 
            d="M650,550 L665,570 L655,590" 
            stroke="#14b814" 
            strokeWidth="0.18" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '7.5s' }}
          />
          <path 
            d="M850,650 L865,670 L855,690" 
            stroke="#ffffff" 
            strokeWidth="0.5" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '8.5s' }}
          />
          
          {/* Additional Dramatic Lightning */}
          <path 
            d="M200,50 L230,100 L210,140 L250,190 L230,230 L270,280 L250,320" 
            stroke="#b81414" 
            strokeWidth="1.5" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '9s' }}
          />
          <path 
            d="M700,30 L730,80 L710,120 L750,170 L730,210 L770,260" 
            stroke="#14b814" 
            strokeWidth="1.3" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '10s' }}
          />
          <path 
            d="M1000,450 L1030,500 L1010,540 L1050,590 L1030,630 L1070,680" 
            stroke="#ffffff" 
            strokeWidth="1.1" 
            fill="none" 
            filter="url(#strongGlow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '11s' }}
          />
          
          {/* Background subtle lightning network */}
          <path 
            d="M0,200 L30,220 L20,240 L50,260" 
            stroke="#b81414" 
            strokeWidth="0.3" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-red"
            style={{ animationDelay: '12s' }}
          />
          <path 
            d="M1150,100 L1180,120 L1170,140 L1200,160" 
            stroke="#14b814" 
            strokeWidth="0.4" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-green"
            style={{ animationDelay: '13s' }}
          />
          <path 
            d="M450,700 L480,720 L470,740 L500,760" 
            stroke="#ffffff" 
            strokeWidth="0.25" 
            fill="none" 
            filter="url(#glow)"
            className="lightning-bolt lightning-white"
            style={{ animationDelay: '14s' }}
          />
        </svg>
      </div>
      
      <Navbar />
      <section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 relative z-10">
        <div className="container mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-primary">{t('events.title').toUpperCase()}</h2>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
            {t('events.subtitle')}
          </p>
        </div>

        {/* Date Filter */}
        <div className="mb-6 md:mb-8 flex justify-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 bg-gray-800/50 rounded-lg p-3 md:p-4">
            <Calendar className="w-5 h-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-primary hover:text-accent transition-colors text-sm md:text-base text-center"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>

        {/* Events Horizontal Scroll */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide pb-4 justify-center"
          style={{ scrollBehavior: 'smooth' }}
        >
          {displayedEvents.map((event) => {
            return (
            <div key={event.id} className="group text-center flex-shrink-0 w-40 md:w-48">
              <div className="flex flex-col h-80">
                <div className="relative mb-4 z-10">
                  <div 
                    className="w-32 h-32 mx-auto rounded-full border-4 overflow-hidden bg-gray-800 relative" 
                    style={{ borderColor: '#CEAD81', position: 'relative', zIndex: 1 }}
                  >
                    <ImageWithFallback
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover bg-gray-700 relative z-10"
                      style={{ 
                        minHeight: '100%', 
                        minWidth: '100%',
                        position: 'relative',
                        zIndex: 2,
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 min-h-[80px] flex flex-col justify-start mb-3">
                    <p className="text-white text-sm">{event.description}</p>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {event.title}
                    </h3>
                  </div>
                  
                  <button 
                    onClick={() => handleEventClick(event)}
                    className="event-join-btn px-3 py-2 rounded-lg text-xs w-full text-center flex items-center justify-center min-h-[40px] leading-tight"
                  >
                    {t('events.viewDetails')}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        </div>
      </section>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 event-modal-backdrop flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="event-modal-content event-modal-enter rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Event Image */}
            <div className="relative h-64 w-full rounded-t-lg overflow-hidden bg-gray-900">
              <ImageWithFallback
                src={selectedEvent.image}
                alt={selectedEvent.title}
                className="w-full h-full object-cover absolute inset-0 z-0"
              />
              <div className="event-image-overlay absolute inset-0 z-10 pointer-events-none"></div>
            </div>

            {/* Event Content */}
            <div className="p-8">
              {/* Event Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">{selectedEvent.title}</h2>
                <p className="text-xl text-accent mb-4">{selectedEvent.artist}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-primary">{selectedEvent.price}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300">{selectedEvent.genre}</span>
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm">{new Date(selectedEvent.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm">{selectedEvent.time}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm">{selectedEvent.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm">{selectedEvent.capacity} kişi</span>
                </div>
              </div>

              {/* Event Description */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-3">{t('events.viewDetails')}</h3>
                <p className="text-gray-300 leading-relaxed">
                  {selectedEvent.detailedDescription}
                </p>
                {selectedEvent.duration && (
                  <div className="mt-3 inline-block bg-gray-800 px-3 py-1 rounded-full">
                    <span className="text-sm text-gray-300">{t('events.duration')}: {selectedEvent.duration}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={handleReservationClick}
                  className="reservation-btn flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all text-center flex items-center justify-center"
                >
                  {t('events.makeReservation')}
                </button>
                <button 
                  onClick={closeModal}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-center"
                >
                  {t('events.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}