import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Table } from './reservation/tableData';
import FloorPlan from './reservation/FloorPlan';
import TableModal from './reservation/TableModal';
import ReservationForm from './reservation/ReservationForm';

interface ReservationData {
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}

export default function ReservationPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Etkinlik bilgisini location state'den al
  const eventInfo = location.state as {
    fromEvent?: boolean;
    eventId?: number;
    eventTitle?: string;
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
  } | null;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [reservationType, setReservationType] = useState<'table' | 'standing' | 'special' | null>(null);
  const [selectedDate, setSelectedDate] = useState(eventInfo?.eventDate || '');
  const [selectedTime, setSelectedTime] = useState('23:00'); // Sabit saat - kullanıcı seçmeyecek
  const [guestCount, setGuestCount] = useState(0);
  const [hoveredTable, setHoveredTable] = useState<Table | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [modalTable, setModalTable] = useState<Table | null>(null);
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [standingReservationCount, setStandingReservationCount] = useState(0);
  const [specialReservationTaken, setSpecialReservationTaken] = useState(false);
  const [generalEntryVisible, setGeneralEntryVisible] = useState(false);
  const [reservationData, setReservationData] = useState<ReservationData>({
    name: '',
    email: '',
    phone: '',
    specialRequests: ''
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const date = queryParams.get('date');
    if (date) {
      setSelectedDate(date);
      setCurrentStep(2);
    }
  }, [location]);

  // Site ayarlarını yükle
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await apiService.getSiteSettings();
        if (response.settings) {
          setGeneralEntryVisible(response.settings.generalEntryVisible === true);
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
      }
    };
    fetchSiteSettings();
  }, []);

  // Dolu masaları ve genel giriş durumlarını kontrol et
  useEffect(() => {
    const fetchReservationStatus = async () => {
      if (selectedDate) {
        try {
          // Dolu masaları çek
          const tablesResponse = await apiService.getOccupiedTables(selectedDate, selectedTime);
          if (tablesResponse.occupiedTables) {
            setOccupiedTables(tablesResponse.occupiedTables);
          }

          if (tablesResponse.standingCount !== undefined) {
            setStandingReservationCount(tablesResponse.standingCount);
          }

          if (tablesResponse.specialTaken !== undefined) {
            setSpecialReservationTaken(tablesResponse.specialTaken);
          }
        } catch (error) {
          console.error('Error fetching reservation status:', error);
        }
      } else {
        setOccupiedTables([]);
        setStandingReservationCount(0);
        setSpecialReservationTaken(false);
      }
    };
    
    fetchReservationStatus();
  }, [selectedDate, selectedTime]);

  const handleTableClick = (table: Table) => {
    // Önceki modal bilgilerini temizle
    setHoveredTable(null);
    setModalTable(table);
    setShowTableModal(true);
  };

  const handleTableSelect = (table: Table) => {
    // Masa dolu mu kontrol et
    if (occupiedTables.includes(table.name)) {
      toast.error(`${table.name} masası seçilen tarih ve saatte dolu. Lütfen farklı bir masa seçin.`, {
        duration: 4000
      });
      return;
    }
    
    if (table.isAvailable) {
      setSelectedTable(table);
      setHoveredTable(null); // Önceki hover bilgilerini temizle
      setShowTableModal(false);
      setCurrentStep(2);
      toast.success(`${table.name} seçildi! Rezervasyon bilgilerinizi doldurun.`);
    } else {
      toast.error('Bu masa dolu. Lütfen başka bir masa seçin.');
    }
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Masa veya rezervasyon tipi seçilmiş olmalı
    if (!selectedTable && !reservationType) {
      toast.error('Lütfen bir masa veya giriş tipi seçin');
      return;
    }
    
    if (!selectedDate) {
      toast.error('Lütfen tarih seçin');
      return;
    }

    if (!guestCount || guestCount < 1) {
      toast.error('Lütfen misafir sayısını girin');
      return;
    }

    try {
      const reservation = {
        table: selectedTable,
        reservationType: reservationType || 'table',
        date: selectedDate,
        time: selectedTime,
        guestCount,
        customerInfo: reservationData,
        // Etkinlik bilgisini de ekle (eğer etkinlikten geliyorsa)
        eventInfo: eventInfo?.fromEvent ? {
          eventId: eventInfo.eventId,
          eventTitle: eventInfo.eventTitle,
          eventDate: eventInfo.eventDate,
          eventTime: eventInfo.eventTime,
          eventLocation: eventInfo.eventLocation
        } : null
      };
      
      console.log('Reservation data:', reservation);
      
      const accessToken = session?.access_token;
      const response = await apiService.saveReservation(reservation, accessToken);

      if (response.error) {
        // Çakışma hatası özel olarak işle
        if (response.conflictType === 'table_occupied') {
          toast.error(response.error, {
            duration: 5000,
            description: selectedTable ? `${selectedTable.name} masası ${selectedDate} tarihinde ${selectedTime} saatinde dolu. Lütfen farklı bir masa veya zaman seçin.` : undefined
          });
        } else if (response.conflictType === 'standing_full') {
          toast.error('Ayakta rezervasyon kapasitesi dolu (20/20)', {
            duration: 4000
          });
        } else if (response.conflictType === 'special_taken') {
          toast.error('Özel masa bu tarih için zaten rezerve edilmiş', {
            duration: 4000
          });
        } else {
          toast.error(response.error);
        }
        return;
      }

      // Ödeme akışı: rezervasyon kaydedildikten sonra ödemeye yönlendir
      let paymentAmount = selectedTable?.price || 0;
      if (reservationType === 'standing') paymentAmount = 200;
      if (reservationType === 'special')  paymentAmount = 1500;

      if (paymentAmount > 0) {
        const paymentRes = await apiService.createPaymentCheckout({
          amount: paymentAmount,
          paymentType: 'reservation',
          referenceId: response.reservation?.id,
          description: `Rezervasyon — ${selectedTable?.name || reservationType} (${selectedDate})`,
          buyerInfo: {
            name:   reservationData.name,
            email:  reservationData.email,
            phone:  reservationData.phone,
            userId: session?.user?.id,
          },
        });

        if (paymentRes.error) {
          toast.error('Ödeme başlatılamadı: ' + paymentRes.error);
          return;
        }

        navigate('/payment', {
          state: {
            checkoutFormContent: paymentRes.checkoutFormContent,
            conversationId:      paymentRes.conversationId,
            amount:              paymentAmount,
            description:         `Rezervasyon — ${selectedTable?.name || reservationType}`,
          },
        });
        return;
      }

      toast.success(t('reservation.success'));
      
      // Reset form
      setCurrentStep(1);
      setSelectedTable(null);
      setReservationType(null);
      setSelectedDate('');
      setSelectedTime('23:00');
      setGuestCount(0);
      setReservationData({
        name: '',
        email: '',
        phone: '',
        specialRequests: ''
      });
    } catch (error) {
      console.error('Reservation error:', error);
      toast.error(`${t('reservation.error')}: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 text-primary">{t('reservation.title')}</h1>
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
              {t('reservation.subtitle')}
            </p>
            <div className="w-24 h-1 bg-primary mx-auto mt-4 md:mt-6"></div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8 px-4 md:px-6">
        <div className="container mx-auto">
          {/* Progress Steps */}
          <div className="flex justify-center mb-8 md:mb-12">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className={`flex items-center justify-center w-8 md:w-10 h-8 md:h-10 rounded-full text-sm md:text-base ${currentStep >= 1 ? 'bg-primary' : 'bg-gray-600'}`}>
                {currentStep > 1 ? <Check className="w-4 md:w-5 h-4 md:h-5" /> : '1'}
              </div>
              <div className="w-12 md:w-20 h-1 bg-gray-600"></div>
              <div className={`flex items-center justify-center w-8 md:w-10 h-8 md:h-10 rounded-full text-sm md:text-base ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-600'}`}>
                {currentStep > 2 ? <Check className="w-4 md:w-5 h-4 md:h-5" /> : '2'}
              </div>
              <div className="w-12 md:w-20 h-1 bg-gray-600"></div>
              <div className={`flex items-center justify-center w-8 md:w-10 h-8 md:h-10 rounded-full text-sm md:text-base ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-600'}`}>
                {currentStep > 3 ? <Check className="w-4 md:w-5 h-4 md:h-5" /> : '3'}
              </div>
            </div>
          </div>

          {/* Step 1: Reservation Details & Table Selection */}
          {currentStep === 1 && (
            <>
              <ReservationForm
                currentStep={currentStep}
                selectedTable={selectedTable}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                guestCount={guestCount}
                reservationData={reservationData}
                onStepChange={setCurrentStep}
                onDateChange={setSelectedDate}
                onTimeChange={setSelectedTime}
                onGuestCountChange={setGuestCount}
                onReservationDataChange={setReservationData}
                onSubmit={handleReservationSubmit}
                eventInfo={eventInfo}
                t={t}
              />

              {/* Table Selection Section */}
              <div className="mt-8 md:mt-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-center text-primary">{t('reservation.tableSelection')}</h2>
                <p className="text-xs md:text-sm text-center text-gray-400 mb-6 md:mb-8">
                  {t('reservation.exploreTablesHint')}
                </p>
                
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-4 lg:gap-6 mb-6 md:mb-8">
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-3 md:w-4 h-3 md:h-4 bg-yellow-500 rounded shadow-lg shadow-yellow-500/50"></div>
                    <span className="text-xs md:text-sm">VIP</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-3 md:w-4 h-3 md:h-4 bg-blue-500 rounded shadow-lg shadow-blue-500/50"></div>
                    <span className="text-xs md:text-sm">Regular</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-3 md:w-4 h-3 md:h-4 bg-purple-500 rounded shadow-lg shadow-purple-500/50"></div>
                    <span className="text-xs md:text-sm">Booth</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-3 md:w-4 h-3 md:h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded shadow-lg shadow-amber-400/60"></div>
                    <span className="text-xs md:text-sm">Loca</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-3 md:w-4 h-3 md:h-4 bg-red-500 rounded shadow-lg shadow-red-500/50"></div>
                    <span className="text-xs md:text-sm">Occupied</span>
                  </div>
                </div>

                {/* Floor Plan */}
                <FloorPlan
                  selectedTable={selectedTable}
                  hoveredTable={hoveredTable}
                  onTableHover={setHoveredTable}
                  onTableClick={handleTableClick}
                  occupiedTables={occupiedTables}
                  t={t}
                />
                
                {/* Genel Giriş Buton ve Seçenekler - Admin tarafından kontrol edilir */}
                {generalEntryVisible && <div className="mt-8 max-w-4xl mx-auto">
                  <div className="text-center mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">{t('reservation.generalEntry')}</h3>
                    <p className="text-sm text-gray-400">{t('reservation.generalEntryDesc')}</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Ayakta Rezervasyon */}
                    <div 
                      onClick={() => {
                        if (!selectedDate) {
                          toast.error(t('reservation.selectDateFirst'));
                          return;
                        }
                        if (standingReservationCount >= 20) {
                          toast.error(t('reservation.standingCapacityFull'));
                          return;
                        }
                        setReservationType('standing');
                        setSelectedTable(null);
                        setCurrentStep(2);
                        toast.success(t('reservation.standingSelected'));
                      }}
                      className={`cursor-pointer bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-2 rounded-lg p-6 transition-all duration-300 hover:scale-105 ${
                        reservationType === 'standing' 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/50' 
                          : 'border-blue-700/50 hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <span className="text-3xl">🕺</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-center text-blue-400 mb-2">
                        {t('reservation.standingReservation')}
                      </h4>
                      <p className="text-sm text-gray-400 text-center mb-4">
                        {t('reservation.standingDesc')}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('reservation.capacity')}</span>
                        <span className={`font-bold ${standingReservationCount >= 20 ? 'text-red-400' : 'text-green-400'}`}>
                          {standingReservationCount}/20
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-400">{t('reservation.price')}</span>
                        <span className="text-[#CEAD81] font-bold">₺200</span>
                      </div>
                      {standingReservationCount >= 20 && (
                        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 text-center">
                          ⚠️ {t('reservation.capacityFull')}
                        </div>
                      )}
                    </div>

                    {/* Özel Masa Rezervasyonu */}
                    <div 
                      onClick={() => {
                        if (!selectedDate) {
                          toast.error(t('reservation.selectDateFirst'));
                          return;
                        }
                        if (specialReservationTaken) {
                          toast.error(t('reservation.specialTableTaken'));
                          return;
                        }
                        setReservationType('special');
                        setSelectedTable(null);
                        setCurrentStep(2);
                        toast.success(t('reservation.specialSelected'));
                      }}
                      className={`cursor-pointer bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 rounded-lg p-6 transition-all duration-300 hover:scale-105 ${
                        reservationType === 'special' 
                          ? 'border-purple-500 shadow-lg shadow-purple-500/50' 
                          : 'border-purple-700/50 hover:border-purple-500'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-3xl">👑</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-center text-purple-400 mb-2">
                        {t('reservation.specialTable')}
                      </h4>
                      <p className="text-sm text-gray-400 text-center mb-4">
                        {t('reservation.specialTableDesc')}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('reservation.status')}</span>
                        <span className={`font-bold ${specialReservationTaken ? 'text-red-400' : 'text-green-400'}`}>
                          {specialReservationTaken ? t('reservation.reserved') : t('reservation.available')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-400">{t('reservation.price')}</span>
                        <span className="text-[#CEAD81] font-bold">₺1500</span>
                      </div>
                      {specialReservationTaken && (
                        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 text-center">
                          ⚠️ {t('reservation.reservedForDate')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>}
              </div>
            </>
          )}

          {/* Step 2 & 3: Customer Information & Review */}
          {(currentStep === 2 || currentStep === 3) && (
            <ReservationForm
              currentStep={currentStep}
              selectedTable={selectedTable}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              guestCount={guestCount}
              reservationData={reservationData}
              onStepChange={setCurrentStep}
              onDateChange={setSelectedDate}
              onTimeChange={setSelectedTime}
              onGuestCountChange={setGuestCount}
              onReservationDataChange={setReservationData}
              onSubmit={handleReservationSubmit}
              eventInfo={eventInfo}
              t={t}
            />
          )}
        </div>
      </section>

      {/* Table Detail Modal */}
      {showTableModal && modalTable && (
        <TableModal
          table={modalTable}
          isOpen={showTableModal}
          onClose={() => setShowTableModal(false)}
          onSelect={handleTableSelect}
          isOccupied={occupiedTables.includes(modalTable.name)}
        />
      )}
    </div>
  );
}