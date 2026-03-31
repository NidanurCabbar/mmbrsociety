import React, { useState } from 'react';
import type { Table } from './tableData';
import { tables, getTableColor, getTableGlow } from './tableData';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import KrokiMmbr from '../../imports/KrokiMmbr1';

interface FloorPlanProps {
  selectedTable: Table | null;
  hoveredTable: Table | null;
  onTableHover: (table: Table | null) => void;
  onTableClick: (table: Table) => void;
  occupiedTables?: string[];
  t: (key: string) => string;
}

export default function FloorPlan({ selectedTable, hoveredTable, onTableHover, onTableClick, occupiedTables = [], t }: FloorPlanProps) {
  const [visibleTables, setVisibleTables] = useState<Set<number>>(new Set());
  const [discoveredTables, setDiscoveredTables] = useState<Set<number>>(new Set());

  const handleTableClick = (table: Table) => {
    // HER ZAMAN TEMİZ BAŞLANGIÇ: Sadece tıklanan masa görünür olsun
    setVisibleTables(new Set([table.id]));
    
    // Discovery animasyonu başlat
    setDiscoveredTables(new Set([table.id]));
    
    // Animasyonu 800ms sonra temizle
    setTimeout(() => {
      setDiscoveredTables(new Set());
    }, 800);
    
    // Ana tıklama fonksiyonunu çağır
    onTableClick(table);
  };

  const isTableVisible = (tableId: number) => {
    // Masanın görünürlüğü SADECE visibleTables set'ine göre belirlenir
    // Seçili masa ayrıcalığı yok - keşfedilmiş masalar görünür
    return visibleTables.has(tableId);
  };

  return (
    <div className="bg-gray-800/30 rounded-lg p-4 md:p-8">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* 3D Club Floor Plan Image */}
        <div className="relative">
          <div className="w-full rounded-lg border-2 border-gray-600 overflow-hidden bg-gray-900">
            {/* Aspect ratio container for the floor plan */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {/* KrokiMmbr needs position relative parent with defined dimensions */}
              <div className="absolute inset-0 w-full h-full">
                <KrokiMmbr />
              </div>
              
              {/* Interactive Table Areas - Initially Hidden */}
              {tables.map((table) => {
                const tableVisible = isTableVisible(table.id);
                const isOccupied = occupiedTables.includes(table.name);
                
                return (
                  <div
                    key={table.id}
                    className={`absolute cursor-pointer transition-all duration-500 transform rounded-lg border-2 ${
                      isOccupied 
                        ? 'bg-red-900/40 border-red-500 shadow-lg shadow-red-500/50 cursor-not-allowed opacity-60'
                        : tableVisible 
                          ? `neon-table ${getTableColor(table, selectedTable)} ${getTableGlow(table, selectedTable)}` 
                          : 'table-hidden'
                    } ${
                      hoveredTable?.id === table.id && tableVisible && !isOccupied ? 'scale-110 shadow-2xl brightness-125' : 'scale-100'
                    } ${
                      selectedTable?.id === table.id && tableVisible && !isOccupied ? 'ring-4 ring-primary ring-opacity-50 animate-pulse' : ''
                    } ${
                      !tableVisible && !isOccupied ? 'opacity-20 hover:opacity-60' : isOccupied ? 'opacity-60' : 'opacity-100'
                    } ${
                      discoveredTables.has(table.id) && tableVisible && !isOccupied ? 'table-discovered' : ''
                    }`}
                    style={{
                      left: `${(table.x / 1600) * 100}%`,
                      top: `${(table.y / 900) * 100}%`,
                      width: `${(table.width / 1600) * 100}%`,
                      height: `${(table.height / 900) * 100}%`,
                      minWidth: '28px',
                      minHeight: '28px',
                      touchAction: 'manipulation',
                      zIndex: selectedTable?.id === table.id ? 10 : 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOccupied) handleTableClick(table);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!isOccupied) handleTableClick(table);
                    }}
                    onMouseEnter={() => !isOccupied && tableVisible && onTableHover(table)}
                    onMouseLeave={() => !isOccupied && onTableHover(null)}
                  >
                    {/* Dolu masa işareti */}
                    {isOccupied && tableVisible && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-red-500 text-xs font-bold">{t('reservation.occupied')}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Hover Info Tooltip */}
          {hoveredTable && isTableVisible(hoveredTable.id) && (
            <div className="absolute top-4 right-4 bg-black/95 border border-primary rounded-lg p-4 min-w-[200px] z-20 shadow-2xl neon-tooltip">
              <h4 className="text-primary font-bold mb-2">{hoveredTable.name}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white capitalize">{hoveredTable.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capacity:</span>
                  <span className="text-white">{hoveredTable.capacity} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-[#CEAD81] font-bold">₺{hoveredTable.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={occupiedTables.includes(hoveredTable.name) ? 'text-red-400' : hoveredTable.isAvailable ? 'text-green-400' : 'text-red-400'}>
                    {occupiedTables.includes(hoveredTable.name) ? 'Rezerve Edilmiş' : hoveredTable.isAvailable ? 'Available' : 'Occupied'}
                  </span>
                </div>
              </div>
              {occupiedTables.includes(hoveredTable.name) && (
                <div className="mt-3 p-2 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-300">
                  ⚠️ Bu masa seçtiğiniz tarih ve saatte dolu
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2 text-center">
                Click for details
              </div>
            </div>
          )}

          {/* Selected Table Info - sadece görünür masalar için */}
          {selectedTable && isTableVisible(selectedTable.id) && (
            <div className="absolute bottom-4 left-4 bg-primary/90 border border-white/20 rounded-lg p-4 min-w-[200px] neon-selected">
              <h4 className="text-white font-bold text-lg mb-2">✓ {selectedTable.name} Selected</h4>
              <div className="space-y-1 text-sm text-white/90">
                <div>Type: {selectedTable.type.toUpperCase()}</div>
                <div>Capacity: {selectedTable.capacity} guests</div>
                <div>Price: <span className="text-[#CEAD81] font-bold">₺{selectedTable.price}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Discovery Progress and Instructions */}
        <div className="mt-6 text-center text-gray-400">
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <div className="flex items-center gap-2 bg-gray-800/30 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-yellow-500 rounded shadow-lg shadow-yellow-500/50"></div>
              <span className="text-sm">VIP: 2 masalar</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800/30 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-purple-500 rounded shadow-lg shadow-purple-500/50"></div>
              <span className="text-sm">Booth: 8 masalar</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800/30 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded shadow-lg shadow-blue-500/50"></div>
              <span className="text-sm">Regular: 18 masalar</span>
            </div>
          </div>
          
          {visibleTables.size === tables.length && (
            <div className="mt-4 p-3 bg-primary/20 border border-primary/30 rounded-lg inline-block animate-pulse">
              <span className="text-primary font-bold">🎉 Tüm masaları keşfettiniz!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}