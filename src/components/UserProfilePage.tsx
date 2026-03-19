import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../utils/api';
import { supabase } from '../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Edit3, 
  MapPin, 
  Phone, 
  Mail,
  Clock,
  Users,
  Star,
  Key,
  Camera
} from 'lucide-react';
import Navbar from './Navbar';

interface Reservation {
  id: string;
  date: string;
  time: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  table_type?: string;
  special_requests?: string;
}

interface Message {
  id: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'replied';
  created_at: string;
  reply?: string;
}

interface UserStats {
  totalReservations: number;
  confirmedReservations: number;
  totalMessages: number;
  memberSince: string;
  membershipPlan?: string;
}

export default function UserProfilePage() {
  const { user, session, refreshUser, forceRefreshUserData } = useAuth();
  const { t } = useLanguage();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pastReservations, setPastReservations] = useState<Reservation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    birthday: user?.user_metadata?.birthday || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user && session?.access_token) {
      fetchUserData();
    }
  }, [user, session]);

  // Update userInfo when user metadata changes
  useEffect(() => {
    if (user) {
      console.log('👤 UserProfilePage - User metadata updated:', {
        name: user.user_metadata?.name,
        email: user.email,
        phone: user.user_metadata?.phone,
        birthday: user.user_metadata?.birthday,
        fullMetadata: user.user_metadata
      });
      
      setUserInfo(prevUserInfo => ({
        name: user.user_metadata?.name || prevUserInfo.name || '',
        email: user.email || prevUserInfo.email || '',
        phone: user.user_metadata?.phone || prevUserInfo.phone || '',
        birthday: user.user_metadata?.birthday || prevUserInfo.birthday || '',
      }));
    }
  }, [user?.user_metadata, user?.email, user?.id]); // user.id'yi de dependency'e ekledik

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        console.warn('⚠️ No access token available for fetching user data');
        return;
      }

      console.log('📊 Fetching user profile data...');

      // Parallel fetch with timeout protection
      const fetchPromises = Promise.allSettled([
        apiService.getMyReservations(accessToken),
        apiService.getMyMessages(accessToken)
      ]);

      // Add overall timeout for the parallel requests (increased to 15 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('User data fetch timeout')), 15000)
      );

      const results = await Promise.race([
        fetchPromises,
        timeoutPromise
      ]);

      const [reservationsResult, messagesResult] = results as PromiseSettledResult<any>[];

      // Handle reservations
      let reservations = [];
      let pastReservations = [];
      if (reservationsResult.status === 'fulfilled' && !reservationsResult.value.error) {
        reservations = reservationsResult.value.reservations || [];
        pastReservations = reservationsResult.value.pastReservations || [];
        console.log(`✅ Retrieved ${reservations.length} active reservations and ${pastReservations.length} past reservations`);
      } else {
        const error = reservationsResult.status === 'rejected' 
          ? reservationsResult.reason 
          : reservationsResult.value.error;
        console.warn('⚠️ Failed to fetch reservations:', error);
        toast.error('Rezervasyonlar yüklenemedi');
      }
      setReservations(reservations);
      setPastReservations(pastReservations);

      // Handle messages
      let messages = [];
      if (messagesResult.status === 'fulfilled' && !messagesResult.value.error) {
        messages = messagesResult.value.messages || [];
        console.log(`✅ Retrieved ${messages.length} messages`);
      } else {
        const error = messagesResult.status === 'rejected' 
          ? messagesResult.reason 
          : messagesResult.value.error;
        console.warn('⚠️ Failed to fetch messages:', error);
        toast.error('Mesajlar yüklenemedi');
      }
      setMessages(messages);

      // İstatistikleri hesapla
      const totalReservations = reservations.length;
      const confirmedReservations = reservations.filter(
        (r: any) => r.status === 'confirmed'
      ).length;
      
      // Admin kullanıcılar için üyelik planı ayarlama
      const membershipPlan = user?.app_metadata?.role === 'admin' 
        ? undefined // Admin kullanıcılar için üyelik planı yok
        : (user?.user_metadata?.membership_plan || 'Standard');

      setUserStats({
        totalReservations,
        confirmedReservations,
        totalMessages: messages.length,
        memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor',
        membershipPlan: membershipPlan
      });

      console.log('✅ User profile data loaded successfully');

    } catch (error: any) {
      console.error('💥 Error fetching user data:', error);
      
      if (error.message?.includes('timeout')) {
        toast.error('Veri yükleme zaman aşımına uğradı. Sayfa yenilenecek.', {
          action: {
            label: 'Yenile',
            onClick: () => window.location.reload()
          }
        });
      } else {
        toast.error('Kullanıcı verileri alınırken hata oluştu');
      }
      
      // Set empty default data on error
      setReservations([]);
      setMessages([]);
      setUserStats({
        totalReservations: 0,
        confirmedReservations: 0,
        totalMessages: 0,
        memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor',
        membershipPlan: user?.app_metadata?.role === 'admin' ? undefined : 'Standard'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      console.log('🔄 Updating user profile...', {
        current: user?.user_metadata,
        new: {
          name: userInfo.name,
          phone: userInfo.phone,
          birthday: userInfo.birthday,
        }
      });

      // Supabase'te kullanıcı bilgilerini güncelle
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata, // Mevcut metadata'yı koru
          name: userInfo.name,
          phone: userInfo.phone,
          birthday: userInfo.birthday,
        }
      });

      if (error) {
        console.error('❌ Profile update failed:', error);
        throw error;
      }

      console.log('✅ Profile update response:', {
        updatedUser: data.user,
        updatedMetadata: data.user?.user_metadata
      });

      toast.success('Profil başarıyla güncellendi');
      setEditMode(false);
      
      // Güncellemeden sonra user data'yı zorla yenile
      console.log('🔄 Force refreshing user data after profile update...');
      
      // Kısa bir delay ekleyerek Supabase'in güncellemesini bekle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        // Güçlendirilmiş refresh fonksiyonunu kullan
        if (forceRefreshUserData) {
          console.log('🚀 Using forceRefreshUserData...');
          await forceRefreshUserData();
          console.log('✅ User data force refreshed');
        } else if (refreshUser) {
          console.log('🔄 Fallback to refreshUser...');
          await refreshUser();
          console.log('✅ User context refreshed (fallback)');
        }
        
        // UI state'ini güncelleme işlemi
        let retryCount = 0;
        const maxRetries = 5;
        
        const updateUIState = async () => {
          try {
            const { data: { user: freshUser }, error } = await supabase.auth.getUser();
            
            if (error) {
              console.warn(`⚠️ Could not get fresh user data (attempt ${retryCount + 1}):`, error.message);
            } else if (freshUser) {
              const hasUpdates = 
                freshUser.user_metadata?.name !== userInfo.name ||
                freshUser.user_metadata?.phone !== userInfo.phone ||
                freshUser.user_metadata?.birthday !== userInfo.birthday;
              
              if (!hasUpdates && retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 UI sync retry ${retryCount}/${maxRetries} - no updates detected yet...`);
                setTimeout(updateUIState, 1000 * retryCount);
                return;
              }
              
              console.log('🔄 Syncing UI with fresh user data:', {
                name: freshUser.user_metadata?.name,
                phone: freshUser.user_metadata?.phone,
                birthday: freshUser.user_metadata?.birthday
              });
              
              setUserInfo({
                name: freshUser.user_metadata?.name || '',
                email: freshUser.email || userInfo.email,
                phone: freshUser.user_metadata?.phone || '',
                birthday: freshUser.user_metadata?.birthday || '',
              });
              
              console.log('✅ UI state synchronized successfully');
            }
            
          } catch (syncError) {
            console.warn('⚠️ UI sync error:', syncError);
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 UI sync retry ${retryCount}/${maxRetries} after error...`);
              setTimeout(updateUIState, 1000 * retryCount);
            }
          }
        };
        
        // İlk UI sync denemesi
        setTimeout(updateUIState, 500);
        
      } catch (refreshError) {
        console.error('💥 Error during post-update refresh:', refreshError);
        toast.error('Profil güncellendi ancak sayfa yenilenmedi. Lütfen sayfayı manuel olarak yenileyin.');
      }
      
    } catch (error) {
      console.error('💥 Error updating profile:', error);
      toast.error('Profil güncellenirken hata oluştu');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Şifre başarıyla değiştirildi');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Şifre değiştirirken hata oluştu');
    }
  };

  const getMembershipBadgeColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'bronze': return 'bg-gradient-to-r from-bronze to-bronze-dark text-white';
      case 'silver': return 'bg-gradient-to-r from-silver to-silver-dark text-white';
      case 'gold': return 'bg-gradient-to-r from-gold to-gold-dark text-black';
      default: return 'bg-primary text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-600 text-white';
      case 'pending': return 'bg-yellow-600 text-white';
      case 'cancelled': return 'bg-red-600 text-white';
      case 'read': return 'bg-blue-600 text-white';
      case 'replied': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        {/* Profil Başlığı */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="w-24 h-24 border-4 border-primary">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-white text-2xl">
                {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl text-white mb-2">
                {user?.user_metadata?.name || 'Kullanıcı'}
              </h1>
              <p className="text-gray-400 mb-3">{user?.email}</p>
              {/* Sadece admin olmayan kullanıcılar için üyelik planını göster */}
              {userStats?.membershipPlan && user?.app_metadata?.role !== 'admin' && (
                <Badge className={getMembershipBadgeColor(userStats.membershipPlan)}>
                  <Star className="w-4 h-4 mr-1" />
                  {userStats.membershipPlan} Üye
                </Badge>
              )}
              {/* Admin kullanıcılar için admin badge göster */}
              {user?.app_metadata?.role === 'admin' && (
                <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-800 text-white">
                  <Key className="w-4 h-4 mr-1" />
                  Yönetici
                </Badge>
              )}
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setEditMode(!editMode)}
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
          </div>

          {/* İstatistikler */}
          {userStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h3 className="text-2xl text-white">{userStats.totalReservations}</h3>
                  <p className="text-gray-400 text-sm">Toplam Rezervasyon</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h3 className="text-2xl text-white">{userStats.confirmedReservations}</h3>
                  <p className="text-gray-400 text-sm">Onaylanan</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="text-2xl text-white">{userStats.totalMessages}</h3>
                  <p className="text-gray-400 text-sm">Mesaj</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-sm text-white">{userStats.memberSince}</h3>
                  <p className="text-gray-400 text-sm">Üyelik Tarihi</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Ana İçerik */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 mb-8">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary">
              <User className="w-4 h-4 mr-2" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="reservations" className="data-[state=active]:bg-primary">
              <Calendar className="w-4 h-4 mr-2" />
              Rezervasyonlar
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mesajlar
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary">
              <Settings className="w-4 h-4 mr-2" />
              Ayarlar
            </TabsTrigger>
          </TabsList>

          {/* Profil Bilgileri */}
          <TabsContent value="profile">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Kişisel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Ad Soyad</Label>
                    <Input
                      id="name"
                      value={userInfo.name}
                      onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                      disabled={!editMode}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-white">E-posta</Label>
                    <Input
                      id="email"
                      value={userInfo.email}
                      disabled
                      className="bg-gray-800 border-gray-700 text-gray-400"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-white">Telefon</Label>
                    <Input
                      id="phone"
                      value={userInfo.phone}
                      onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                      disabled={!editMode}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="5XX XXX XX XX"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="birthday" className="text-white">Doğum Tarihi</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={userInfo.birthday}
                      onChange={(e) => setUserInfo({ ...userInfo, birthday: e.target.value })}
                      disabled={!editMode}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                
                {editMode && (
                  <div className="flex gap-4 pt-4">
                    <Button onClick={handleUpdateProfile} className="bg-primary hover:bg-primary/90">
                      Kaydet
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditMode(false)}
                      className="border-gray-600 text-gray-300"
                    >
                      İptal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rezervasyonlar */}
          <TabsContent value="reservations">
            <div className="space-y-6">
              {/* Aktif Rezervasyonlar */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('profile.activeReservations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reservations.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">{t('profile.noActiveReservations')}</p>
                  ) : (
                    <div className="space-y-4">
                      {reservations.map((reservation) => (
                        <div key={reservation.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white">
                                {new Date(reservation.date).toLocaleDateString('tr-TR')} - {reservation.time}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {reservation.guests} kişi • {reservation.table_type || 'Standart masa'}
                              </p>
                            </div>
                            <Badge className={getStatusColor(reservation.status)}>
                              {reservation.status === 'confirmed' ? 'Onaylandı' : 
                               reservation.status === 'pending' ? 'Beklemede' : 'İptal Edildi'}
                            </Badge>
                          </div>
                          {reservation.special_requests && (
                            <p className="text-gray-300 text-sm mt-2">
                              <strong>Özel İstekler:</strong> {reservation.special_requests}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mt-2">
                            Oluşturulma: {new Date(reservation.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Geçmiş Rezervasyonlar */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {t('profile.pastReservations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pastReservations.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">{t('profile.noPastReservations')}</p>
                  ) : (
                    <div className="space-y-4">
                      {pastReservations.map((reservation) => (
                        <div key={reservation.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 opacity-75">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-gray-300">
                                {new Date(reservation.date).toLocaleDateString('tr-TR')} - {reservation.time}
                              </h4>
                              <p className="text-gray-500 text-sm">
                                {reservation.guests} kişi • {reservation.table_type || 'Standart masa'}
                              </p>
                            </div>
                            <Badge className={getStatusColor(reservation.status)}>
                              {reservation.status === 'confirmed' ? 'Tamamlandı' : 
                               reservation.status === 'pending' ? 'Beklemede' : 'İptal Edildi'}
                            </Badge>
                          </div>
                          {reservation.special_requests && (
                            <p className="text-gray-400 text-sm mt-2">
                              <strong>Özel İstekler:</strong> {reservation.special_requests}
                            </p>
                          )}
                          <p className="text-gray-600 text-xs mt-2">
                            Oluşturulma: {new Date(reservation.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mesajlar */}
          <TabsContent value="messages">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">İletişim Geçmişi</CardTitle>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Henüz mesajınız bulunmuyor.</p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white">{message.subject}</h4>
                          <Badge className={getStatusColor(message.status)}>
                            {message.status === 'replied' ? 'Yanıtlandı' : 
                             message.status === 'read' ? 'Okundu' : 'Beklemede'}
                          </Badge>
                        </div>
                        <p className="text-gray-300 mb-2">{message.message}</p>
                        {message.reply && (
                          <div className="bg-gray-700 p-3 rounded mt-3">
                            <p className="text-green-400 text-sm mb-1">Admin Yanıtı:</p>
                            <p className="text-gray-200">{message.reply}</p>
                          </div>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(message.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ayarlar */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Şifre Değiştirme */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Şifre Değiştir
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current-password" className="text-white">Mevcut Şifre</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-password" className="text-white">Yeni Şifre</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password" className="text-white">Yeni Şifre Tekrar</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <Button 
                    onClick={handlePasswordChange}
                    className="bg-primary hover:bg-primary/90"
                    disabled={!passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    Şifreyi Değiştir
                  </Button>
                </CardContent>
              </Card>

              {/* Hesap Bilgileri */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Hesap Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Hesap Oluşturma</p>
                      <p className="text-white">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Son Giriş</p>
                      <p className="text-white">
                        {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">E-posta Doğrulandı</p>
                      <Badge className={user?.email_confirmed_at ? 'bg-green-600' : 'bg-red-600'}>
                        {user?.email_confirmed_at ? 'Evet' : 'Hayır'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}