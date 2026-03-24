import { projectId, publicAnonKey } from './supabase/info';
import { cleanEventImageUrls, cleanObjectImageUrls } from './urlBlocking';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-350bb6b2`;

class ApiService {
  private async basicFetch(url: string, config: RequestInit): Promise<Response> {
    // Ultra-simple fetch without any complex error handling or timeouts
    try {
      return await fetch(url, config);
    } catch (error: any) {
      // Network error - create a synthetic error response
      console.warn('⚠️ Network error detected - service may be temporarily unavailable');
      return new Response(JSON.stringify({ 
        error: 'Service temporarily unavailable',
        message: 'Cannot connect to server'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    };

    try {
      const response = await this.basicFetch(url, config);
      
      let data;
      try {
        const responseText = await response.text();
        
        // Check if response is HTML (Cloudflare error page)
        if (responseText && responseText.trim().startsWith('<!DOCTYPE')) {
          console.error('⚠️ Server returned HTML error page (Supabase may be down)');
          throw new Error('Server temporarily unavailable');
        }
        
        if (responseText) {
          data = JSON.parse(responseText);
        } else {
          data = {};
        }
      } catch (parseError) {
        console.error('Response parse error:', parseError);
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          return { error: 'Authentication failed', code: 401, needsReauth: true };
        }
        if (response.status === 503) {
          return { error: 'Service temporarily unavailable', code: 503, ...data };
        }
        return { error: data.message || 'Request failed', code: response.status, ...data };
      }
      
      return data;
    } catch (error: any) {
      console.error('Request failed:', error?.message);
      throw new Error(error?.message || 'Connection failed');
    }
  }

  private async requestWithAuth(endpoint: string, accessToken: string, options: RequestInit = {}) {
    if (!accessToken) {
      throw new Error('Access token required');
    }

    if (accessToken === publicAnonKey) {
      throw new Error('Invalid token type');
    }

    try {
      const result = await this.request(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (result.error && result.code === 401) {
        return { ...result, needsReauth: true };
      }

      return result;
    } catch (error: any) {
      return { 
        error: error.message || 'Request failed', 
        code: 500, 
        needsReauth: error.message?.includes('token') || error.message?.includes('auth') 
      };
    }
  }

  // Health check disabled
  async healthCheck() {
    return { status: 'ok', disabled: true, timestamp: Date.now() };
  }

  // Auth
  async signup(email: string, password: string, name: string, role: 'user' | 'admin' = 'user') {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  }

  // Reservations
  async saveReservation(reservationData: any, accessToken?: string) {
    const headers: any = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return this.request('/reservations', {
      method: 'POST',
      headers,
      body: JSON.stringify(reservationData),
    });
  }

  async getOccupiedTables(date: string, time: string) {
    return this.request('/reservations/occupied-tables', {
      method: 'POST',
      body: JSON.stringify({ date, time }),
    });
  }

  async getMyReservations(accessToken: string) {
    try {
      const result = await this.requestWithAuth('/reservations/my', accessToken);
      return result.error ? { error: result.error, reservations: [] } : result;
    } catch (error: any) {
      return { error: 'Failed to load reservations', reservations: [] };
    }
  }

  async getReservations(accessToken: string) {
    try {
      const result = await this.requestWithAuth('/reservations', accessToken);
      return result.error ? { error: result.error, reservations: [] } : result;
    } catch (error: any) {
      return { error: 'Failed to load reservations', reservations: [] };
    }
  }

  async getAllReservations(accessToken: string) {
    return this.getReservations(accessToken);
  }

  async updateReservationStatus(reservationId: string, status: string, accessToken: string) {
    return this.requestWithAuth(`/reservations/${reservationId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteReservation(reservationId: string, accessToken: string) {
    return this.requestWithAuth(`/reservations/${reservationId}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Messages
  async saveMessage(messageData: any) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getMessages(accessToken: string) {
    try {
      const result = await this.requestWithAuth('/messages', accessToken);
      return result.error ? { error: result.error, messages: [] } : result;
    } catch (error: any) {
      return { error: 'Failed to load messages', messages: [] };
    }
  }

  async getMyMessages(accessToken: string) {
    try {
      const result = await this.requestWithAuth('/messages/my', accessToken);
      return result.error ? { error: result.error, messages: [] } : result;
    } catch (error: any) {
      return { error: 'Failed to load messages', messages: [] };
    }
  }

  async updateMessageStatus(messageId: string, status: string, accessToken: string) {
    return this.requestWithAuth(`/messages/${messageId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Memberships
  async saveMembership(membershipData: any) {
    return this.request('/memberships', {
      method: 'POST',
      body: JSON.stringify(membershipData),
    });
  }

  async getMemberships(accessToken: string) {
    return this.requestWithAuth('/memberships', accessToken);
  }

  async updateMembershipStatus(membershipId: string, status: string, accessToken: string) {
    return this.requestWithAuth(`/memberships/${membershipId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async validateReferenceCode(membershipId: string, referenceCode: string, accessToken: string) {
    return this.requestWithAuth(`/memberships/${membershipId}/validate-reference`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ referenceCode }),
    });
  }

  // Events
  async getEvents() {
    try {
      const response = await this.request('/events');
      
      // If the response has an error, return empty events array with error info
      if (response && response.error) {
        // Suppress duplicate console logs - error already logged in request method
        return { events: [], error: response.error, offline: true };
      }
      
      if (response && response.events) {
        response.events = cleanEventImageUrls(response.events);
      }
      
      return response || { events: [] };
    } catch (error: any) {
      console.error('Exception in getEvents:', error);
      return { events: [], error: error.message };
    }
  }

  async saveEvent(eventData: any, accessToken: string) {
    const cleanedEventData = cleanObjectImageUrls(eventData);
    return this.requestWithAuth('/events', accessToken, {
      method: 'POST',
      body: JSON.stringify(cleanedEventData),
    });
  }

  async deleteEvent(eventId: string, accessToken: string) {
    return this.requestWithAuth(`/events/${eventId}`, accessToken, {
      method: 'DELETE',
    });
  }

  async uploadEventImage(file: File, accessToken: string) {
    const formData = new FormData();
    formData.append('image', file);
    
    const url = `${API_BASE}/events/upload-image`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });
      
      let data;
      try {
        const responseText = await response.text();
        if (responseText) {
          data = JSON.parse(responseText);
        } else {
          data = {};
        }
      } catch {
        throw new Error('Invalid response');
      }
      
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('File too large');
        } else if (response.status === 415) {
          throw new Error('Unsupported file type');
        } else if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        return { error: data.message || 'Upload failed', code: response.status };
      }
      
      return cleanObjectImageUrls(data);
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Upload failed');
      }
      throw error;
    }
  }

  // Test admin credentials
  async testAdminCredentials(email: string, password: string) {
    return this.request('/auth/test-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Debug functions
  async cleanInvalidImages(accessToken: string) {
    return this.requestWithAuth('/debug/clean-invalid-images', accessToken, {
      method: 'POST',
    });
  }

  async forceCleanupAll(accessToken: string) {
    return this.requestWithAuth('/debug/force-cleanup-all', accessToken, {
      method: 'POST',
    });
  }

  async debugEvents(accessToken?: string) {
    const response = accessToken 
      ? await this.requestWithAuth('/debug/events', accessToken)
      : await this.request('/debug/events');
    
    if (response && response.events) {
      response.events = cleanEventImageUrls(response.events);
    }
    
    return response;
  }

  async debugStorage(accessToken: string) {
    return this.requestWithAuth('/debug/storage', accessToken);
  }

  // Membership Plans
  async getMembershipPlans() {
    return this.request('/membership-plans');
  }

  async updateMembershipPlans(accessToken: string, plans: any[]) {
    return this.requestWithAuth('/membership-plans', accessToken, {
      method: 'PUT',
      body: JSON.stringify({ plans }),
    });
  }

  // Table Management
  async getTables() {
    return this.request('/table-management');
  }

  async updateTables(accessToken: string, tables: any[]) {
    return this.requestWithAuth('/table-management', accessToken, {
      method: 'PUT',
      body: JSON.stringify({ tables }),
    });
  }

  // Admin Management
  async getAdmins(accessToken: string) {
    return this.requestWithAuth('/admins', accessToken);
  }

  async createAdmin(accessToken: string, adminData: { email: string; password: string; name: string }) {
    return this.requestWithAuth('/admins', accessToken, {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  }

  async updateAdmin(accessToken: string, adminId: string, adminData: { email?: string; password?: string; name?: string }) {
    return this.requestWithAuth(`/admins/${adminId}`, accessToken, {
      method: 'PUT',
      body: JSON.stringify(adminData),
    });
  }

  async deleteAdmin(accessToken: string, adminId: string) {
    return this.requestWithAuth(`/admins/${adminId}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Site Settings
  async getSiteSettings() {
    return this.request('/site-settings');
  }

  async updateSiteSettings(accessToken: string, settings: Record<string, any>) {
    return this.requestWithAuth('/site-settings', accessToken, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Site Content
  async getSiteContent() {
    return this.request('/site-content');
  }

  async updateSiteContent(accessToken: string, content: Record<string, any>) {
    return this.requestWithAuth('/site-content', accessToken, {
      method: 'PUT',
      body: JSON.stringify(content),
    });
  }

  async uploadSiteImage(file: File, accessToken: string, section: string = 'general') {
    const url = `${API_BASE}/upload-site-image`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('section', section);

    try {
      const response = await this.basicFetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response');
      }

      if (!response.ok) {
        if (response.status === 401) return { error: 'Authentication failed', code: 401, needsReauth: true };
        return { error: data.message || data.error || 'Upload failed', code: response.status };
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  }

  // ---- Ödeme ----

  async createPaymentCheckout(params: {
    amount: number;
    paymentType: 'reservation' | 'membership' | 'event';
    referenceId?: string;
    description: string;
    buyerInfo: {
      name: string;
      email: string;
      phone?: string;
      userId?: string;
      address?: string;
      city?: string;
    };
  }): Promise<{ token: string; checkoutFormContent: string; conversationId: string; error?: string }> {
    return this.request('/payments/create-checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPaymentStatus(conversationId: string): Promise<{
    status: string; payment_type: string; amount: number; error?: string;
  }> {
    const url = `${API_BASE}/payments/status/${conversationId}`;
    const res = await this.basicFetch(url, { method: 'GET', headers: {} });
    return res.json();
  }
}

export const apiService = new ApiService();