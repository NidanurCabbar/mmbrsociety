// Event-Reservation Conflict Detection System

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

// Etkinlik saatlerini parse etme ve bitiş saatini hesaplama
export const parseEventTime = (time: string, duration?: string): { start: Date, end: Date } => {
  const [hours, minutes] = time.split(':').map(Number);
  const start = new Date();
  
  // 24:00 saatini bir sonraki günün 00:00'ı olarak handle et
  if (hours === 24) {
    start.setHours(0, minutes, 0, 0);
    start.setDate(start.getDate() + 1);
  } else {
    start.setHours(hours, minutes, 0, 0);
  }
  
  // Duration'ı parse et (örn: "5 Saat" -> 5)
  let durationHours = 4; // Default olarak 4 saat
  if (duration) {
    const match = duration.match(/(\d+)/);
    if (match) {
      durationHours = parseInt(match[1]);
    }
  }
  
  const end = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
  
  return { start, end };
};

// Rezervasyon saatini parse etme
export const parseReservationTime = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const reservationTime = new Date();
  
  // 24:00 saatini bir sonraki günün 00:00'ı olarak handle et
  if (hours === 24) {
    reservationTime.setHours(0, minutes, 0, 0);
    reservationTime.setDate(reservationTime.getDate() + 1);
  } else {
    reservationTime.setHours(hours, minutes, 0, 0);
  }
  
  return reservationTime;
};

// Çakışma kontrolü
export const checkEventConflict = (
  events: Event[], 
  reservationDate: string, 
  reservationTime: string
): Event | null => {
  if (!reservationDate || !reservationTime) return null;
  
  // Rezervasyon tarihinde etkinlik var mı kontrol et
  const eventsOnDate = events.filter(event => event.date === reservationDate);
  
  if (eventsOnDate.length === 0) return null;
  
  const reservationDateTime = parseReservationTime(reservationTime);
  
  // Her etkinlik için çakışma kontrolü
  for (const event of eventsOnDate) {
    const { start: eventStart, end: eventEnd } = parseEventTime(event.time, event.duration);
    
    // Rezervasyon saati etkinlik saatleri arasında mı?
    if (reservationDateTime >= eventStart && reservationDateTime <= eventEnd) {
      return event;
    }
  }
  
  return null;
};

// Çakışan zaman dilimlerini bul
export const getConflictingTimeSlots = (events: Event[], date: string): string[] => {
  if (!date) return [];
  
  const eventsOnDate = events.filter(event => event.date === date);
  const conflictingSlots: string[] = [];
  
  const timeSlots = ['22:00', '22:30', '23:00', '23:30', '24:00', '00:30', '01:00'];
  
  for (const slot of timeSlots) {
    const slotTime = parseReservationTime(slot);
    
    for (const event of eventsOnDate) {
      const { start: eventStart, end: eventEnd } = parseEventTime(event.time, event.duration);
      
      if (slotTime >= eventStart && slotTime <= eventEnd) {
        conflictingSlots.push(slot);
        break;
      }
    }
  }
  
  return conflictingSlots;
};

// Etkinlik bilgilerini formatlama
export const formatEventConflictMessage = (event: Event): string => {
  const { start, end } = parseEventTime(event.time, event.duration);
  const startTime = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  return `${event.title} etkinliği ${startTime} - ${endTime} saatleri arasında düzenleniyor. Bu zaman diliminde rezervasyon yapılamaz.`;
};