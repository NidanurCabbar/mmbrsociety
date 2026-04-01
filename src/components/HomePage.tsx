import React, { useState, useEffect, useRef } from 'react';
import ScrollVideoSection from './ScrollVideoSection';
import Navbar from './Navbar';
import EventsSection from './EventsSection';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronDown, Music, Users, Award, Clock, Send, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { apiService } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteContent } from '../contexts/SiteContentContext';
import { motion, useInView, useScroll, useTransform } from 'motion/react';
import heroImage from 'figma:asset/0618420b21af33954d02338a79238933b9dc0e0e.png';
import mmbrImage from 'figma:asset/68704da2cc678fcc5a8312226b6a3dd981d64a36.png';

export default function HomePage() {
  const { session, user } = useAuth();
  const { t, language } = useLanguage();
  const { content: siteContent } = useSiteContent();
  const [scrollY, setScrollY] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  // Animation refs
  const aboutSectionRef = useRef(null);
  const contentRef = useRef(null);
  const imageRef = useRef(null);
  
  // Use scroll progress for the about section
  const { scrollYProgress } = useScroll({
    target: aboutSectionRef,
    offset: ["start end", "end start"]
  });
  
  // Use in-view detection for triggering animations
  const isContentInView = useInView(contentRef, { once: true, margin: "-100px" });
  const isImageInView = useInView(imageRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiService.saveMessage({
        ...formData,
        phone: '',
        subject: 'General Contact'
      });
      toast.success(t('contact.success'));
      
      // Reset form and close modal
      setFormData({
        name: '',
        email: '',
        message: ''
      });
      setIsContactModalOpen(false);
    } catch (error) {
      console.error('Message sending error:', error);
      toast.error(t('contact.error'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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
      {/* Scroll-driven video — ana içerik bunun hemen altında başlar */}
      <ScrollVideoSection framesPath="/frames" frameCount={151} scrollHeight={3000} skipInitialFrames={20} />

      <Navbar />
      
      {/* Hero Section */}
      <section className="h-screen relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={siteContent.hero.image || heroImage}
            alt="Club Interior"
            className="w-full h-full object-cover opacity-85 brightness-110 contrast-110 saturate-110"
            onError={(e) => { e.currentTarget.src = heroImage; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70"></div>
        </div>
        

        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-primary" />
        </div>
      </section>

      {/* Events Section */}
      <EventsSection />

      {/* About Section - Full Content */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl md:text-5xl font-bold mb-6 text-primary text-glow"
            >
              {t('home.about.title')}
            </motion.h2>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: 96 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-1 bg-primary mx-auto"
            />
          </motion.div>
        </div>
      </section>

      {/* Main About Content */}
      <section ref={aboutSectionRef} className="py-10 md:py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div 
              ref={contentRef}
              initial={{ opacity: 0, x: -100 }}
              animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -100 }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut",
                staggerChildren: 0.2
              }}
              className="space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <motion.h3 
                  initial={{ opacity: 0, x: -30 }}
                  animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-3xl font-bold mb-6 text-primary"
                >
                  {t('home.about.story')}
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, x: -40 }}
                  animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-lg text-gray-300 leading-relaxed mb-6"
                >
                  {language === 'tr' ? (siteContent.about.desc1Tr || t('home.about.description1')) : (siteContent.about.desc1En || t('home.about.description1'))}
                </motion.p>
                <motion.p 
                  initial={{ opacity: 0, x: -40 }}
                  animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="text-gray-400 leading-relaxed mb-6"
                >
                  {language === 'tr' ? (siteContent.about.desc2Tr || t('home.about.description2')) : (siteContent.about.desc2En || t('home.about.description2'))}
                </motion.p>
                <motion.p 
                  initial={{ opacity: 0, x: -40 }}
                  animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="text-gray-400 leading-relaxed"
                >
                  {language === 'tr' ? (siteContent.about.desc3Tr || t('home.about.description3')) : (siteContent.about.desc3En || t('home.about.description3'))}
                </motion.p>
              </motion.div>
            </motion.div>

            {/* Right Image */}
            <motion.div 
              ref={imageRef}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={isImageInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 100, scale: 0.9 }}
              transition={{ 
                duration: 1, 
                ease: "easeOut",
                delay: 0.3
              }}
              className="relative"
            >
              <motion.div 
                initial={{ opacity: 0, rotateY: 45 }}
                animate={isImageInView ? { opacity: 1, rotateY: 0 } : { opacity: 0, rotateY: 45 }}
                transition={{ duration: 1.2, delay: 0.5 }}
                className="w-full h-[350px] md:h-[600px] rounded-lg shadow-2xl overflow-hidden bg-gradient-to-br from-red-900 to-black flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 1.3 }}
                  animate={isImageInView ? { scale: 1 } : { scale: 1.3 }}
                  transition={{ duration: 1.5, delay: 0.6 }}
                  className="w-full h-full"
                >
                  <ImageWithFallback
                    src={siteContent.about.image || mmbrImage}
                    alt="MMBR - No Outsiders, No Stories Told"
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              </motion.div>
              
              {/* Animated border effect */}
              <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={isImageInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-lg blur-sm"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 md:py-16 px-4 md:px-6 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary">{t('home.features.title')}</h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          {/* Why MMBR List */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-br from-primary/10 to-gray-800/30 border border-primary/20 rounded-2xl p-8 backdrop-blur-sm">
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-base md:text-lg">{t('home.features.list1')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-base md:text-lg">{t('home.features.list2')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-base md:text-lg">{t('home.features.list3')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-base md:text-lg">{t('home.features.list4')}</span>
                </li>
                <li className="flex items-start gap-3 text-gray-200">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-base md:text-lg">{t('home.features.list5')}</span>
                </li>
              </ul>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.05,
                  transition: { duration: 0.3 }
                }}
                className="text-center p-6 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all group cursor-pointer"
              >
                <motion.div 
                  whileHover={{ 
                    rotate: 360,
                    transition: { duration: 0.6 }
                  }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4 text-primary group-hover:bg-primary group-hover:text-white transition-all"
                >
                  {feature.icon}
                </motion.div>
                <h4 className="text-xl font-semibold mb-3 text-white">{feature.title}</h4>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Operating Hours Section */}
      <section className="py-10 md:py-16 px-4 md:px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 md:mb-12"
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary">
              {t('home.hours.title')}
            </h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              {t('home.hours.subtitle')}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-2xl p-8 border border-primary/20 relative overflow-hidden">
              {/* Background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
              
              <div className="relative z-10">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Friday */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-6 bg-primary/10 rounded-xl border border-primary/30"
                  >
                    <div className="text-2xl font-bold text-[#CEAD81] mb-2">
                      {t('home.hours.friday')}
                    </div>
                    <div className="text-white text-lg mb-2">
                      {t('home.hours.fridayTime')}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {t('home.hours.specialNight')}
                    </div>
                  </motion.div>

                  {/* Saturday */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="text-center p-6 bg-accent/10 rounded-xl border border-accent/30"
                  >
                    <div className="text-2xl font-bold text-[#CEAD81] mb-2">
                      {t('home.hours.saturday')}
                    </div>
                    <div className="text-white text-lg mb-2">
                      {t('home.hours.saturdayTime')}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {t('home.hours.mainEvent')}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Event Rules & Reservation Information */}
      <section className="py-10 md:py-16 px-4 md:px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            {/* Title with Icon */}
            <div className="text-center mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse"></div>
                  <ShieldAlert className="w-8 h-8 md:w-10 md:h-10 text-primary relative z-10" strokeWidth={2.5} />
                </motion.div>
                <h3 className="text-2xl md:text-3xl font-bold text-primary">
                  {t('home.rules.title')}
                </h3>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative bg-gradient-to-br from-red-900/20 to-gray-800/30 border border-primary/30 rounded-2xl p-5 md:p-8 backdrop-blur-sm overflow-hidden"
            >
              {/* Subtle corner accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-tr-full"></div>
              
              <ul className="space-y-4 relative z-10">
                <motion.li 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex items-start gap-3 text-gray-200"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_rgba(173,48,46,0.6)]"></div>
                  <span className="text-base leading-relaxed">{t('home.rules.rule1')}</span>
                </motion.li>
                <motion.li 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="flex items-start gap-3 text-gray-200"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_rgba(173,48,46,0.6)]"></div>
                  <span className="text-base leading-relaxed">{t('home.rules.rule2')}</span>
                </motion.li>
                <motion.li 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="flex items-start gap-3 text-gray-200"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_rgba(173,48,46,0.6)]"></div>
                  <span className="text-base leading-relaxed">{t('home.rules.rule3')}</span>
                </motion.li>
                <motion.li 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  className="flex items-start gap-3 text-gray-200"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_rgba(173,48,46,0.6)]"></div>
                  <span className="text-base leading-relaxed">{t('home.rules.rule4')}</span>
                </motion.li>
                <motion.li 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  className="flex items-start gap-3 text-gray-200"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_rgba(173,48,46,0.6)]"></div>
                  <span className="text-base leading-relaxed">{t('home.rules.rule5')}</span>
                </motion.li>
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact Preview */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-black">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-primary">{t('home.contact.title')}</h2>
          <p className="text-base md:text-lg text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto">
            {t('home.contact.description')}
          </p>
          
          <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
            <DialogTrigger asChild>
              <button className="inline-block bg-secondary hover:bg-primary transition-colors px-8 py-3 rounded-lg text-center">
                {t('home.contact.sendMessage')}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-primary">{t('home.contact.sendMessage')}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {t('contact.form.messagePlaceholder')}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-300">
                    {t('contact.form.name')} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                    placeholder={t('contact.form.namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-300">
                    {t('contact.form.email')} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                    placeholder={t('contact.form.emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2 text-gray-300">
                    {t('contact.form.message')} *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-white"
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-accent transition-colors py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {t('contact.form.submit')}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-6 md:py-8 px-4 md:px-6">
        <div className="container mx-auto text-center">
          <div className="text-2xl font-bold text-primary mb-4">MMBR</div>
          <p className="text-gray-400 mb-4">{t('footer.copyright')}</p>
          
          <div className="flex justify-center space-x-6">
            <a href="https://www.instagram.com/mmbrankara?igsh=czg4eTdmeG9vb3Bl" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}