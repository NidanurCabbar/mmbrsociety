import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

interface PaymentLocationState {
  checkoutFormContent: string;
  conversationId: string;
  amount: number;
  description: string;
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const state = location.state as PaymentLocationState | null;

  useEffect(() => {
    if (!state?.checkoutFormContent) {
      navigate('/');
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // İyzico HTML içeriğini enjekte et
    container.innerHTML = state.checkoutFormContent;

    // Script tag'lerini çalıştır (React innerHTML script'leri execute etmez)
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [state, navigate]);

  if (!state?.checkoutFormContent) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-20 px-4 pb-8 max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-1">Güvenli Ödeme</h1>
          <p className="text-gray-400 text-sm">
            {state.description} — <span className="text-white font-semibold">₺{state.amount}</span>
          </p>
        </div>

        {/* İyzico formu buraya enjekte edilir */}
        <div ref={containerRef} className="w-full" />

        <p className="mt-6 text-center text-xs text-gray-600">
          Ödemeler iyzico güvencesiyle işlenmektedir. Kart bilgileriniz sitemizde saklanmaz.
        </p>
      </div>
    </div>
  );
}
