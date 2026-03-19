import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        {isSuccess ? (
          <>
            <CheckCircle className="w-20 h-20 text-green-400 mb-6" />
            <h1 className="text-3xl font-bold mb-3">Ödeme Başarılı</h1>
            <p className="text-gray-400 text-lg mb-8">
              {label} onaylandı. En kısa sürede sizinle iletişime geçeceğiz.
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-20 h-20 text-red-400 mb-6" />
            <h1 className="text-3xl font-bold mb-3">Ödeme Başarısız</h1>
            <p className="text-gray-400 text-lg mb-8">
              Ödeme işlemi tamamlanamadı. Tekrar denemek ister misiniz?
            </p>
          </>
        )}

        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-white/20 rounded-lg hover:bg-white/10 transition"
          >
            Ana Sayfa
          </button>
          {!isSuccess && type === 'reservation' && (
            <button
              onClick={() => navigate('/reservation')}
              className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Tekrar Dene
            </button>
          )}
          {!isSuccess && type === 'membership' && (
            <button
              onClick={() => navigate('/membership')}
              className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
