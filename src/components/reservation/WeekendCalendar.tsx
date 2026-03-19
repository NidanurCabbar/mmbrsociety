import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface WeekendCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

interface WeekendDate {
  date: string;
  dayName: string;
  dayNumber: number;
  month: string;
  year: number;
  isToday: boolean;
  isPast: boolean;
}

export default function WeekendCalendar({
  selectedDate,
  onDateChange,
  minDate,
  maxDate
}: WeekendCalendarProps) {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekendDates, setWeekendDates] = useState<WeekendDate[]>([]);

  // Dil ayarına göre locale belirle
  const locale = t('nav.home') === 'Ana Sayfa' ? 'tr-TR' : 'en-US';

  useEffect(() => {
    generateWeekendDates();
  }, [currentMonth, locale]);

  const generateWeekendDates = () => {
    const dates: WeekendDate[] = [];
    
    // Bugünün tarihini yerel zaman diliminde al
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Mevcut ayın başlangıç ve bitiş tarihlerini al
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Önceki ayın son haftasından başla (gerekirse)
    const startDate = new Date(startOfMonth);
    while (startDate.getDay() !== 1) { // Pazartesi'den başla
      startDate.setDate(startDate.getDate() - 1);
    }
    
    // Sonraki ayın ilk haftasına kadar devam et (gerekirse)
    const endDate = new Date(endOfMonth);
    while (endDate.getDay() !== 0) { // Pazar'da bitir
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Sadece Cuma (5) ve Cumartesi (6) günlerini ekle
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        // Yerel tarih formatını kullan (UTC problemlerini önlemek için)
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Tarih karşılaştırması için yerel tarih kullan
        const currentDateForComparison = new Date(currentDate);
        currentDateForComparison.setHours(0, 0, 0, 0);
        
        const isPast = currentDateForComparison < today;
        const isToday = currentDateForComparison.getTime() === today.getTime();
        
        // Min/max tarih kontrolü
        const isInRange = (!minDate || dateStr >= minDate) && (!maxDate || dateStr <= maxDate);
        
        if (isInRange) {
          
          dates.push({
            date: dateStr,
            dayName: currentDate.toLocaleDateString(locale, { weekday: 'long' }),
            dayNumber: currentDate.getDate(),
            month: currentDate.toLocaleDateString(locale, { month: 'long' }),
            year: currentDate.getFullYear(),
            isToday,
            isPast
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setWeekendDates(dates);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    
    // Ay değiştiğinde seçili tarihi temizle
    onDateChange('');
  };

  const handleDateSelect = (date: string) => {
    onDateChange(date);
  };

  const getDateButtonStyle = (weekendDate: WeekendDate) => {
    const { date, isPast, isToday } = weekendDate;
    const isSelected = selectedDate === date;
    
    
    if (isPast) {
      return 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700';
    }
    
    if (isSelected) {
      return 'bg-primary text-white border-2 border-primary shadow-lg shadow-primary/50 scale-105 transform weekend-calendar-date-selected';
    }
    
    if (isToday) {
      return 'bg-[#CEAD81] text-black border border-[#CEAD81] hover:bg-[#D4BB8B] hover:scale-105 transform transition-all duration-300';
    }
    
    return 'bg-gray-800/50 text-white border border-gray-600 hover:bg-gray-700 hover:border-primary/50 hover:scale-105 transform transition-all duration-300';
  };

  const currentMonthName = currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-600">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-primary">{currentMonthName}</h3>
        </div>
        
        <button
          onClick={() => navigateMonth('next')}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekend Dates Grid */}
      <div className="space-y-4">
        {weekendDates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Bu ay için müsait tarih yok</p>
            <p className="text-xs text-gray-500 mt-1">Sadece Cuma ve Cumartesi günleri müsaittir</p>
          </div>
        ) : (
          <>
            {/* Scroll Hint */}
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>📅 {weekendDates.length} müsait gün</span>
              <span className="flex items-center gap-1">
                <span className="animate-bounce">↕️</span>
                Kaydırın
              </span>
            </div>
            
            {/* Scrollable Dates Container */}
            <div className="relative">
              {/* Top Gradient Shadow */}
              <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-900/80 to-transparent pointer-events-none z-10 rounded-t-lg"></div>
              
              {/* Scrollable Area */}
              <div className="max-h-[200px] overflow-y-auto pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-primary scrollbar-track-gray-800/50 hover:scrollbar-thumb-accent">
                <div className="grid gap-2.5 py-1">
                  {weekendDates.map((weekendDate) => (
                    <button
                      key={weekendDate.date}
                      onClick={() => handleDateSelect(weekendDate.date)}
                      disabled={weekendDate.isPast}
                      className={`
                        p-3 rounded-lg text-left weekend-calendar-date
                        ${getDateButtonStyle(weekendDate)}
                        ${weekendDate.isPast ? '' : 'hover:shadow-lg'}
                        ${selectedDate === weekendDate.date ? 'weekend-calendar-date-selected !bg-primary !text-white !border-primary' : ''}
                        ${weekendDate.isToday ? 'weekend-calendar-today' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-base">{weekendDate.dayNumber}</div>
                          <div className="text-xs opacity-80">{weekendDate.dayName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs opacity-70">{weekendDate.month}</div>
                          {weekendDate.isToday && (
                            <div className="text-xs font-medium mt-1 bg-black/20 px-2 py-0.5 rounded">
                              {t('calendar.today')}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bottom Gradient Shadow */}
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none z-10 rounded-b-lg"></div>
            </div>
          </>
        )}
      </div>

      {/* Weekend Information */}
      <div className="relative mt-6 p-4 nightclub-hours-indicator rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-[#CEAD81] rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-[#CEAD81]">{t('reservation.operatingInfo')}</span>
        </div>
        <p className="text-xs text-gray-300 font-medium">
          🌙 {t('reservation.operatingHours')}: 23:00 - 03:00
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {t('reservation.operatingDays')}
        </p>
        <div className="absolute top-2 right-2 text-xl opacity-20">
          🎵
        </div>
      </div>
    </div>
  );
}