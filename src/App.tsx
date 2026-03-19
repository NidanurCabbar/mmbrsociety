import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SiteContentProvider } from './contexts/SiteContentContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import ReservationPage from './components/ReservationPage';
import MembershipPage from './components/MembershipPage';
import EventsSection from './components/EventsSection';
import AdminPage from './components/AdminPage';
import UserProfilePage from './components/UserProfilePage';
import PaymentPage from './components/PaymentPage';
import PaymentResultPage from './components/PaymentResultPage';

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <SiteContentProvider>
        <AuthProvider>
          <div className="size-full min-h-screen bg-black">
            <Router>
              <ErrorBoundary>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/reservation" element={<ReservationPage />} />
                  <Route path="/membership" element={<MembershipPage />} />
                  <Route path="/events" element={<EventsSection />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/payment/result" element={<PaymentResultPage />} />
                  {/* Legacy Turkish routes for backwards compatibility */}
                  <Route path="/hakkimizda" element={<Navigate to="/about" replace />} />
                  <Route path="/iletisim" element={<Navigate to="/contact" replace />} />
                  <Route path="/rezervasyon" element={<Navigate to="/reservation" replace />} />
                  <Route path="/uyelik" element={<Navigate to="/membership" replace />} />
                  <Route path="/profil" element={<Navigate to="/profile" replace />} />
                  {/* Preview page route */}
                  <Route path="/preview_page.html" element={<HomePage />} />
                  {/* Catch-all route for unknown URLs */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </Router>
            <Toaster 
              theme="dark" 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                },
              }}
            />
          </div>
        </AuthProvider>
        </SiteContentProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}