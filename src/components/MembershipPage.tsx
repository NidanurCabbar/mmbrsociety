import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import AnimatedStars from './AnimatedStars';
import FingerprintCursor from './FingerprintCursor';
import { Check, Star, Crown, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  color: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
  buttonClass: string;
}

export default function MembershipPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [membershipData, setMembershipData] = useState({
    name: '',
    email: '',
    phone: '',
    instagramProfile: '',
    referenceCode: '',
    birthDate: ''
  });
  const [activeCursor, setActiveCursor] = useState<'bronze' | 'silver' | 'gold' | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [backendPlans, setBackendPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load membership plans from backend
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await apiService.getMembershipPlans();
        if (response.plans && response.plans.length > 0) {
          setBackendPlans(response.plans);
        }
      } catch (error) {
        console.error('Error loading membership plans:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  // Helper function to convert hex color to gradient
  const hexToGradient = (hex: string) => {
    // Use the hex color for solid background, or create a subtle gradient
    return hex;
  };

  // Get icon based on plan ID
  const getPlanIcon = (planId: string) => {
    switch(planId) {
      case 'bronze': return <Star className="w-8 h-8" />;
      case 'silver': return <Crown className="w-8 h-8" />;
      case 'gold': return <Gem className="w-8 h-8" />;
      default: return <Star className="w-8 h-8" />;
    }
  };

  // Get button class based on plan ID
  const getButtonClass = (planId: string) => {
    switch(planId) {
      case 'bronze': return 'btn-bronze';
      case 'silver': return 'btn-silver';
      case 'gold': return 'btn-gold';
      default: return 'btn-bronze';
    }
  };

  // Build plans array from backend data or fallback to translations
  const plans: MembershipPlan[] = backendPlans.length > 0
    ? backendPlans.map(plan => ({
        id: plan.id,
        name: language === 'tr' ? (plan.name || plan.nameEn) : (plan.nameEn || plan.name),
        price: plan.price || 0,
        period: language === 'tr' ? 'aylık' : 'monthly',
        color: hexToGradient(plan.color || '#C0C0C0'),
        icon: getPlanIcon(plan.id),
        buttonClass: getButtonClass(plan.id),
        popular: plan.popular || false,
        features: language === 'tr' ? (plan.features || []) : (plan.featuresEn || [])
      }))
    : [
      {
        id: 'bronze',
        name: t('membership.bronze.title'),
        price: parseInt(t('membership.bronze.price')),
        period: t('membership.bronze.period'),
        color: 'from-gray-300 to-gray-500',
        icon: <Star className="w-8 h-8" />,
        buttonClass: 'btn-bronze',
        features: [
          t('membership.bronze.feature1'),
          t('membership.bronze.feature2'),
          t('membership.bronze.feature3')
        ]
      },
      {
        id: 'silver',
        name: t('membership.silver.title'),
        price: parseInt(t('membership.silver.price')),
        period: t('membership.silver.period'),
        color: 'from-yellow-400 to-yellow-600',
        icon: <Crown className="w-8 h-8" />,
        buttonClass: 'btn-silver',
        popular: true,
        features: [
          t('membership.silver.feature1'),
          t('membership.silver.feature2'),
          t('membership.silver.feature3'),
          t('membership.silver.feature4'),
          t('membership.silver.feature5'),
          t('membership.silver.feature6'),
          t('membership.silver.feature7')
        ]
      },
      {
        id: 'gold',
        name: t('membership.gold.title'),
        price: parseInt(t('membership.gold.price')),
        period: t('membership.gold.period'),
        color: 'from-[#0EBFE9] to-[#0A8AAD]',
        icon: <Gem className="w-8 h-8" />,
        buttonClass: 'btn-gold',
        features: [
          t('membership.gold.feature1'),
          t('membership.gold.feature2'),
          t('membership.gold.feature3'),
          t('membership.gold.feature4'),
          t('membership.gold.feature5'),
          t('membership.gold.feature6'),
          t('membership.gold.feature7'),
          t('membership.gold.feature8'),
          t('membership.gold.feature9'),
          t('membership.gold.feature10'),
          t('membership.gold.feature11'),
          t('membership.gold.feature12'),
          t('membership.gold.feature13')
        ]
      }
    ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      toast.error(t('membership.selectPlanError'));
      return;
    }
    
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      const membership = {
        plan: selectedPlan,
        planName: plan?.name,
        planPrice: plan?.price,
        memberInfo: membershipData
      };
      
      const response = await apiService.saveMembership(membership);

      // Ödeme akışı: üyelik kaydedildikten sonra ödemeye yönlendir
      const price = plan?.price || 0;
      if (price > 0) {
        const paymentRes = await apiService.createPaymentCheckout({
          amount: price,
          paymentType: 'membership',
          referenceId: response.membershipId,
          description: `${plan?.name} Üyelik`,
          buyerInfo: {
            name:   membershipData.name,
            email:  membershipData.email,
            phone:  membershipData.phone,
            userId: session?.user?.id,
          },
        });

        if (paymentRes.error) {
          toast.error('Ödeme başlatılamadı: ' + paymentRes.error);
          return;
        }

        navigate('/payment', {
          state: {
            checkoutFormContent: paymentRes.checkoutFormContent,
            conversationId:      paymentRes.conversationId,
            amount:              price,
            description:         `${plan?.name} Üyelik`,
          },
        });
        return;
      }

      toast.success(t('membership.success').replace('{planName}', plan?.name || ''));

      // Reset form
      setSelectedPlan('');
      setMembershipData({
        name: '',
        email: '',
        phone: '',
        instagramProfile: '',
        referenceCode: '',
        birthDate: ''
      });
    } catch (error) {
      console.error('Membership application error:', error);
      toast.error(t('membership.error'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMembershipData({
      ...membershipData,
      [e.target.name]: e.target.value
    });
  };

  const handlePlanSelect = (planId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedPlan(planId);
    
    // Mouse pozisyonunu kaydet
    setCursorPosition({ x: e.clientX, y: e.clientY });
    
    // Önce cursor'ı kapat (eğer zaten açıksa)
    setActiveCursor(null);
    
    // Hemen ardından yeni cursor'ı göster
    // Bu sayede aynı plan tekrar seçilse bile cursor yeniden görünür
    // requestAnimationFrame kullanarak React'ın render cycle'ını bekliyoruz
    requestAnimationFrame(() => {
      if (planId === 'bronze' || planId === 'silver' || planId === 'gold') {
        setActiveCursor(planId as 'bronze' | 'silver' | 'gold');
      }
    });
    
    // Scroll to form section
    setTimeout(() => {
      const formSection = document.getElementById('membership-form');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const hideFingerprintCursor = () => {
    setActiveCursor(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <AnimatedStars />
      <Navbar />
      {activeCursor && (
        <FingerprintCursor 
          isVisible={true}
          onHide={hideFingerprintCursor}
          membershipType={activeCursor}
          initialPosition={cursorPosition}
        />
      )}
      
      {/* Hero Section */}
      <section className="relative z-10 pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 text-primary">{t('membership.title')}</h1>
            <p className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto px-4">
              {t('membership.subtitle')}
            </p>
            <div className="w-24 h-1 bg-primary mx-auto mt-4 md:mt-6"></div>
          </div>
        </div>
      </section>

      {/* Membership Plans */}
      <section className="relative z-10 py-8 md:py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {(plans || []).map((plan) => (
              <div 
                key={`membership-plan-${plan.id}`}
                className={`relative bg-gray-800/30 rounded-lg p-8 hover:bg-gray-800/50 transition-all duration-300 transform hover:scale-105 border-2 flex flex-col h-full ${
                  selectedPlan === plan.id ? 'border-primary' : 'border-transparent hover:border-gray-600'
                } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      {t('membership.silver.popular')}
                    </div>
                  </div>
                )}
                
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-white ${
                    plan.color.startsWith('#') ? '' : `bg-gradient-to-br ${plan.color}`
                  }`}
                  style={plan.color.startsWith('#') ? { 
                    background: `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}dd 100%)` 
                  } : undefined}
                >
                  {plan.icon}
                </div>
                
                <div className="text-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    ₺{plan.price}
                    <span className="text-base md:text-lg text-gray-400">/{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8 flex-grow">
                  {(plan.features || []).map((feature, index) => (
                    <li key={`${plan.id}-feature-${index}`} className="flex items-start gap-2 md:gap-3">
                      <Check className="w-4 md:w-5 h-4 md:h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm md:text-base text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="text-center mt-auto">
                  <button
                    onClick={(e) => handlePlanSelect(plan.id, e)}
                    className={`w-full py-2 md:py-3 px-4 md:px-6 rounded-lg font-semibold text-sm md:text-base text-center flex items-center justify-center ${plan.buttonClass} ${
                      selectedPlan === plan.id ? 'btn-selected' : ''
                    }`}
                  >
                    {selectedPlan === plan.id ? t('membership.selected') : t('membership.selectPlan')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Form */}
      {selectedPlan && (
        <section id="membership-form" className="relative z-10 py-8 md:py-16 px-4 md:px-6 bg-gradient-to-r from-gray-900 to-black">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-primary">{t('membership.form.title')}</h2>
              <p className="text-sm md:text-base text-gray-300">
                {t('membership.form.selectedPlan')} <span className="text-primary font-semibold">
                  {plans.find(p => p.id === selectedPlan)?.name}
                </span>
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-gray-800/30 p-4 md:p-8 rounded-lg space-y-4 md:space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  {t('membership.form.name')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={membershipData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('membership.form.namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t('membership.form.email')} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={membershipData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('membership.form.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  {t('membership.form.phone')} *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={membershipData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('membership.form.phonePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="instagramProfile" className="block text-sm font-medium mb-2">
                  {t('membership.form.instagram')} *
                </label>
                <input
                  type="url"
                  id="instagramProfile"
                  name="instagramProfile"
                  required
                  value={membershipData.instagramProfile}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('membership.form.instagramPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="referenceCode" className="block text-sm font-medium mb-2">
                  {t('membership.form.referenceCode')} *
                </label>
                <input
                  type="text"
                  id="referenceCode"
                  name="referenceCode"
                  required
                  value={membershipData.referenceCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('membership.form.referenceCodePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium mb-2">
                  {t('membership.form.birthDate')} *
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  required
                  value={membershipData.birthDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="bg-gray-700/30 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{t('membership.form.summary')}</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>{t('membership.form.plan')} {plans.find(p => p.id === selectedPlan)?.name}</p>
                  <p>{t('membership.form.monthlyFee')} ₺{plans.find(p => p.id === selectedPlan)?.price}</p>
                  <p>{t('membership.form.startDate')} {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                <p>
                  {t('membership.form.note')}
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-accent transition-colors py-3 rounded-lg font-semibold text-center flex items-center justify-center"
              >
                {t('membership.form.submit')}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section className="relative z-10 py-8 md:py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary">{t('membership.benefits.title')}</h2>
            <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto px-4">
              {t('membership.benefits.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              {
                title: t('membership.benefits.reservation'),
                description: t('membership.benefits.reservationDesc'),
                icon: '🎫'
              },
              {
                title: t('membership.benefits.events'),
                description: t('membership.benefits.eventsDesc'),
                icon: '🎪'
              },
              {
                title: t('membership.benefits.discounts'),
                description: t('membership.benefits.discountsDesc'),
                icon: '💰'
              },
              {
                title: t('membership.benefits.vip'),
                description: t('membership.benefits.vipDesc'),
                icon: '👑'
              }
            ].map((benefit, index) => (
              <div key={index} className="text-center p-4 md:p-6 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all">
                <div className="text-3xl md:text-4xl mb-3 md:mb-4">{benefit.icon}</div>
                <h3 className="text-base md:text-xl font-semibold mb-2 md:mb-3">{benefit.title}</h3>
                <p className="text-xs md:text-sm text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}