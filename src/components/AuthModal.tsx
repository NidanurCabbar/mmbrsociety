import React, { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Şifreler eşleşmiyor!');
          return;
        }
        
        if (formData.password.length < 6) {
          toast.error('Şifre en az 6 karakter olmalıdır.');
          return;
        }
        
        await signUp(formData.email, formData.password, formData.name, 'user');
        toast.success('Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.');
        
        // Auto-switch to signin after successful signup
        setMode('signin');
        setFormData({
          ...formData,
          password: '',
          confirmPassword: ''
        });
      } else {
        await signIn(formData.email, formData.password);
        toast.success('Başarıyla giriş yaptınız!');
        onClose();
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      // Log for debugging, but differentiate between expected and unexpected errors
      const isExpectedError = 
        error.message?.includes('Invalid login credentials') || 
        error.message?.includes('User already registered') ||
        error.message?.includes('Email not confirmed');
      
      if (isExpectedError) {
        console.log(`[Auth] Expected ${mode} error:`, error.message);
      } else {
        console.error('[Auth] Unexpected error:', error);
      }
      
      let errorMessage = 'Bir hata oluştu';
      
      if (mode === 'signin') {
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Bu e-posta ve şifre kombinasyonu bulunamadı. Lütfen bilgilerinizi kontrol edin veya yeni bir hesap oluşturun.';
          
          // Suggest switching to signup if credentials are invalid
          toast.error(errorMessage, {
            action: {
              label: 'Kayıt Ol',
              onClick: () => {
                setMode('signup');
                toast.dismiss();
              }
            },
            duration: 8000
          });
          return;
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'E-posta adresiniz henüz doğrulanmamış.';
        }
      } else {
        // Signup errors
        if (error.message?.includes('User already registered') || error.message?.includes('already exists')) {
          errorMessage = 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.';
          
          toast.error(errorMessage, {
            action: {
              label: 'Giriş Yap',
              onClick: () => {
                setMode('signin');
                toast.dismiss();
              }
            },
            duration: 6000
          });
          return;
        } else if (error.message?.includes('Password should be at least')) {
          errorMessage = 'Şifre en az 6 karakter olmalıdır.';
        }
      }
      
      if (error.message && !errorMessage.includes('Bir hata oluştu')) {
        // If we haven't set a custom message, use the original
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    // Clear form when switching modes
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };





  return (
    <div className="fixed inset-0 bg-black/80 z-50">
      {/* Clickable overlay to close modal */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Modal positioned at top-right */}
      <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 pr-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            {mode === 'signin' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </h2>
          <p className="text-gray-300">
            {mode === 'signin' ? 'Mmbr hesabınıza giriş yapın' : 'Mmbr ailesine katılın'}
          </p>
          
          {/* Info message */}
          {mode === 'signin' && (
            <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-gray-300">
              💡 Hesabınız yoksa önce "Hesap Oluştur" seçeneğini kullanın
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Ad Soyad
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                placeholder="Adınızı ve soyadınızı girin"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              E-posta
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-primary focus:border-transparent text-white"
              placeholder="E-posta adresinizi girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Şifre
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-primary focus:border-transparent text-white"
              placeholder={mode === 'signup' ? 'En az 6 karakter' : 'Şifrenizi girin'}
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Şifre Tekrar
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                placeholder="Şifrenizi tekrar girin"
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-accent transition-colors py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            {loading ? 'İşlem yapılıyor...' : (mode === 'signin' ? 'Giriş Yap' : 'Hesap Oluştur')}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={switchMode}
            className="text-primary hover:text-accent transition-colors text-sm text-center"
            disabled={loading}
          >
            {mode === 'signin' ? 'Hesabınız yok mu? Hesap oluşturun' : 'Zaten hesabınız var mı? Giriş yapın'}
          </button>
        </div>
      </div>
    </div>
  );
}