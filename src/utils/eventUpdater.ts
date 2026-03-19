// Event Update Notification System
// Admin panelinde yapılan değişiklikleri EventsSection'a bildirir

type EventUpdateListener = (events?: any[]) => void;

class EventUpdateManager {
  private listeners: EventUpdateListener[] = [];

  // Listener ekle
  addListener(listener: EventUpdateListener): void {
    this.listeners.push(listener);
  }

  // Listener kaldır
  removeListener(listener: EventUpdateListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Subscribe method for compatibility
  subscribe(listener: EventUpdateListener): () => void {
    this.addListener(listener);
    return () => this.removeListener(listener);
  }

  // Tüm listenerlara güncelleme bildir
  notifyUpdate(events?: any[]): void {
    console.log('🔔 Event update notification sent to', this.listeners.length, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener(events);
      } catch (error) {
        console.error('Error in event update listener:', error);
      }
    });
  }

  // Window focus event ile otomatik yenileme
  setupWindowFocusListener(): void {
    window.addEventListener('focus', () => {
      console.log('🪟 Window focus detected, triggering event refresh');
      this.notifyUpdate();
    });
  }

  // Storage event ile tab'ler arası senkronizasyon
  setupCrossTabSync(): void {
    // Admin panelden güncelleme sinyali gönder
    window.addEventListener('storage', (e) => {
      if (e.key === 'mmbr-events-updated' && e.newValue === 'true') {
        console.log('🔄 Cross-tab event update detected');
        this.notifyUpdate();
        // Sinyali temizle
        localStorage.removeItem('mmbr-events-updated');
      }
    });
  }

  // Admin panelinden güncelleme sinyali gönder
  broadcastUpdate(): void {
    console.log('📡 Broadcasting event update to other tabs');
    localStorage.setItem('mmbr-events-updated', 'true');
    // Kendi tab'inde de güncelle
    this.notifyUpdate();
  }
}

export const eventUpdateManager = new EventUpdateManager();

// Initialize listeners
eventUpdateManager.setupWindowFocusListener();
eventUpdateManager.setupCrossTabSync();