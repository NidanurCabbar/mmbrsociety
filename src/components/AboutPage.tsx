import React from 'react';
import Navbar from './Navbar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Music, Users, Award } from 'lucide-react';
import mmbrImage from 'figma:asset/68704da2cc678fcc5a8312226b6a3dd981d64a36.png';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteContent } from '../contexts/SiteContentContext';

export default function AboutPage() {
  const { t, language } = useLanguage();
  const { content: siteContent } = useSiteContent();
  
  const features = [
    {
      icon: <Music className="w-8 h-8" />,
      title: t('home.features.worldDjs'),
      description: t('home.features.worldDjsDesc')
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: t('home.features.premiumService'),
      description: t('home.features.premiumServiceDesc')
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: t('home.features.qualityGuarantee'),
      description: t('home.features.qualityGuaranteeDesc')
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 text-primary">{t('home.about.title')}</h1>
            <div className="w-24 h-1 bg-primary mx-auto"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-primary">{t('home.about.story')}</h2>
                <p className="text-lg text-gray-300 leading-relaxed mb-6">
                  {language === 'tr'
                    ? (siteContent.about.desc1Tr || t('home.about.description1'))
                    : (siteContent.about.desc1En || t('home.about.description1'))}
                </p>
                <p className="text-gray-400 leading-relaxed mb-6">
                  {language === 'tr'
                    ? (siteContent.about.desc2Tr || t('home.about.description2'))
                    : (siteContent.about.desc2En || t('home.about.description2'))}
                </p>
                <p className="text-gray-400 leading-relaxed">
                  {language === 'tr'
                    ? (siteContent.about.desc3Tr || t('home.about.description3'))
                    : (siteContent.about.desc3En || t('home.about.description3'))}
                </p>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg shadow-2xl overflow-hidden bg-gradient-to-br from-red-900 to-black flex items-center justify-center">
                <ImageWithFallback
                  src={siteContent.about.image || mmbrImage}
                  alt="Mmbr - No Outsiders, No Stories Told"
                  className="w-full h-full object-contain"
                  onError={(e: any) => { e.currentTarget.src = mmbrImage; }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-6 text-primary">{t('home.features.title')}</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          {/* Why MMBR List - Moved to top */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary/10 to-gray-800/30 border border-primary/20 rounded-2xl p-8 backdrop-blur-sm">
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg">{t('home.features.list1')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg">{t('home.features.list2')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg">{t('home.features.list3')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg">{t('home.features.list4')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-lg">{t('home.features.list5')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}