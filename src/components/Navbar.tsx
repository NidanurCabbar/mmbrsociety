import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogIn, LogOut, User, Globe } from 'lucide-react';
import AuthModal from './AuthModal';
import mmbrLogo from 'figma:asset/11c35ecc787921c17da6c0734e60fe06c3481c08.png';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = [
    { path: '/about', label: t('nav.about') },
    { path: '/reservation', label: t('nav.reservation') },
    { path: '/events', label: t('nav.events') },
    { path: '/membership', label: 'MMBRSHIP' }
  ];

  const toggleLanguage = (lang: 'en' | 'tr') => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-2" style={{ borderColor: '#1C1F20' }}>
      <div className="relative w-full px-6 py-4">
        {/* Logo - Absolute positioned to far left */}
        <Link to="/" className="absolute left-4 top-1/2 transform -translate-y-1/2 hover:opacity-80 transition-opacity">
          <img 
            src={mmbrLogo}
            alt="MMBR Logo"
            className="h-8 w-8"
          />
        </Link>
        
        <div className="flex items-center justify-end pr-4">
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-4 py-2 transition-all duration-300 hover:text-primary group ${
                  location.pathname === item.path ? 'text-primary' : 'text-white'
                }`}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
            
            {/* Language Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-white hover:text-primary transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {language === 'en' ? 'EN' : 'TR'}
                </span>
              </button>
              
              {showLanguageMenu && (
                <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-lg min-w-[100px] z-50">
                  <button
                    onClick={() => toggleLanguage('en')}
                    className={`w-full px-4 py-2 text-left hover:bg-primary/20 transition-colors rounded-t-lg text-center ${
                      language === 'en' ? 'text-primary bg-primary/10' : 'text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => toggleLanguage('tr')}
                    className={`w-full px-4 py-2 text-left hover:bg-primary/20 transition-colors rounded-b-lg text-center ${
                      language === 'tr' ? 'text-primary bg-primary/10' : 'text-white'
                    }`}
                  >
                    Türkçe
                  </button>
                </div>
              )}
            </div>
            
            {/* Auth Section */}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-white hover:text-primary transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">
                    {user.user_metadata?.name || user.email.split('@')[0]}
                    {isAdmin && (
                      <span className="text-xs text-gray-400 ml-1">
                        (admin)
                      </span>
                    )}
                  </span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-xs text-gray-400 hover:text-primary transition-colors"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <button
                  onClick={async () => {
                    try {
                      await signOut();
                      navigate('/');
                    } catch (error) {
                      console.error('Logout error:', error);
                    }
                  }}
                  className="flex items-center justify-center gap-2 text-white hover:text-primary transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center justify-center gap-2 text-white hover:text-primary transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {t('nav.login')}
              </button>
            )}
          </div>
          
          {/* Mobile menu button - Absolute positioned to far right */}
          <div className="md:hidden absolute right-4 top-1/2 transform -translate-y-1/2">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-white hover:text-primary transition-all duration-200 hamburger-icon touch-target rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-center"
              aria-label={showMobileMenu ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/98 backdrop-blur-md border-t border-gray-700 z-50 shadow-2xl">
          <div className="px-6 py-4 space-y-4 max-h-screen overflow-y-auto">
            {/* Navigation Links */}
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`block py-3 px-2 text-lg font-medium rounded transition-all touch-target ${
                    location.pathname === item.path 
                      ? 'text-primary bg-primary/10 border-l-4 border-primary' 
                      : 'text-white hover:text-primary hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* Language Toggle */}
            <div className="border-t border-gray-700 pt-4">
              <div className="text-gray-400 text-sm mb-3 font-medium">Dil / Language</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toggleLanguage('en');
                    setShowMobileMenu(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all touch-target ${
                    language === 'en' 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => {
                    toggleLanguage('tr');
                    setShowMobileMenu(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all touch-target ${
                    language === 'tr' 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  TR
                </button>
              </div>
            </div>
            
            {/* Auth Section */}
            <div className="border-t border-gray-700 pt-4">
              {user ? (
                <div className="space-y-3">
                  <Link
                    to="/profile"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 text-white hover:text-primary transition-colors py-2 px-2 rounded hover:bg-white/5 touch-target"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">
                      {user.user_metadata?.name || user.email.split('@')[0]}
                      {isAdmin && (
                        <span className="text-xs text-gray-400 ml-1">
                          (admin)
                        </span>
                      )}
                    </span>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setShowMobileMenu(false)}
                      className="block text-gray-400 hover:text-primary transition-colors py-2 px-2 rounded hover:bg-white/5 font-medium touch-target"
                    >
                      {t('nav.admin')}
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await signOut();
                        setShowMobileMenu(false);
                        navigate('/');
                      } catch (error) {
                        console.error('Logout error:', error);
                      }
                    }}
                    className="flex items-center justify-center gap-3 text-white hover:text-primary transition-colors py-2 px-2 rounded hover:bg-white/5 w-full font-medium touch-target"
                  >
                    <LogOut className="w-5 h-5" />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center justify-center gap-3 text-white hover:text-primary transition-colors py-2 px-2 rounded hover:bg-white/5 font-medium touch-target"
                >
                  <LogIn className="w-5 h-5" />
                  {t('nav.login')}
                </button>
              )}
            </div>
            
            {/* Close hint */}
            <div className="border-t border-gray-700 pt-4 pb-2">
              <p className="text-gray-500 text-xs text-center">Menüyü kapatmak için dışarı tıklayın</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Close menus when clicking outside */}
      {(showLanguageMenu || showMobileMenu) && (
        <div 
          className="fixed inset-0 z-40 mobile-menu-backdrop" 
          onClick={() => {
            setShowLanguageMenu(false);
            setShowMobileMenu(false);
          }}
          aria-hidden="true"
        />
      )}
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </nav>
  );
}