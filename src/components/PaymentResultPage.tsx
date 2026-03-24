import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const status = params.get('status'); // 'success' | 'failure'
  const type   = params.get('type');   // 'reservation' | 'membership' | 'event'

  const isSuccess = status === 'success';

  const typeLabel: Record<string, string> = {
    reservation: 'Rezervasyonunuz',
    membership:  'Üyelik başvurunuz',
    event:       'Biletiniz',
  };

  const label = typeLabel[type || ''] || 'İşleminiz';

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center pt-24">
        {isSuccess ? (
          <>
            {/* Animated success checkmark */}
            <div className="w-24 h-24 rounded-full border-4 border-green-400 flex items-center justify-center mb-8 animate-pulse">
              <svg className="w-14 h-14 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Ödeme Başarılı
            </h1>
            <p className="text-gray-300 text-lg mb-10 max-w-md">
              {label} onaylandı. En kısa sürede sizinle iletişime geçeceğiz.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full border-4 border-red-400 flex items-center justify-center mb-8">
              <svg className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-red-400">
              Ödeme Başarısız
            </h1>
            <p className="text-gray-300 text-lg mb-10 max-w-md">
              Ödeme işlemi tamamlanamadı. Tekrar denemek ister misiniz?
            </p>
          </>
        )}

        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 border border-white/20 rounded-lg hover:bg-white/10 transition text-white"
          >
            Ana Sayfa
          </button>
          {!isSuccess && type === 'reservation' && (
            <button
              onClick={() => navigate('/reservation')}
              className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Tekrar Dene
            </button>
          )}
          {!isSuccess && type === 'membership' && (
            <button
              onClick={() => navigate('/membership')}
              className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
