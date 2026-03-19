import React from 'react';
import { X, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

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

interface EventConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictingEvent: Event;
  selectedDate: string;
  selectedTime: string;
}

export default function EventConflictModal({
  isOpen,
  onClose,
  conflictingEvent,
  selectedDate,
  selectedTime
}: EventConflictModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getEventEndTime = (startTime: string, duration?: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    
    let durationHours = 4;
    if (duration) {
      const match = duration.match(/(\d+)/);
      if (match) {
        durationHours = parseInt(match[1]);
      }
    }
    
    const end = new Date(start.getTime() + (durationHours * 60 * 60 * 1000));
    return end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 conflict-modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="conflict-modal-content bg-gradient-to-b from-gray-900/95 to-black/95 border-2 border-red-500/50 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-red-500/20 conflict-modal-enter">
        {/* Header */}
        <div className="relative p-6 border-b border-red-500/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-red-400">Rezervasyon Çakışması</h2>
          </div>
          
          <p className="text-gray-300 text-sm">
            Seçtiğiniz tarih ve saatte bir etkinlik bulunmaktadır
          </p>
        </div>

        {/* Event Details */}
        <div className="p-6">
          {/* Event Image */}
          <div className="relative w-full h-32 rounded-lg overflow-hidden mb-4 border border-red-500/30 event-info-card">
            <ImageWithFallback
              src={conflictingEvent.image}
              alt={conflictingEvent.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 conflict-event-image-overlay"></div>
          </div>

          {/* Event Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">{conflictingEvent.title}</h3>
              <p className="text-gray-300 text-sm">{conflictingEvent.detailedDescription || conflictingEvent.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                <Calendar className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-gray-400 text-xs">Etkinlik Tarihi</p>
                  <p className="text-white font-medium">{formatDate(conflictingEvent.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                <Clock className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-gray-400 text-xs">Etkinlik Saatleri</p>
                  <p className="text-white font-medium">
                    {conflictingEvent.time} - {getEventEndTime(conflictingEvent.time, conflictingEvent.duration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                <MapPin className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-gray-400 text-xs">Lokasyon</p>
                  <p className="text-white font-medium">{conflictingEvent.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                <Users className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-gray-400 text-xs">Kapasite</p>
                  <p className="text-white font-medium">{conflictingEvent.capacity} kişi</p>
                </div>
              </div>
            </div>

            {/* Conflict Details */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 conflict-warning">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-red-400 mt-0.5">⚠️</div>
                <div className="text-sm">
                  <p className="font-medium text-red-400 mb-2">Çakışma Detayı</p>
                  <p className="text-gray-300 mb-2">
                    <strong>Seçtiğiniz Zaman:</strong> {formatDate(selectedDate)} - {selectedTime}
                  </p>
                  <p className="text-gray-300">
                    Bu zaman diliminde <strong>{conflictingEvent.title}</strong> etkinliği düzenlenmektedir. 
                    Lütfen farklı bir tarih veya saat seçiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Alternative Suggestions */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-400 mt-0.5">💡</div>
                <div className="text-sm">
                  <p className="font-medium text-blue-400 mb-2">Öneriler</p>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Farklı bir tarih seçebilirsiniz</li>
                    <li>• Etkinlik öncesi saatleri deneyebilirsiniz</li>
                    <li>• Etkinlik sonrası saatleri tercih edebilirsiniz</li>
                    <li>• İlgili etkinliğe katılmayı düşünebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors text-center"
              >
                Farklı Zaman Seç
              </button>
              <button
                onClick={() => {
                  window.open('/events', '_blank');
                }}
                className="flex-1 bg-primary hover:bg-accent text-white py-3 rounded-lg font-medium transition-colors text-center"
              >
                Etkinliği Görüntüle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}