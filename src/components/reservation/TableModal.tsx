import React from 'react';
import { X } from 'lucide-react';
import type { Table } from './tableData';
import { getTableColor, getTableGlow } from './tableData';

interface TableModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (table: Table) => void;
  isOccupied?: boolean;
}

export default function TableModal({ table, isOpen, onClose, onSelect, isOccupied = false }: TableModalProps) {
  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-gray-900 border-2 border-primary rounded-xl max-w-md w-full p-6 relative table-detail-modal">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Content */}
        <div className="text-center">
          {/* Table Icon */}
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${getTableColor(table, null)} ${getTableGlow(table, null)} shadow-2xl`}>
            <span className="text-2xl font-bold text-white">{table.name}</span>
          </div>

          <h3 className="text-2xl font-bold text-primary mb-2">{table.name}</h3>
          <p className="text-gray-400 mb-6 capitalize">{table.type} Table</p>

          {/* Table Details */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-300">Type</span>
              <span className="text-white font-semibold capitalize">{table.type}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-300">Capacity</span>
              <span className="text-white font-semibold">{table.capacity} guests</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-300">Price</span>
              <span className="text-[#CEAD81] font-bold text-lg">₺{table.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={isOccupied ? 'text-red-400' : table.isAvailable ? 'text-green-400' : 'text-red-400'}>
                {isOccupied ? 'Rezerve Edilmiş' : table.isAvailable ? 'Müsait' : 'Dolu'}
              </span>
            </div>
          </div>

          {/* Dolu masa uyarısı */}
          {isOccupied && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-red-500 text-2xl">⚠️</div>
                <div>
                  <h4 className="text-red-300 font-semibold mb-1">Masa Rezerve Edilmiş</h4>
                  <p className="text-sm text-red-200">
                    Bu masa seçtiğiniz tarih ve saatte başka bir müşteri tarafından rezerve edilmiştir. 
                    Lütfen farklı bir masa veya zaman dilimi seçin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3 text-white">Features</h4>
            <div className="text-sm text-gray-300 space-y-2">
              {table.type === 'vip' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">⭐</span>
                    <span>Premium location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">🥂</span>
                    <span>Priority service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">👤</span>
                    <span>Dedicated waiter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">🍾</span>
                    <span>Complimentary snacks</span>
                  </div>
                </>
              )}
              {table.type === 'booth' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500">🔒</span>
                    <span>Private and intimate space</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500">💎</span>
                    <span>High comfort level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500">👥</span>
                    <span>Ideal for group events</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500">🎵</span>
                    <span>Custom music selection</span>
                  </div>
                </>
              )}
              {table.type === 'regular' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">⚙️</span>
                    <span>Standard service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">💃</span>
                    <span>Close to dance floor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">🎉</span>
                    <span>Social atmosphere</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">💰</span>
                    <span>Affordable price</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
            >
              Kapat
            </button>
            <button
              onClick={() => !isOccupied && onSelect(table)}
              disabled={isOccupied || !table.isAvailable}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                isOccupied || !table.isAvailable
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-accent text-white hover:shadow-lg hover:shadow-primary/50'
              }`}
            >
              {isOccupied ? 'Müsait Değil' : table.isAvailable ? 'Bu Masayı Seç' : 'Dolu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}