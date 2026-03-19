import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Upload, X, Eye, Check, AlertCircle, Phone, Mail, User, CreditCard, Crown, RefreshCw, Zap, ImageIcon, Globe, FileText, Image as ImageIconLucide, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { eventUpdateManager } from '../utils/eventUpdater';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

interface Event {
  id?: string;
  title: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  price: string;
  description: string;
  detailedDescription: string;
  artist: string;
  genre: string;
  duration: string;
  image: string;
}

interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  // Masa bilgisi
  table?: {
    name: string;
    type: string;
    capacity: number;
    price: number;
  };
  // Etkinlik bilgisi (eğer etkinlikten rezervasyon yapıldıysa)
  eventInfo?: {
    eventId?: number;
    eventTitle?: string;
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
  };
}

interface Message {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'pending' | 'read' | 'replied';
  created_at: string;
}

interface Membership {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagramProfile?: string;
  referenceCode?: string;
  plan: 'bronze' | 'silver' | 'gold';
  birthDate: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, signOut, getAccessToken, refreshToken, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'reservations' | 'messages' | 'memberships' | 'plans' | 'tables' | 'admins' | 'settings' | 'content'>('events');
  const [siteSettings, setSiteSettings] = useState<{ generalEntryVisible: boolean }>({ generalEntryVisible: false });
  const [siteContent, setSiteContent] = useState<any>({
    hero: { image: '' },
    about: { desc1Tr: '', desc1En: '', desc2Tr: '', desc2En: '', desc3Tr: '', desc3En: '', image: '' },
    contact: { address: '', phone: '', email: '', instagram: '', facebook: '', mapUrl: '' },
    hours: { fridayTime: '', saturdayTime: '' },
    rules: { rule1Tr: '', rule1En: '', rule2Tr: '', rule2En: '', rule3Tr: '', rule3En: '', rule4Tr: '', rule4En: '', rule5Tr: '', rule5En: '' }
  });
  const [savingContent, setSavingContent] = useState(false);
  const [uploadingSiteImage, setUploadingSiteImage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ hero: true, about: false, contact: false, hours: false, rules: false });
  const [savingSettings, setSavingSettings] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true); // Auth kontrolü için loading
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageValidationError, setImageValidationError] = useState<string>('');

  const [eventForm, setEventForm] = useState<Event>({
    title: '',
    date: '',
    time: '23:00', // Varsayılan saat
    location: 'MMBR Ana Salon', // Varsayılan konum
    capacity: 500, // Varsayılan kapasite
    price: '',
    description: '',
    detailedDescription: '',
    artist: '',
    genre: 'Live Music', // Varsayılan tür
    duration: '5 Saat', // Varsayılan süre
    image: ''
  });

  // İlk yüklemede auth kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      await refreshUser();
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.app_metadata?.role === 'admin') {
      loadData();
    }
  }, [user]);

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (user.app_metadata?.role !== 'admin') {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleAuthError = async (error: any) => {
    if (error.needsReauth || error.code === 401) {
      console.log('🔄 Authentication error, attempting token refresh...');
      try {
        const newToken = await refreshToken();
        if (newToken) {
          console.log('✅ Token refreshed successfully, retrying operation...');
          return true; // Indicate that a retry should be attempted
        } else {
          console.log('❌ Token refresh failed, signing out...');
          toast.error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          await signOut();
          return false;
        }
      } catch (refreshError) {
        console.error('💥 Token refresh error:', refreshError);
        toast.error('Oturum yenilenemedi. Lütfen tekrar giriş yapın.');
        await signOut();
        return false;
      }
    }
    return false;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEvents(),
        loadReservations(),
        loadMessages(),
        loadMemberships(),
        loadMembershipPlans(),
        loadTables(),
        loadAdmins(),
        loadSiteSettings(),
        loadSiteContent()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await apiService.getEvents();
      if (response.error) {
        console.error('Error loading events:', response.error);
      } else {
        console.log('=== Events Loaded ===');
        console.log('Total events:', response.events?.length || 0);
        response.events?.forEach((event: Event, index: number) => {
          console.log(`Event ${index + 1}: ${event.title}`);
          console.log(`  - Image exists: ${!!event.image}`);
          console.log(`  - Image length: ${event.image?.length || 0}`);
          console.log(`  - Image preview (first 100 chars): ${event.image?.substring(0, 100) || 'N/A'}`);
        });
        setEvents(response.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadReservations = async (retryCount = 0) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('No access token available for reservations');
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.getReservations(accessToken);
      if (response.error) {
        if (response.needsReauth && retryCount === 0) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            return loadReservations(1); // Retry once
          }
        } else {
          console.error('Error loading reservations:', response.error);
          toast.error('Rezervasyonlar yüklenirken hata oluştu: ' + response.error);
        }
      } else {
        setReservations(response.reservations || []);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Rezervasyonlar yüklenirken hata oluştu');
    }
  };

  const loadMessages = async (retryCount = 0) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('No access token available for messages');
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.getMessages(accessToken);
      if (response.error) {
        if (response.needsReauth && retryCount === 0) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            return loadMessages(1); // Retry once
          }
        } else {
          console.error('Error loading messages:', response.error);
          toast.error('Mesajlar yüklenirken hata oluştu: ' + response.error);
        }
      } else {
        setMessages(response.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Mesajlar yüklenirken hata oluştu');
    }
  };

  const loadMemberships = async (retryCount = 0) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('No access token available for memberships');
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.getMemberships(accessToken);
      if (response.error) {
        if (response.needsReauth && retryCount === 0) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            return loadMemberships(1); // Retry once
          }
        } else {
          console.error('Error loading memberships:', response.error);
          toast.error('Üyelikler yüklenirken hata oluştu: ' + response.error);
        }
      } else {
        setMemberships(response.memberships || []);
      }
    } catch (error) {
      console.error('Error loading memberships:', error);
      toast.error('Üyelikler yüklenirken hata oluştu');
    }
  };

  const loadMembershipPlans = async () => {
    try {
      const response = await apiService.getMembershipPlans();
      if (response.error) {
        console.error('Error loading membership plans:', response.error);
        toast.error('Üyelik planları yüklenirken hata oluştu');
      } else {
        setMembershipPlans(response.plans || []);
      }
    } catch (error) {
      console.error('Error loading membership plans:', error);
      toast.error('Üyelik planları yüklenirken hata oluştu');
    }
  };

  const loadTables = async () => {
    try {
      const response = await apiService.getTables();
      if (response.error) {
        console.error('Error loading tables:', response.error);
        toast.error('Masalar yüklenirken hata oluştu');
      } else {
        setTables(response.tables || []);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Masalar yüklenirken hata oluştu');
    }
  };

  const loadAdmins = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await apiService.getAdmins(accessToken);
      if (response.error) {
        console.error('Error loading admins:', response.error);
        toast.error('Admin listesi yüklenirken hata oluştu');
      } else {
        setAdmins(response.admins || []);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
      toast.error('Admin listesi yüklenirken hata oluştu');
    }
  };

  const loadSiteSettings = async () => {
    try {
      const response = await apiService.getSiteSettings();
      if (response.settings) {
        setSiteSettings(response.settings);
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
    }
  };

  const loadSiteContent = async () => {
    try {
      const response = await apiService.getSiteContent();
      if (response.content) {
        setSiteContent((prev: any) => ({
          ...prev,
          ...response.content,
          hero: { ...prev.hero, ...response.content.hero },
          about: { ...prev.about, ...response.content.about },
          contact: { ...prev.contact, ...response.content.contact },
          hours: { ...prev.hours, ...response.content.hours },
          rules: { ...prev.rules, ...response.content.rules },
        }));
      }
    } catch (error) {
      console.error('Error loading site content:', error);
    }
  };

  const handleSaveSiteContent = async () => {
    setSavingContent(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }
      const response = await apiService.updateSiteContent(accessToken, siteContent);
      if (response.error) {
        toast.error('Site içeriği kaydedilemedi: ' + response.error);
      } else {
        toast.success('Site içeriği başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Error saving site content:', error);
      toast.error('Site içeriği kaydedilirken hata oluştu');
    } finally {
      setSavingContent(false);
    }
  };

  const handleSiteImageUpload = async (file: File, section: string, field: string) => {
    if (!file) return;
    setUploadingSiteImage(`${section}.${field}`);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }
      const response = await apiService.uploadSiteImage(file, accessToken, section);
      if (response.error) {
        toast.error('Görsel yüklenirken hata oluştu: ' + response.error);
      } else {
        setSiteContent((prev: any) => ({
          ...prev,
          [section]: { ...prev[section], [field]: response.imageUrl }
        }));
        toast.success('Görsel başarıyla yüklendi');
      }
    } catch (error) {
      console.error('Site image upload error:', error);
      toast.error('Görsel yüklenirken hata oluştu');
    } finally {
      setUploadingSiteImage(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSaveSiteSettings = async () => {
    setSavingSettings(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }
      const response = await apiService.updateSiteSettings(accessToken, siteSettings);
      if (response.error) {
        toast.error('Site ayarları kaydedilemedi: ' + response.error);
      } else {
        toast.success('Site ayarları başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Error saving site settings:', error);
      toast.error('Site ayarları kaydedilirken hata oluştu');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMembershipPlans = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }

      const response = await apiService.updateMembershipPlans(accessToken, membershipPlans);
      if (response.error) {
        toast.error('Üyelik planları kaydedilemedi: ' + response.error);
      } else {
        toast.success('Üyelik planları başarıyla güncellendi');
        setEditingPlan(null);
        await loadMembershipPlans();
      }
    } catch (error) {
      console.error('Error saving membership plans:', error);
      toast.error('Üyelik planları kaydedilemedi');
    }
  };

  const handleSaveTables = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }

      const response = await apiService.updateTables(accessToken, tables);
      if (response.error) {
        toast.error('Masalar kaydedilemedi: ' + response.error);
      } else {
        toast.success('Masa bilgileri başarıyla güncellendi');
        setEditingTable(null);
        await loadTables();
      }
    } catch (error) {
      console.error('Error saving membership plans:', error);
      toast.error('Üyelik planları kaydedilirken hata oluştu');
    }
  };

  const handleAddAdmin = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }

      if (!newAdmin.email || !newAdmin.password || !newAdmin.name) {
        toast.error('Lütfen tüm alanları doldurun');
        return;
      }

      const response = await apiService.createAdmin(accessToken, newAdmin);
      if (response.error) {
        toast.error('Admin eklenemedi: ' + response.error);
      } else {
        toast.success('Admin başarıyla eklendi');
        setShowAddAdminModal(false);
        setNewAdmin({ email: '', password: '', name: '' });
        await loadAdmins();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Admin eklenirken hata oluştu');
    }
  };

  const handleUpdateAdmin = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }

      if (!editingAdmin.email || !editingAdmin.name) {
        toast.error('Email ve isim gereklidir');
        return;
      }

      const updateData: any = {
        email: editingAdmin.email,
        name: editingAdmin.name,
      };

      // Only include password if it's been changed
      if (editingAdmin.newPassword) {
        updateData.password = editingAdmin.newPassword;
      }

      const response = await apiService.updateAdmin(accessToken, editingAdmin.id, updateData);
      if (response.error) {
        toast.error('Admin güncellenemedi: ' + response.error);
      } else {
        toast.success('Admin başarıyla güncellendi');
        setEditingAdmin(null);
        await loadAdmins();
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Admin güncellenirken hata oluştu');
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Bu admin kullanıcısını silmek istediğinizden emin misiniz?')) return;

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası');
        return;
      }

      const response = await apiService.deleteAdmin(accessToken, adminId);
      if (response.error) {
        toast.error('Admin silinemedi: ' + response.error);
      } else {
        toast.success('Admin başarıyla silindi');
        await loadAdmins();
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Admin silinirken hata oluştu');
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setImageValidationError('');
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const eventData = {
        ...eventForm
      };

      console.log('=== Saving Event Data ===');
      console.log('Event Title:', eventData.title);
      console.log('Event Image (first 100 chars):', eventData.image?.substring(0, 100));
      console.log('Event Image exists:', !!eventData.image);
      console.log('Event Image length:', eventData.image?.length);

      const response = await apiService.saveEvent(eventData, accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            // Retry the operation
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.saveEvent(eventData, newToken);
              if (retryResponse.error) {
                toast.error('Etkinlik kaydedilirken hata oluştu: ' + retryResponse.error);
                return;
              }
            }
          }
        } else {
          toast.error('Etkinlik kaydedilirken hata oluştu: ' + response.error);
          return;
        }
      }
      
      toast.success(editingEvent ? 'Etkinlik güncellendi' : 'Etkinlik oluşturuldu');
      setShowEventModal(false);
      resetEventForm();
      loadEvents();
      
      // Notify EventsSection about the update
      eventUpdateManager.broadcastUpdate();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Etkinlik kaydedilirken hata oluştu');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    console.log('🖼️ === IMAGE UPLOAD STARTED ===');
    console.log('📄 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB',
      sizeMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    setUploadingImage(true);
    setImageValidationError('');
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('❌ No access token available');
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      console.log('🔑 Access token obtained, sending upload request...');
      const response = await apiService.uploadEventImage(file, accessToken);
      
      if (response.error) {
        console.error('❌ Upload failed with error:', response.error);
        console.error('Error details:', response);
        
        if (response.needsReauth || response.code === 401) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              console.log('🔄 Retrying upload with new token...');
              const retryResponse = await apiService.uploadEventImage(file, newToken);
              if (retryResponse.error) {
                console.error('❌ Retry failed:', retryResponse.error);
                toast.error('Görsel yüklenirken hata oluştu: ' + retryResponse.error);
                return;
              } else {
                console.log('✅ Retry successful!');
                console.log('🔗 Image URL:', retryResponse.imageUrl);
                setEventForm(prev => ({ ...prev, image: retryResponse.imageUrl }));
                setImagePreview(retryResponse.imageUrl);
                toast.success('Görsel başarıyla yüklendi');
                return;
              }
            }
          }
        } else {
          toast.error('Görsel yüklenirken hata oluştu: ' + response.error);
        }
      } else {
        console.log('✅ === IMAGE UPLOAD SUCCESS ===');
        console.log('🔗 Image URL (full):', response.imageUrl);
        console.log('📏 URL length:', response.imageUrl?.length);
        console.log('📁 File name:', response.fileName);
        console.log('🔐 URL type:', response.urlType || 'unknown');
        console.log('⏰ Expires in:', response.expiresIn || 'unknown');
        console.log('📋 Full response:', response);
        
        setEventForm(prev => ({ ...prev, image: response.imageUrl }));
        setImagePreview(response.imageUrl);
        console.log('✅ Form state updated with new image URL');
        console.log('✅ Preview state updated');
        toast.success('Görsel başarıyla yüklendi');
      }
    } catch (error) {
      console.error('💥 === IMAGE UPLOAD EXCEPTION ===');
      console.error('Exception details:', error);
      toast.error('Görsel yüklenirken hata oluştu');
    } finally {
      setUploadingImage(false);
      console.log('🏁 Upload process completed');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm(event);
    setImagePreview(event.image);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.deleteEvent(eventId, accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.deleteEvent(eventId, newToken);
              if (retryResponse.error) {
                toast.error('Etkinlik silinirken hata oluştu: ' + retryResponse.error);
                return;
              }
            }
          }
        } else {
          toast.error('Etkinlik silinirken hata oluştu: ' + response.error);
          return;
        }
      }
      
      toast.success('Etkinlik silindi');
      loadEvents();
      
      // Notify EventsSection about the deletion
      eventUpdateManager.broadcastUpdate();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Etkinlik silinirken hata oluştu');
    }
  };

  const handleReservationStatusUpdate = async (reservationId: string, status: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.updateReservationStatus(reservationId, status, accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.updateReservationStatus(reservationId, status, newToken);
              if (retryResponse.error) {
                toast.error('Rezervasyon durumu güncellenirken hata oluştu: ' + retryResponse.error);
                return;
              }
            }
          }
        } else {
          toast.error('Rezervasyon durumu güncellenirken hata oluştu: ' + response.error);
          return;
        }
      }
      
      toast.success('Rezervasyon durumu güncellendi');
      loadReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      toast.error('Rezervasyon durumu güncellenirken hata oluştu');
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    if (!confirm('Bu rezervasyonu kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.deleteReservation(reservationId, accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.deleteReservation(reservationId, newToken);
              if (retryResponse.error) {
                toast.error('Rezervasyon silinirken hata oluştu: ' + retryResponse.error);
                return;
              }
            }
          }
        } else {
          toast.error('Rezervasyon silinirken hata oluştu: ' + response.error);
          return;
        }
      }
      
      toast.success('Rezervasyon silindi');
      loadReservations();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Rezervasyon silinirken hata oluştu');
    }
  };

  const handleMessageStatusUpdate = async (messageId: string, status: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.updateMessageStatus(messageId, status, accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.updateMessageStatus(messageId, status, newToken);
              if (retryResponse.error) {
                toast.error('Mesaj durumu güncellenirken hata oluştu: ' + retryResponse.error);
                return;
              }
            }
          }
        } else {
          toast.error('Mesaj durumu güncellenirken hata oluştu: ' + response.error);
          return;
        }
      }
      
      toast.success('Mesaj durumu güncellendi');
      loadMessages();
    } catch (error) {
      console.error('Error updating message status:', error);
      toast.error('Mesaj durumu güncellenirken hata oluştu');
    }
  };

  const handleMembershipStatusUpdate = async (membershipId: string, status: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.updateMembershipStatus(membershipId, status, accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.updateMembershipStatus(membershipId, status, newToken);
              if (retryResponse.error) {
                toast.error('Üyelik durumu güncellenirken hata oluştu: ' + retryResponse.error);
                return;
              }
            }
          }
        } else {
          toast.error('Üyelik durumu güncellenirken hata oluştu: ' + response.error);
          return;
        }
      }
      
      toast.success('Üyelik durumu güncellendi');
      loadMemberships();
    } catch (error) {
      console.error('Error updating membership status:', error);
      toast.error('Üyelik durumu güncellenirken hata oluştu');
    }
  };

  const handleReferenceCodeValidation = async (membershipId: string, referenceCode: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Basit referans kodu doğrulama mantığı
      const validReferenceCodes = ['MMBR2024', 'VIP2024', 'GOLD2024', 'FRIEND50', 'SPECIAL30'];
      
      if (validReferenceCodes.includes(referenceCode.toUpperCase())) {
        toast.success(`Referans kodu "${referenceCode}" doğrulandı! ✅`);
        
        // Referans kodunun doğrulandığını API'ye bildir
        const response = await apiService.validateReferenceCode(membershipId, referenceCode, accessToken);
        
        if (response.error) {
          toast.error('Referans kodu kaydedilirken hata oluştu: ' + response.error);
        } else {
          toast.success('Referans kodu başarıyla kaydedildi');
          loadMemberships(); // Listeyi yenile
        }
      } else {
        toast.error(`Referans kodu "${referenceCode}" geçerli değil! ❌`);
      }
    } catch (error) {
      console.error('Error validating reference code:', error);
      toast.error('Referans kodu doğrulanırken hata oluştu');
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      date: '',
      time: '23:00', // Varsayılan saat
      location: 'MMBR Ana Salon', // Varsayılan konum
      capacity: 500, // Varsayılan kapasite
      price: '',
      description: '',
      detailedDescription: '',
      artist: '',
      genre: 'Live Music', // Varsayılan tür
      duration: '5 Saat', // Varsayılan süre
      image: ''
    });
    setEditingEvent(null);
    setImagePreview('');
    setImageValidationError('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Clean invalid images function
  const handleCleanInvalidImages = async () => {
    if (!confirm('Invalid image URL\'leri temizlemek istediğinizden emin misiniz?')) return;
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await apiService.cleanInvalidImages(accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.cleanInvalidImages(newToken);
              if (retryResponse.error) {
                toast.error('Image temizleme hatası: ' + retryResponse.error);
                return;
              } else {
                toast.success(`${retryResponse.cleanedCount} invalid image URL temizlendi`);
                loadEvents();
                
                // Notify EventsSection about the cleanup
                eventUpdateManager.broadcastUpdate();
                return;
              }
            }
          }
        } else {
          toast.error('Image temizleme hatası: ' + response.error);
        }
      } else {
        toast.success(`${response.cleanedCount} invalid image URL temizlendi`);
        loadEvents(); // Reload events to show updated images
        
        // Notify EventsSection about the cleanup
        eventUpdateManager.broadcastUpdate();
      }
    } catch (error) {
      console.error('Error cleaning invalid images:', error);
      toast.error('Image temizleme sırasında hata oluştu');
    }
  };

  // Force cleanup all images function
  const handleForceCleanupAll = async () => {
    if (!confirm('TÜM ETKİNLİKLERDEKİ invalid image URL\'leri zorla temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error('Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.');
        return;
      }
      
      toast.info('Zorla temizleme başlatılıyor...');
      
      const response = await apiService.forceCleanupAll(accessToken);
      
      if (response.error) {
        if (response.needsReauth) {
          const shouldRetry = await handleAuthError(response);
          if (shouldRetry) {
            const newToken = await getAccessToken();
            if (newToken) {
              const retryResponse = await apiService.forceCleanupAll(newToken);
              if (retryResponse.error) {
                toast.error('Zorla temizleme hatası: ' + retryResponse.error);
                return;
              } else {
                toast.success(`Zorla temizleme tamamlandı! ${retryResponse.processedCount} etkinlik işlendi`);
                loadEvents();
                
                // Notify EventsSection about the force cleanup
                eventUpdateManager.broadcastUpdate();
                return;
              }
            }
          }
        } else {
          toast.error('Zorla temizleme hatası: ' + response.error);
        }
      } else {
        toast.success(`Zorla temizleme tamamlandı! ${response.processedCount} etkinlik işlendi`);
        loadEvents(); // Reload events to show updated images
        
        // Notify EventsSection about the force cleanup
        eventUpdateManager.broadcastUpdate();
      }
    } catch (error) {
      console.error('Error in force cleanup:', error);
      toast.error('Zorla temizleme sırasında hata oluştu');
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setLoading(true);
    toast.info('Veriler yenileniyor...');
    await loadData();
    toast.success('Veriler başarıyla yenilendi');
    
    // Notify other components about the manual refresh
    eventUpdateManager.broadcastUpdate();
  };

  // Sign out and redirect to home
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Auth yüklenirken loading göster
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Giriş Yapın</h1>
          <p className="text-gray-400">Admin paneline erişim için giriş yapmanız gerekiyor.</p>
        </div>
      </div>
    );
  }

  if (user.app_metadata?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-400">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <Navbar />
      
      <div className="pt-24 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Paneli</h1>
              <p className="text-gray-400">Hoş geldiniz, {user.user_metadata?.name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-center"
              >
                Çıkış Yap
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-gray-400">Veriler yükleniyor...</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
            {[
              { id: 'events', label: 'Etkinlikler', count: events.length },
              { id: 'reservations', label: 'Rezervasyonlar', count: reservations.length },
              { id: 'messages', label: 'Mesajlar', count: messages.filter(m => m.status === 'pending').length },
              { id: 'memberships', label: 'Üyelikler', count: memberships.filter(m => m.status === 'pending').length },
              { id: 'tables', label: 'Masa Yönetimi', count: tables.length },
              { id: 'plans', label: 'Üyelik Planları', count: membershipPlans.length },
              { id: 'admins', label: 'Admin Yönetimi', count: admins.length },
              { id: 'settings', label: 'Site Ayarları', count: 0 },
              { id: 'content', label: 'Site Yönetimi', count: 0 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-accent text-white text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Etkinlikler</h2>
                <button
                  onClick={() => setShowEventModal(true)}
                  className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Etkinlik
                </button>
              </div>

              <div className="grid gap-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          {event.image ? (
                            <div className="w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 overflow-hidden">
                              <img
                                src={event.image}
                                alt={event.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('=== Admin Panel Event Image Load Failed ===');
                                  console.error('Event Title:', event.title);
                                  console.error('Image URL (first 100 chars):', event.image?.substring(0, 100));
                                  console.error('Image URL length:', event.image?.length);
                                  console.error('Image starts with data:image?', event.image?.startsWith('data:image'));
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-white">{event.title}</h3>
                            <p className="text-gray-400">{event.artist}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(event.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Users className="w-4 h-4" />
                            <span>{event.capacity} kişi</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#CEAD81] font-semibold">
                            <CreditCard className="w-4 h-4" />
                            <span>{event.price}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors text-center"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id!)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors text-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservations Tab */}
          {activeTab === 'reservations' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Rezervasyonlar</h2>
              <div className="grid gap-4">
                {reservations.map((reservation) => (
                  <div key={reservation.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Customer Info */}
                        <div className="flex items-center gap-4 mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              {reservation.name}
                              {reservation.eventInfo && (
                                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                                  🎉 Etkinlik Rezervasyonu
                                </span>
                              )}
                            </h3>
                            <p className="text-gray-400">{reservation.email}</p>
                          </div>
                        </div>
                        
                        {/* Event Info (if exists) */}
                        {reservation.eventInfo && (
                          <div className="mb-3 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-purple-400" />
                              <strong className="text-purple-300 text-sm">Etkinlik:</strong>
                              <span className="text-white text-sm">{reservation.eventInfo.eventTitle}</span>
                            </div>
                            {reservation.eventInfo.eventLocation && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-purple-400" />
                                <span className="text-gray-300 text-sm">{reservation.eventInfo.eventLocation}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Reservation Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(reservation.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="w-4 h-4" />
                            <span>{reservation.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="w-4 h-4" />
                            <span>{reservation.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Users className="w-4 h-4" />
                            <span>{reservation.partySize} kişi</span>
                          </div>
                        </div>
                        
                        {/* Table Info (if exists) */}
                        {reservation.table && (
                          <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <strong className="text-blue-300">Masa:</strong>{' '}
                                <span className="text-white">{reservation.table.name}</span>
                              </div>
                              <div>
                                <strong className="text-blue-300">Tip:</strong>{' '}
                                <span className="text-white">{reservation.table.type}</span>
                              </div>
                              <div>
                                <strong className="text-blue-300">Kapasite:</strong>{' '}
                                <span className="text-white">{reservation.table.capacity} kişi</span>
                              </div>
                              <div>
                                <strong className="text-blue-300">Fiyat:</strong>{' '}
                                <span className="text-[#CEAD81] font-bold">₺{reservation.table.price}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Special Requests */}
                        {reservation.specialRequests && (
                          <div className="mt-3 p-3 bg-gray-700 rounded text-sm text-gray-300">
                            <strong>Özel İstekler:</strong> {reservation.specialRequests}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          reservation.status === 'confirmed' ? 'bg-green-600 text-white' :
                          reservation.status === 'cancelled' ? 'bg-red-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {reservation.status === 'confirmed' ? 'Onaylandı' :
                           reservation.status === 'cancelled' ? 'İptal' : 'Beklemede'}
                        </span>
                        <select
                          value={reservation.status}
                          onChange={(e) => handleReservationStatusUpdate(reservation.id, e.target.value)}
                          className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
                        >
                          <option value="pending">Beklemede</option>
                          <option value="confirmed">Onayla</option>
                          <option value="cancelled">İptal Et</option>
                        </select>
                        {reservation.status === 'cancelled' && (
                          <button
                            onClick={() => handleDeleteReservation(reservation.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                            title="Rezervasyonu Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                            Sil
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Mesajlar</h2>
              <div className="grid gap-4">
                {messages.map((message) => (
                  <div key={message.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">{message.name}</h3>
                            <p className="text-gray-400">{message.email}</p>
                            {message.phone && <p className="text-gray-400">{message.phone}</p>}
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-gray-700 rounded text-sm text-gray-300">
                          {message.message}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          message.status === 'replied' ? 'bg-green-600 text-white' :
                          message.status === 'read' ? 'bg-blue-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {message.status === 'replied' ? 'Yanıtlandı' :
                           message.status === 'read' ? 'Okundu' : 'Yeni'}
                        </span>
                        <select
                          value={message.status}
                          onChange={(e) => handleMessageStatusUpdate(message.id, e.target.value)}
                          className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
                        >
                          <option value="pending">Yeni</option>
                          <option value="read">Okundu</option>
                          <option value="replied">Yanıtlandı</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memberships Tab */}
          {activeTab === 'memberships' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Üyelik Başvuruları</h2>
              <div className="grid gap-4">
                {memberships.map((membership) => (
                  <div key={membership.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`p-2 rounded-lg ${
                            membership.plan === 'gold' ? 'bg-yellow-600' :
                            membership.plan === 'silver' ? 'bg-gray-500' :
                            'bg-amber-700'
                          }`}>
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{membership.name}</h3>
                            <p className="text-gray-400">{membership.email}</p>
                            <p className="text-gray-400">{membership.phone}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <CreditCard className="w-4 h-4" />
                            <span className="capitalize">{membership.plan} Üyelik</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <User className="w-4 h-4" />
                            <span>{new Date(membership.birthDate).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(membership.createdAt)}</span>
                          </div>
                        </div>
                        
                        {/* Instagram ve Referans Kodu Bilgileri */}
                        <div className="mt-3 space-y-2">
                          {membership.instagramProfile && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <span className="text-pink-400">📷</span>
                              <span className="text-gray-400">Instagram:</span>
                              <a 
                                href={membership.instagramProfile} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-pink-400 hover:text-pink-300 underline"
                              >
                                {membership.instagramProfile.replace('https://instagram.com/', '@')}
                              </a>
                            </div>
                          )}
                          {membership.referenceCode && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-[#CEAD81]">🎁</span>
                              <span className="text-gray-400">Referans Kodu:</span>
                              <span className="text-[#CEAD81] font-mono bg-gray-700 px-2 py-1 rounded">
                                {membership.referenceCode}
                              </span>
                              {membership.status === 'pending' && (
                                <button
                                  onClick={() => handleReferenceCodeValidation(membership.id, membership.referenceCode!)}
                                  className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors text-center"
                                  title="Referans kodunu doğrula"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          membership.status === 'approved' ? 'bg-green-600 text-white' :
                          membership.status === 'rejected' ? 'bg-red-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {membership.status === 'approved' ? 'Onaylandı' :
                           membership.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                        </span>
                        <select
                          value={membership.status}
                          onChange={(e) => handleMembershipStatusUpdate(membership.id, e.target.value)}
                          className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
                        >
                          <option value="pending">Beklemede</option>
                          <option value="approved">Onayla</option>
                          <option value="rejected">Reddet</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Membership Plans Tab */}
          {activeTab === 'plans' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Üyelik Planları Yönetimi</h2>
                <button
                  onClick={handleSaveMembershipPlans}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>

              <div className="grid gap-6">
                {(membershipPlans || []).map((plan, index) => (
                  <div key={`plan-${plan.id}-${index}`} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: plan.color }}
                        >
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => {
                              const newPlans = [...membershipPlans];
                              newPlans[index].name = e.target.value;
                              setMembershipPlans(newPlans);
                            }}
                            className="text-xl font-bold text-white bg-gray-700 px-3 py-1 rounded"
                            placeholder="Plan Adı (TR)"
                          />
                          <input
                            type="text"
                            value={plan.nameEn}
                            onChange={(e) => {
                              const newPlans = [...membershipPlans];
                              newPlans[index].nameEn = e.target.value;
                              setMembershipPlans(newPlans);
                            }}
                            className="mt-1 text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded w-full"
                            placeholder="Plan Name (EN)"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-white">
                          <input
                            type="checkbox"
                            checked={plan.popular}
                            onChange={(e) => {
                              const newPlans = [...membershipPlans];
                              newPlans[index].popular = e.target.checked;
                              setMembershipPlans(newPlans);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">En Popüler</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-gray-400 text-sm">Renk:</label>
                          <input
                            type="color"
                            value={plan.color}
                            onChange={(e) => {
                              const newPlans = [...membershipPlans];
                              newPlans[index].color = e.target.value;
                              setMembershipPlans(newPlans);
                            }}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-1 block">Aylık Fiyat (₺)</label>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(e) => {
                            const newPlans = [...membershipPlans];
                            newPlans[index].price = parseInt(e.target.value) || 0;
                            setMembershipPlans(newPlans);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Özellikler (Türkçe)</label>
                        <div className="space-y-2">
                          {(plan.features || []).map((feature: string, fIndex: number) => (
                            <div key={`feature-tr-${plan.id}-${fIndex}`} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const newPlans = [...membershipPlans];
                                  newPlans[index].features[fIndex] = e.target.value;
                                  setMembershipPlans(newPlans);
                                }}
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                              />
                              <button
                                onClick={() => {
                                  const newPlans = [...membershipPlans];
                                  newPlans[index].features.splice(fIndex, 1);
                                  setMembershipPlans(newPlans);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newPlans = [...membershipPlans];
                              if (!newPlans[index].features) newPlans[index].features = [];
                              newPlans[index].features.push('Yeni özellik');
                              setMembershipPlans(newPlans);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm w-full"
                          >
                            + Özellik Ekle
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Features (English)</label>
                        <div className="space-y-2">
                          {(plan.featuresEn || []).map((feature: string, fIndex: number) => (
                            <div key={`feature-en-${plan.id}-${fIndex}`} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const newPlans = [...membershipPlans];
                                  newPlans[index].featuresEn[fIndex] = e.target.value;
                                  setMembershipPlans(newPlans);
                                }}
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                              />
                              <button
                                onClick={() => {
                                  const newPlans = [...membershipPlans];
                                  newPlans[index].featuresEn.splice(fIndex, 1);
                                  setMembershipPlans(newPlans);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newPlans = [...membershipPlans];
                              if (!newPlans[index].featuresEn) newPlans[index].featuresEn = [];
                              newPlans[index].featuresEn.push('New feature');
                              setMembershipPlans(newPlans);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm w-full"
                          >
                            + Add Feature
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables Tab */}
          {activeTab === 'tables' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Masa Yönetimi</h2>
                <button
                  onClick={handleSaveTables}
                  className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>

              <div className="grid gap-4">
                {tables.map((table, index) => (
                  <div key={table.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Masa ID</label>
                        <input
                          type="text"
                          value={table.id}
                          disabled
                          className="w-full bg-gray-700 text-gray-400 px-3 py-2 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Masa Adı</label>
                        <input
                          type="text"
                          value={table.name}
                          onChange={(e) => {
                            const newTables = [...tables];
                            newTables[index].name = e.target.value;
                            setTables(newTables);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Kapasite (Kişi)</label>
                        <input
                          type="number"
                          value={table.capacity}
                          onChange={(e) => {
                            const newTables = [...tables];
                            newTables[index].capacity = parseInt(e.target.value);
                            setTables(newTables);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Fiyat (₺)</label>
                        <input
                          type="number"
                          value={table.price}
                          onChange={(e) => {
                            const newTables = [...tables];
                            newTables[index].price = parseInt(e.target.value);
                            setTables(newTables);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Alan Türü</label>
                        <select
                          value={table.area}
                          onChange={(e) => {
                            const newTables = [...tables];
                            newTables[index].area = e.target.value;
                            setTables(newTables);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
                        >
                          <option value="vip">VIP</option>
                          <option value="premium">Premium</option>
                          <option value="standard">Standard</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Özellikler (Türkçe)</label>
                        <div className="space-y-2">
                          {(table.features?.tr || []).map((feature: string, fIndex: number) => (
                            <div key={`feature-tr-${table.id}-${fIndex}`} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const newTables = [...tables];
                                  if (!newTables[index].features) newTables[index].features = { tr: [], en: [] };
                                  if (!newTables[index].features.tr) newTables[index].features.tr = [];
                                  newTables[index].features.tr[fIndex] = e.target.value;
                                  setTables(newTables);
                                }}
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newTables = [...tables];
                                  newTables[index].features.tr.splice(fIndex, 1);
                                  setTables(newTables);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newTables = [...tables];
                              if (!newTables[index].features) newTables[index].features = { tr: [], en: [] };
                              if (!newTables[index].features.tr) newTables[index].features.tr = [];
                              newTables[index].features.tr.push('Yeni özellik');
                              setTables(newTables);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm w-full"
                          >
                            + Özellik Ekle
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Features (English)</label>
                        <div className="space-y-2">
                          {(table.features?.en || []).map((feature: string, fIndex: number) => (
                            <div key={`feature-en-${table.id}-${fIndex}`} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const newTables = [...tables];
                                  if (!newTables[index].features) newTables[index].features = { tr: [], en: [] };
                                  if (!newTables[index].features.en) newTables[index].features.en = [];
                                  newTables[index].features.en[fIndex] = e.target.value;
                                  setTables(newTables);
                                }}
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newTables = [...tables];
                                  newTables[index].features.en.splice(fIndex, 1);
                                  setTables(newTables);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newTables = [...tables];
                              if (!newTables[index].features) newTables[index].features = { tr: [], en: [] };
                              if (!newTables[index].features.en) newTables[index].features.en = [];
                              newTables[index].features.en.push('New feature');
                              setTables(newTables);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm w-full"
                          >
                            + Add Feature
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Management Tab */}
          {activeTab === 'admins' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Admin Yönetimi</h2>
                <button
                  onClick={() => setShowAddAdminModal(true)}
                  className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Admin Ekle
                </button>
              </div>

              <div className="grid gap-4">
                {admins.map((admin) => (
                  <div key={admin.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <User className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="text-lg font-bold text-white">{admin.name}</h3>
                            <p className="text-gray-400 text-sm">{admin.email}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Oluşturulma: {formatDate(admin.created_at)}
                          {admin.updated_at && ` • Son Güncelleme: ${formatDate(admin.updated_at)}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAdmin({ ...admin, newPassword: '' })}
                          className="text-blue-400 hover:text-blue-300 p-2"
                          title="Düzenle"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                          title="Sil"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {admins.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz yedek admin hesabı bulunmuyor</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Site Yönetimi (Content Management) Tab */}
          {activeTab === 'content' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Site Yönetimi</h2>
                  <p className="text-gray-400 text-sm mt-1">Web sitesindeki metin ve görselleri buradan güncelleyebilirsiniz.</p>
                </div>
                <button
                  onClick={handleSaveSiteContent}
                  disabled={savingContent}
                  className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingContent ? 'Kaydediliyor...' : 'Tüm Değişiklikleri Kaydet'}
                </button>
              </div>

              <div className="space-y-4">

                {/* HERO SECTION */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleSection('hero')}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Ana Sayfa - Hero Bölümü</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Başlık, alt başlık ve arka plan görseli</p>
                      </div>
                    </div>
                    {expandedSections.hero ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.hero && (
                    <div className="px-5 pb-5 border-t border-gray-700 pt-4 space-y-4">

                      {/* Hero Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">🖼️ Hero Arka Plan Görseli</label>
                        <div className="flex gap-4 items-start">
                          {siteContent.hero.image && (
                            <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                              <img src={siteContent.hero.image} alt="Hero" className="w-full h-full object-cover" onError={e => e.currentTarget.style.display = 'none'} />
                            </div>
                          )}
                          <div className="flex-1">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-700/50">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingSiteImage === 'hero.image'}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleSiteImageUpload(file, 'hero', 'image');
                                }}
                              />
                              {uploadingSiteImage === 'hero.image' ? (
                                <div className="text-gray-400 text-sm">Yükleniyor...</div>
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                  <span className="text-gray-400 text-xs">Görsel seç veya sürükle</span>
                                  <span className="text-gray-500 text-xs">JPG, PNG, WebP (max 10MB)</span>
                                </>
                              )}
                            </label>
                            {siteContent.hero.image && (
                              <button
                                onClick={() => setSiteContent((p: any) => ({ ...p, hero: { ...p.hero, image: '' } }))}
                                className="mt-2 text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Görseli kaldır (varsayılanı kullan)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ABOUT SECTION */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleSection('about')}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Hakkımızda Sayfası</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Açıklama paragrafları ve görsel</p>
                      </div>
                    </div>
                    {expandedSections.about ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.about && (
                    <div className="px-5 pb-5 border-t border-gray-700 pt-4 space-y-5">
                      {/* Desc 1 */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🇹🇷 1. Paragraf (Türkçe)</label>
                          <textarea
                            value={siteContent.about.desc1Tr}
                            onChange={e => setSiteContent((p: any) => ({ ...p, about: { ...p.about, desc1Tr: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none resize-none"
                            rows={4}
                            placeholder="1. paragraf (TR)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🇬🇧 1st Paragraph (English)</label>
                          <textarea
                            value={siteContent.about.desc1En}
                            onChange={e => setSiteContent((p: any) => ({ ...p, about: { ...p.about, desc1En: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none resize-none"
                            rows={4}
                            placeholder="1st paragraph (EN)"
                          />
                        </div>
                      </div>
                      {/* Desc 2 */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🇹🇷 2. Paragraf (Türkçe)</label>
                          <textarea
                            value={siteContent.about.desc2Tr}
                            onChange={e => setSiteContent((p: any) => ({ ...p, about: { ...p.about, desc2Tr: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none resize-none"
                            rows={4}
                            placeholder="2. paragraf (TR)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🇬🇧 2nd Paragraph (English)</label>
                          <textarea
                            value={siteContent.about.desc2En}
                            onChange={e => setSiteContent((p: any) => ({ ...p, about: { ...p.about, desc2En: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none resize-none"
                            rows={4}
                            placeholder="2nd paragraph (EN)"
                          />
                        </div>
                      </div>
                      {/* Desc 3 */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🇹🇷 3. Paragraf / Slogan (Türkçe)</label>
                          <input
                            type="text"
                            value={siteContent.about.desc3Tr}
                            onChange={e => setSiteContent((p: any) => ({ ...p, about: { ...p.about, desc3Tr: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="Slogan (TR)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🇬🇧 3rd Paragraph / Slogan (English)</label>
                          <input
                            type="text"
                            value={siteContent.about.desc3En}
                            onChange={e => setSiteContent((p: any) => ({ ...p, about: { ...p.about, desc3En: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="Slogan (EN)"
                          />
                        </div>
                      </div>
                      {/* About Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">🖼️ Hakkımızda Görseli</label>
                        <div className="flex gap-4 items-start">
                          {siteContent.about.image && (
                            <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                              <img src={siteContent.about.image} alt="About" className="w-full h-full object-cover" onError={e => e.currentTarget.style.display = 'none'} />
                            </div>
                          )}
                          <div className="flex-1">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-700/50">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingSiteImage === 'about.image'}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleSiteImageUpload(file, 'about', 'image');
                                }}
                              />
                              {uploadingSiteImage === 'about.image' ? (
                                <div className="text-gray-400 text-sm">Yükleniyor...</div>
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                  <span className="text-gray-400 text-xs">Görsel seç veya sürükle</span>
                                </>
                              )}
                            </label>
                            {siteContent.about.image && (
                              <button
                                onClick={() => setSiteContent((p: any) => ({ ...p, about: { ...p.about, image: '' } }))}
                                className="mt-2 text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Görseli kaldır
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CONTACT INFO SECTION */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleSection('contact')}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">İletişim Bilgileri</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Adres, telefon, e-posta ve sosyal medya</p>
                      </div>
                    </div>
                    {expandedSections.contact ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.contact && (
                    <div className="px-5 pb-5 border-t border-gray-700 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">📍 Adres</label>
                          <input
                            type="text"
                            value={siteContent.contact.address}
                            onChange={e => setSiteContent((p: any) => ({ ...p, contact: { ...p.contact, address: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="Mekan adresi"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">📞 Telefon</label>
                          <input
                            type="text"
                            value={siteContent.contact.phone}
                            onChange={e => setSiteContent((p: any) => ({ ...p, contact: { ...p.contact, phone: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="+90 000 000 00 00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">✉️ E-posta</label>
                          <input
                            type="email"
                            value={siteContent.contact.email}
                            onChange={e => setSiteContent((p: any) => ({ ...p, contact: { ...p.contact, email: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="info@mmbrsociety.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">📷 Instagram URL</label>
                          <input
                            type="url"
                            value={siteContent.contact.instagram}
                            onChange={e => setSiteContent((p: any) => ({ ...p, contact: { ...p.contact, instagram: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="https://instagram.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">📘 Facebook URL</label>
                          <input
                            type="url"
                            value={siteContent.contact.facebook}
                            onChange={e => setSiteContent((p: any) => ({ ...p, contact: { ...p.contact, facebook: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="https://facebook.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🗺️ Google Maps URL</label>
                          <input
                            type="url"
                            value={siteContent.contact.mapUrl}
                            onChange={e => setSiteContent((p: any) => ({ ...p, contact: { ...p.contact, mapUrl: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="https://maps.google.com/..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* HOURS SECTION */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleSection('hours')}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Clock className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Çalışma Saatleri</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Cuma ve Cumartesi saatleri</p>
                      </div>
                    </div>
                    {expandedSections.hours ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.hours && (
                    <div className="px-5 pb-5 border-t border-gray-700 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🗓️ Cuma Saatleri</label>
                          <input
                            type="text"
                            value={siteContent.hours.fridayTime}
                            onChange={e => setSiteContent((p: any) => ({ ...p, hours: { ...p.hours, fridayTime: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="23:00 - 03:00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">🗓️ Cumartesi Saatleri</label>
                          <input
                            type="text"
                            value={siteContent.hours.saturdayTime}
                            onChange={e => setSiteContent((p: any) => ({ ...p, hours: { ...p.hours, saturdayTime: e.target.value } }))}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                            placeholder="23:00 - 03:00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RULES SECTION */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleSection('rules')}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Etkinlik Kuralları</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Giriş ve rezervasyon kuralları</p>
                      </div>
                    </div>
                    {expandedSections.rules ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.rules && (
                    <div className="px-5 pb-5 border-t border-gray-700 pt-4 space-y-4">
                      {([1,2,3,4,5] as const).map(n => (
                        <div key={n} className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">🇹🇷 Kural {n} (Türkçe)</label>
                            <textarea
                              value={(siteContent.rules as any)[`rule${n}Tr`]}
                              onChange={e => setSiteContent((p: any) => ({ ...p, rules: { ...p.rules, [`rule${n}Tr`]: e.target.value } }))}
                              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none resize-none text-sm"
                              rows={2}
                              placeholder={`Kural ${n} (TR)`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">🇬🇧 Rule {n} (English)</label>
                            <textarea
                              value={(siteContent.rules as any)[`rule${n}En`]}
                              onChange={e => setSiteContent((p: any) => ({ ...p, rules: { ...p.rules, [`rule${n}En`]: e.target.value } }))}
                              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none resize-none text-sm"
                              rows={2}
                              placeholder={`Rule ${n} (EN)`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Site Ayarları Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Site Ayarları</h2>
                <button
                  onClick={handleSaveSiteSettings}
                  disabled={savingSettings}
                  className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingSettings ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>

              <div className="space-y-6">
                {/* Rezervasyon Sayfası Ayarları */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-primary">🗓️</span> Rezervasyon Sayfası
                  </h3>

                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div>
                      <p className="text-white font-medium">Genel Giriş Bölümü</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Rezervasyon sayfasında "Genel Giriş" başlıklı bölümü (Ayakta Rezervasyon ve Özel Masa seçenekleri) göster/gizle.
                      </p>
                    </div>
                    <button
                      onClick={() => setSiteSettings(prev => ({ ...prev, generalEntryVisible: !prev.generalEntryVisible }))}
                      className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors focus:outline-none ml-6 flex-shrink-0 ${
                        siteSettings.generalEntryVisible ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          siteSettings.generalEntryVisible ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
                    siteSettings.generalEntryVisible
                      ? 'bg-green-900/30 border border-green-600/40 text-green-400'
                      : 'bg-red-900/30 border border-red-600/40 text-red-400'
                  }`}>
                    {siteSettings.generalEntryVisible
                      ? '✅ Genel Giriş bölümü rezervasyon sayfasında görünür.'
                      : '🚫 Genel Giriş bölümü rezervasyon sayfasında gizli.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Yeni Admin Ekle</h2>
              <button
                onClick={() => {
                  setShowAddAdminModal(false);
                  setNewAdmin({ email: '', password: '', name: '' });
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">İsim</label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  placeholder="Admin adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Şifre</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  placeholder="Güçlü bir şifre girin"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddAdminModal(false);
                    setNewAdmin({ email: '', password: '', name: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddAdmin}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors"
                >
                  Admin Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Admin Düzenle</h2>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">İsim</label>
                <input
                  type="text"
                  value={editingAdmin.name}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Yeni Şifre (boş bırakılırsa değişmez)
                </label>
                <input
                  type="password"
                  value={editingAdmin.newPassword || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, newPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  placeholder="Yeni şifre (opsiyonel)"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateAdmin}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingEvent ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}
              </h2>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  resetEventForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Etkinlik Adı</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sanatçı</label>
                  <input
                    type="text"
                    value={eventForm.artist}
                    onChange={(e) => setEventForm(prev => ({ ...prev, artist: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tarih</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Saat: 23:00 | Süre: 5 Saat | Konum: MMBR Ana Salon | Kapasite: 500
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fiyat</label>
                <input
                  type="text"
                  value={eventForm.price}
                  onChange={(e) => setEventForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  placeholder="Örn: ₺150"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Kısa Açıklama</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Detaylı Açıklama</label>
                <textarea
                  value={eventForm.detailedDescription}
                  onChange={(e) => setEventForm(prev => ({ ...prev, detailedDescription: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  rows={4}
                  required
                />
              </div>

              {/* File Upload Section - Only file upload, no URL input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Etkinlik Görseli</label>
                
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="hidden"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 mb-2">Dosya seçmek için tıklayın</p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF desteklenir (Max 10MB)</p>
                  </label>
                  
                  {uploadingImage && (
                    <div className="mt-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-gray-400 mt-2">Görsel yükleniyor...</p>
                    </div>
                  )}
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mt-4">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          console.error('=== Preview Image Load Failed ===');
                          console.error('Image URL (first 100 chars):', imagePreview?.substring(0, 100));
                          console.error('Image URL length:', imagePreview?.length);
                          setImagePreview('');
                          setEventForm(prev => ({ ...prev, image: '' }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setEventForm(prev => ({ ...prev, image: '' }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {imageValidationError && (
                  <div className="mt-2 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {imageValidationError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    resetEventForm();
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-center"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="px-4 py-2 bg-primary hover:bg-accent text-white rounded-lg transition-colors disabled:opacity-50 text-center"
                >
                  {editingEvent ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}