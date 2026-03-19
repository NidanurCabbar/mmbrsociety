import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Table } from './tableData';
import { timeSlots } from './tableData';
import { apiService } from '../../utils/api';
import { getConflictingTimeSlots, checkEventConflict } from '../../utils/eventConflictChecker';
import { eventUpdateManager } from '../../utils/eventUpdater';
import EventConflictModal from '../EventConflictModal';
import WeekendCalendar from './WeekendCalendar';

interface ReservationData {
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}

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

interface ReservationFormProps {
  currentStep: number;
  selectedTable: Table | null;
  selectedDate: string;
  selectedTime: string;
  guestCount: number;
  reservationData: ReservationData;
  onStepChange: (step: number) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onGuestCountChange: (count: number) => void;
  onReservationDataChange: (data: ReservationData) => void;
  onSubmit: (e: React.FormEvent) => void;
  eventInfo: { fromEvent: boolean; eventDate: string; eventTime: string; eventTitle: string; eventLocation: string } | null;
  t: (key: string) => string;
}

export default function ReservationForm({
  currentStep,
  selectedTable,
  selectedDate,
  selectedTime,
  guestCount,
  reservationData,
  onStepChange,
  onDateChange,
  onTimeChange,
  onGuestCountChange,
  onReservationDataChange,
  onSubmit,
  eventInfo,
  t
}: ReservationFormProps) {
  // Locale tanımını ekle
  const locale = t('nav.home') === 'Ana Sayfa' ? 'tr-TR' : 'en-US';
  
  // Etkinlikten gelip gelmediğini kontrol et
  const isFromEvent = eventInfo?.fromEvent && eventInfo?.eventDate && eventInfo?.eventTime;

  const [events, setEvents] = useState<Event[]>([]);
  const [conflictingTimeSlots, setConflictingTimeSlots] = useState<string[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingEvent, setConflictingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Event update handler
  const handleEventUpdate = useCallback(() => {
    console.log('🔄 ReservationForm: Received event update notification, reloading events...');
    loadEvents();
  }, []);

  // Etkinlikleri yükle
  useEffect(() => {
    loadEvents();
    
    // Register for event updates
    eventUpdateManager.addListener(handleEventUpdate);
    
    // Cleanup listener on unmount
    return () => {
      eventUpdateManager.removeListener(handleEventUpdate);
    };
  }, [handleEventUpdate]);

  // Otomatik tarih seçimi - Eğer tarih boşsa ve etkinlikten gelmiyorsak, ilk uygun tarihi seç
  useEffect(() => {
    if (!selectedDate && !isFromEvent && !loading) {
      const nextAvailable = getNextAvailableDate();
      onDateChange(nextAvailable);
    }
  }, [selectedDate, isFromEvent, loading]);

  // Tarih değiştiğinde çakışan zaman dilimlerini güncelle
  useEffect(() => {
    if (selectedDate && events.length > 0) {
      const conflictingSlots = getConflictingTimeSlots(events, selectedDate);
      setConflictingTimeSlots(conflictingSlots);
      
      // Sabit saat kullanıldığı için çakışma kontrolü kaldırıldı
    } else {
      setConflictingTimeSlots([]);
    }
  }, [selectedDate, events]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEvents();
      
      if (response.error) {
        console.error('Error loading events:', response.error);
        setEvents([]);
      } else {
        setEvents(response.events || []);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = (field: keyof ReservationData, value: string) => {
    onReservationDataChange({ ...reservationData, [field]: value });
  };

  const handleTimeChange = (time: string) => {
    // Çakışma kontrolü
    if (selectedDate && time) {
      const conflict = checkEventConflict(events, selectedDate, time);
      if (conflict) {
        setConflictingEvent(conflict);
        setShowConflictModal(true);
        return; // Zaman seçimini engelle
      }
    }
    
    onTimeChange(time);
  };

  // Sadece Cuma (5) ve Cumartesi (6) günlerini seçilebilir hale getir
  const isDateAvailable = (dateString: string): boolean => {
    // Tarih string'ini parçalara ayır
    const [year, month, day] = dateString.split('-').map(Number);
    // Yerel zaman diliminde tarih oluştur (UTC problemlerini önlemek için)
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Pazar, 1 = Pazartesi, ..., 5 = Cuma, 6 = Cumartesi
    
    
    return dayOfWeek === 5 || dayOfWeek === 6; // Sadece Cuma ve Cumartesi
  };

  const handleDateChange = (dateString: string) => {
    if (dateString && !isDateAvailable(dateString)) {
      // Simply prevent invalid date selection without showing popup
      return;
    }
    
    onDateChange(dateString);
  };

  // Tarih input için minimum tarihi ayarla (bugünden itibaren)
  const getMinDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tarih input için maksimum tarihi ayarla (30 gün ilerisi)
  const getMaxDate = (): string => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 gün ilerisi
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Bir sonraki uygun tarihi bul (Cuma veya Cumartesi)
  const getNextAvailableDate = (): string => {
    const today = new Date();
    let nextDate = new Date(today);
    
    // Bugünden başlayarak bir sonraki Cuma veya Cumartesi'yi bul
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = nextDate.getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) { // Cuma veya Cumartesi
        // Yerel tarih formatını kullan
        const year = nextDate.getFullYear();
        const month = String(nextDate.getMonth() + 1).padStart(2, '0');
        const day = String(nextDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    // Fallback
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Kullanıcıya uygun tarih önerisi göster (popup removed)
  const suggestAvailableDate = () => {
    // Function kept for potential future use but popup removed
    return;
  };

  if (currentStep === 2) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center text-primary">Customer Information</h2>
        
        {/* Selected Table Summary */}
        {selectedTable && (
          <div className="bg-primary/20 border border-primary/30 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-primary mb-4">Selected Table: {selectedTable.name}</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Date:</span> {selectedDate}
              </div>
              <div>
                <span className="text-gray-400">Time:</span> {selectedTime}
              </div>
              <div>
                <span className="text-gray-400">Guests:</span> {guestCount}
              </div>
              <div>
                <span className="text-gray-400">Price:</span> <span className="text-[#CEAD81] font-bold">₺{selectedTable.price}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="bg-gray-800/30 rounded-lg p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t('reservation.form.name')} *</label>
                <input
                  type="text"
                  value={reservationData.name}
                  onChange={(e) => handleDataChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('reservation.form.email')} *</label>
                <input
                  type="email"
                  value={reservationData.email}
                  onChange={(e) => handleDataChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                  required
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">{t('reservation.form.phone')} *</label>
              <input
                type="tel"
                value={reservationData.phone}
                onChange={(e) => handleDataChange('phone', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                required
              />
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">mesajınız</label>
              <textarea
                value={reservationData.specialRequests}
                onChange={(e) => handleDataChange('specialRequests', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onStepChange(1)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 transition-colors py-3 rounded-lg text-center"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onStepChange(3)}
              className="flex-1 bg-primary hover:bg-accent transition-all duration-300 py-3 rounded-lg font-semibold reservation-btn text-center"
            >
              Review Reservation
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center text-primary">Review & Confirm</h2>
        
        <div className="bg-gray-800/30 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-6">Reservation Summary</h3>
          
          {selectedTable && (
            <div className="space-y-4">
              {/* Table Information */}
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-4">
                <h4 className="font-bold text-primary mb-2">Table: {selectedTable.name}</h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <div>Type: {selectedTable.type.toUpperCase()}</div>
                  <div>Capacity: {selectedTable.capacity} guests</div>
                  <div>Date: {selectedDate}</div>
                  <div>Time: {selectedTime}</div>
                  <div>Guests: {guestCount}</div>
                  <div className="text-[#CEAD81] font-bold">Price: ₺{selectedTable.price}</div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="font-bold mb-2">Customer Information</h4>
                <div className="space-y-1 text-sm">
                  <div>Name: {reservationData.name}</div>
                  <div>Email: {reservationData.email}</div>
                  <div>Phone: {reservationData.phone}</div>
                  {reservationData.specialRequests && (
                    <div>Special Requests: {reservationData.specialRequests}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!termsAccepted) {
            toast.error(locale === 'tr-TR' 
              ? 'Lütfen hizmet koşullarını kabul edin' 
              : 'Please accept the terms and conditions'
            );
            return;
          }
          onSubmit(e);
        }} className="space-y-6">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-yellow-500 mt-0.5">⚠️</div>
              <div className="text-sm">
                <p className="font-medium text-yellow-500 mb-1">Important Information</p>
                <ul className="text-gray-300 space-y-1">
                  <li>• Reservations are confirmed upon submission</li>
                  <li>• A deposit may be required for some tables</li>
                  <li>• Cancellations must be made 24 hours in advance</li>
                  <li>• Table will be held for 15 minutes past reservation time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="terms-container rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-primary">
              {locale === 'tr-TR' ? 'Hizmet Koşulları ve Kurallar' : 'Terms and Conditions & Rules'}
            </h3>
            
            <div className="terms-scroll-area space-y-4 text-sm text-gray-300 max-h-48 overflow-y-auto">
              <div>
                <h4 className="terms-section-header mb-2">
                  {locale === 'tr-TR' ? '🎵 Müzik ve Atmosfer' : '🎵 Music & Atmosphere'}
                </h4>
                <ul className="space-y-1 pl-4">
                  <li className="terms-list-item">• {locale === 'tr-TR' ? 'Kulübümüz 23:00-03:00 saatleri arasında faaliyet gösterir' : 'Our club operates between 23:00-03:00'}</li>
                  <li className="terms-list-item">• {locale === 'tr-TR' ? 'Sadece Cuma ve Cumartesi günleri açığız' : 'We are only open on Fridays and Saturdays'}</li>
                  <li className="terms-list-item">• {locale === 'tr-TR' ? 'Yüksek sesli müzik ve dinamik atmosfer beklentisi' : 'Expect loud music and dynamic atmosphere'}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">
                  {locale === 'tr-TR' ? '🚪 Giriş ve Güvenlik' : '🚪 Entry & Security'}
                </h4>
                <ul className="space-y-1 pl-4">
                  <li>• {locale === 'tr-TR' ? '18 yaş altı giriş yasaktır' : 'Entry prohibited for under 18'}</li>
                  <li>• {locale === 'tr-TR' ? 'Kimlik kontrolü zorunludur' : 'ID check is mandatory'}</li>
                  <li>• {locale === 'tr-TR' ? 'Güvenlik araması yapılabilir' : 'Security screening may be conducted'}</li>
                  <li>• {locale === 'tr-TR' ? 'Uygun olmayan kıyafet ile giriş yasaktır' : 'Inappropriate attire prohibited'}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">
                  {locale === 'tr-TR' ? '💰 Rezervasyon ve Ödeme' : '💰 Reservation & Payment'}
                </h4>
                <ul className="space-y-1 pl-4">
                  <li>• {locale === 'tr-TR' ? 'Minimum tüketim limitleri mevcuttur' : 'Minimum consumption limits apply'}</li>
                  <li>• {locale === 'tr-TR' ? 'VIP masalar için ön ödeme gerekebilir' : 'VIP tables may require advance payment'}</li>
                  <li>• {locale === 'tr-TR' ? 'İptal işlemleri 24 saat öncesinden yapılmalıdır' : 'Cancellations must be made 24 hours in advance'}</li>
                  <li>• {locale === 'tr-TR' ? 'Geç kalma durumunda masa 15 dakika tutulur' : 'Tables held for 15 minutes for late arrivals'}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">
                  {locale === 'tr-TR' ? '🚫 Yasaklar ve Sorumluluklar' : '🚫 Prohibitions & Responsibilities'}
                </h4>
                <ul className="space-y-1 pl-4">
                  <li>• {locale === 'tr-TR' ? 'Alkol ve uyuşturucu madde dışarıdan getirilemez' : 'Outside alcohol and substances prohibited'}</li>
                  <li>• {locale === 'tr-TR' ? 'Kavga, taciz ve rahatsız edici davranışlar yasaktır' : 'Fighting, harassment and disruptive behavior prohibited'}</li>
                  <li>• {locale === 'tr-TR' ? 'Kişisel eşyalarınız sorumluluğunuzdadır' : 'Personal belongings are your responsibility'}</li>
                  <li>• {locale === 'tr-TR' ? 'Yönetim kuralları değiştirme hakkını saklı tutar' : 'Management reserves the right to change rules'}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">
                  {locale === 'tr-TR' ? '📱 Fotoğraf ve Video' : '📱 Photography & Video'}
                </h4>
                <ul className="space-y-1 pl-4">
                  <li>• {locale === 'tr-TR' ? 'Ticari amaçlı çekim yasaktır' : 'Commercial filming prohibited'}</li>
                  <li>• {locale === 'tr-TR' ? 'Diğer müşterilerin mahremiyetine saygı gösterin' : 'Respect other customers\' privacy'}</li>
                  <li>• {locale === 'tr-TR' ? 'Güvenlik kameraları 7/24 aktiftir' : 'Security cameras operate 24/7'}</li>
                </ul>
              </div>
            </div>
            
            <div className="terms-acceptance mt-6 pt-4 border-t border-border">
              <label className="terms-acceptance-label flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="terms-checkbox"
                />
                <span className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                  {locale === 'tr-TR' 
                    ? 'Yukarıda belirtilen hizmet koşulları, kulüp kuralları ve sorumluluklarını okudum, anladım ve kabul ediyorum. Bu koşullara uymayı taahhüt ederim.'
                    : 'I have read, understood, and accept the terms of service, club rules, and responsibilities outlined above. I commit to comply with these conditions.'
                  }
                </span>
              </label>
              
              {!termsAccepted && (
                <p className="terms-warning-text flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {locale === 'tr-TR' 
                    ? 'Devam etmek için hizmet koşullarını kabul etmelisiniz'
                    : 'You must accept the terms and conditions to proceed'
                  }
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onStepChange(2)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 transition-colors py-3 rounded-lg text-center"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!termsAccepted}
              className={`flex-1 py-3 rounded-lg font-semibold reservation-btn flex items-center justify-center gap-2 transition-all duration-300 ${
                termsAccepted 
                  ? 'bg-primary hover:bg-accent text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Confirm Reservation
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Event Info Banner - Eğer etkinlikten gelindiyse */}
      {isFromEvent && eventInfo && (
        <div className="mb-8 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-primary mb-2">
            {locale === 'tr-TR' ? '🎉 Etkinlik Rezervasyonu' : '🎉 Event Reservation'}
          </h3>
          <p className="text-gray-300 mb-4">
            {locale === 'tr-TR' 
              ? `"${eventInfo.eventTitle}" etkinliği için rezervasyon yapıyorsunuz.`
              : `You are making a reservation for the "${eventInfo.eventTitle}" event.`
            }
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">{locale === 'tr-TR' ? 'Tarih:' : 'Date:'}</span>{' '}
              <span className="text-[#CEAD81] font-semibold">
                {new Date(eventInfo.eventDate!).toLocaleDateString(locale, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <div>
              <span className="text-gray-400">{locale === 'tr-TR' ? 'Saat:' : 'Time:'}</span>{' '}
              <span className="text-[#CEAD81] font-semibold">{eventInfo.eventTime}</span>
            </div>
            <div>
              <span className="text-gray-400">{locale === 'tr-TR' ? 'Lokasyon:' : 'Location:'}</span>{' '}
              <span className="text-[#CEAD81] font-semibold">{eventInfo.eventLocation}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Reservation Details Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-8 text-center text-primary">Reservation Details</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Weekend Calendar - Sadece etkinlikten gelmiyorsa göster */}
          {!isFromEvent && (
            <div className="space-y-6 lg:col-span-2 flex flex-col items-center">
              <div className="w-full max-w-2xl">
                <label className="block text-sm font-medium mb-4">{t('reservation.form.date')} *</label>
                <WeekendCalendar
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                  minDate={getMinDate()}
                  maxDate={getMaxDate()}
                />
              </div>
              
              {/* Guest Count - tarih altında */}
              <div className="w-full max-w-2xl">
                <label className="block text-sm font-medium mb-2">{t('reservation.form.guests')} *</label>
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={guestCount === 0 ? '' : guestCount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '') {
                        onGuestCountChange(0);
                      } else {
                        const num = Math.min(20, Math.max(1, parseInt(val)));
                        onGuestCountChange(num);
                      }
                    }}
                    placeholder={locale === 'tr-TR' ? 'Misafir sayısını giriniz' : 'Enter number of guests'}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">
                      👥 {locale === 'tr-TR' ? 'Maksimum 20 misafir (rezervasyon başına)' : 'Maximum 20 guests per reservation'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Details Summary */}
              {selectedDate && (
                <div className="w-full max-w-2xl bg-primary/20 border border-primary/30 rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">Selected Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">{new Date(selectedDate + 'T00:00:00').toLocaleDateString(locale, { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Guests:</span>
                      <span className="text-white">{guestCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Time and Guest Selection */}
          <div className={`space-y-6 ${isFromEvent ? 'lg:col-span-2' : 'hidden'}`}>
            {/* isFromEvent ise misafir sayısı buraya */}
            {isFromEvent && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('reservation.form.guests')} *</label>
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={guestCount === 0 ? '' : guestCount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '') {
                        onGuestCountChange(0);
                      } else {
                        const num = Math.min(20, Math.max(1, parseInt(val)));
                        onGuestCountChange(num);
                      }
                    }}
                    placeholder={locale === 'tr-TR' ? 'Misafir sayısını giriniz' : 'Enter number of guests'}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">
                      👥 {locale === 'tr-TR' ? 'Maksimum 20 misafir (rezervasyon başına)' : 'Maximum 20 guests per reservation'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Selected Details Summary - isFromEvent için */}
            {isFromEvent && (selectedDate || isFromEvent) && (
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-4">
                <h4 className="font-bold text-primary mb-2">Selected Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white">{new Date(selectedDate + 'T00:00:00').toLocaleDateString(locale, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Guests:</span>
                    <span className="text-white">{guestCount}</span>
                  </div>
                  {isFromEvent && eventInfo && (
                    <div className="flex justify-between pt-2 mt-2 border-t border-primary/20">
                      <span className="text-gray-400">Event:</span>
                      <span className="text-[#CEAD81] font-semibold">{eventInfo.eventTitle}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Event Conflict Modal */}
        {conflictingEvent && (
          <EventConflictModal
            isOpen={showConflictModal}
            onClose={() => setShowConflictModal(false)}
            conflictingEvent={conflictingEvent}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        )}
      </div>
    </div>
  );
}