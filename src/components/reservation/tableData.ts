export interface Table {
  id: number;
  name: string;
  capacity: number;
  price: number;
  x: number; // Position on 1600px width (from ellipse cx)
  y: number; // Position on 900px height (from ellipse cy)
  width: number;
  height: number;
  isAvailable: boolean;
  type: 'vip' | 'regular' | 'booth' | 'loca';
}

export const timeSlots = [
  '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00'
];

// Masa pozisyonları SVG ellipse elementlerinin cx, cy koordinatlarına göre ayarlanmıştır
// SVG viewBox: 1600x900
// rx, ry değerleri masanın genişlik/yükseklik yarıçapıdır
export const tables: Table[] = [
  // VIP Masalar (V01, V02) - 2 adet
  { 
    id: 1, 
    name: 'VIP-1', 
    capacity: 8, 
    price: 3000, 
    x: 1182 - 40, // cx - offset for clickable area
    y: 670 - 40, 
    width: 80, // rx * 2 with padding
    height: 80, 
    isAvailable: true, 
    type: 'vip' 
  },
  { 
    id: 2, 
    name: 'VIP-2', 
    capacity: 8, 
    price: 3000, 
    x: 795 - 40, 
    y: 310 - 40, 
    width: 80, 
    height: 80, 
    isAvailable: true, 
    type: 'vip' 
  },

  // S Masaları (S01-S08) - Sofa/Side Tables - 8 adet
  { id: 3, name: 'S-1', capacity: 6, price: 2000, x: 187 - 35, y: 375.5 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },
  { id: 4, name: 'S-2', capacity: 6, price: 2000, x: 266.5 - 35, y: 329.5 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },
  { id: 5, name: 'S-3', capacity: 6, price: 2000, x: 343 - 35, y: 285.5 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },
  { id: 6, name: 'S-4', capacity: 6, price: 2000, x: 422.5 - 35, y: 240 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },
  { id: 7, name: 'S-5', capacity: 6, price: 2000, x: 257 - 35, y: 401 - 35, width: 70, height: 70, isAvailable: false, type: 'booth' },
  { id: 8, name: 'S-6', capacity: 6, price: 2000, x: 336 - 35, y: 355 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },
  { id: 9, name: 'S-7', capacity: 6, price: 2000, x: 413 - 35, y: 311 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },
  { id: 10, name: 'S-8', capacity: 6, price: 2000, x: 492 - 35, y: 265 - 35, width: 70, height: 70, isAvailable: true, type: 'booth' },

  // T Masaları (T01-T18) - Normal Tables - 18 adet
  { id: 11, name: 'T-1', capacity: 4, price: 800, x: 648.5 - 30, y: 341 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 12, name: 'T-2', capacity: 4, price: 800, x: 569 - 30, y: 387 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 13, name: 'T-3', capacity: 4, price: 800, x: 493 - 30, y: 431 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 14, name: 'T-4', capacity: 4, price: 800, x: 413 - 30, y: 477 - 30, width: 60, height: 60, isAvailable: false, type: 'regular' },
  
  { id: 15, name: 'T-5', capacity: 4, price: 800, x: 760 - 30, y: 382 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 16, name: 'T-6', capacity: 4, price: 800, x: 681 - 30, y: 428 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 17, name: 'T-7', capacity: 4, price: 800, x: 604 - 30, y: 472 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 18, name: 'T-8', capacity: 4, price: 800, x: 525 - 30, y: 518 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  
  { id: 19, name: 'T-9', capacity: 4, price: 800, x: 881 - 30, y: 426 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 20, name: 'T-10', capacity: 4, price: 800, x: 802 - 30, y: 472 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 21, name: 'T-11', capacity: 4, price: 800, x: 725 - 30, y: 516 - 30, width: 60, height: 60, isAvailable: false, type: 'regular' },
  { id: 22, name: 'T-12', capacity: 4, price: 800, x: 646 - 30, y: 562 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  
  { id: 23, name: 'T-13', capacity: 4, price: 800, x: 978 - 30, y: 461 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 24, name: 'T-14', capacity: 4, price: 800, x: 899 - 30, y: 507 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 25, name: 'T-15', capacity: 4, price: 800, x: 821 - 30, y: 551 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  
  { id: 26, name: 'T-16', capacity: 4, price: 800, x: 1081 - 30, y: 499 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 27, name: 'T-17', capacity: 4, price: 800, x: 1001 - 30, y: 545 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
  { id: 28, name: 'T-18', capacity: 4, price: 800, x: 926 - 30, y: 590 - 30, width: 60, height: 60, isAvailable: true, type: 'regular' },
];

export const getTableColor = (table: Table, selectedTable: Table | null) => {
  if (!table.isAvailable) {
    return 'bg-red-500/80 border-red-400';
  }
  
  if (selectedTable?.id === table.id) {
    return 'bg-primary/90 border-primary';
  }
  
  switch (table.type) {
    case 'vip':
      return 'bg-yellow-500/80 border-yellow-400';
    case 'booth':
      return 'bg-purple-500/80 border-purple-400';
    case 'loca':
      return 'bg-gradient-to-br from-amber-400/90 to-orange-500/90 border-amber-300';
    default:
      return 'bg-blue-500/80 border-blue-400';
  }
};

export const getTableGlow = (table: Table, selectedTable: Table | null) => {
  if (!table.isAvailable) {
    return 'shadow-red-500/50';
  }
  
  if (selectedTable?.id === table.id) {
    return 'shadow-primary/50';
  }
  
  switch (table.type) {
    case 'vip':
      return 'shadow-yellow-500/50';
    case 'booth':
      return 'shadow-purple-500/50';
    case 'loca':
      return 'shadow-amber-400/60';
    default:
      return 'shadow-blue-500/50';
  }
};
