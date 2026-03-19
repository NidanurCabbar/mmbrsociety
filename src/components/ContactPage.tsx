import React, { useState } from 'react';
import Navbar from './Navbar';
import { MapPin, Phone, Mail, Clock, Send, Instagram, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteContent } from '../contexts/SiteContentContext';

export default function ContactPage() {
  const { t, language } = useLanguage();
  const { content: siteContent } = useSiteContent();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiService.saveMessage(formData);
      toast.success(t('contact.success'));
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Message sending error:', error);
      toast.error(t('contact.error'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const subjectOptions = [
    { value: '', label: language === 'tr' ? 'Konu seçin' : 'Select a subject' },
    { value: 'reservation', label: language === 'tr' ? 'Rezervasyon' : 'Reservation' },
    { value: 'event', label: language === 'tr' ? 'Etkinlik Bilgisi' : 'Event Information' },
    { value: 'membership', label: language === 'tr' ? 'Üyelik' : 'Membership' },
    { value: 'complaint', label: language === 'tr' ? 'Şikayet' : 'Complaint' },
    { value: 'suggestion', label: language === 'tr' ? 'Öneri' : 'Suggestion' },
    { value: 'other', label: language === 'tr' ? 'Diğer' : 'Other' }
  ];

  const contact = siteContent.contact;
  const hours = siteContent.hours;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 text-primary">{t('contact.title')}</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              {t('contact.subtitle')}
            </p>
            <div className="w-24 h-1 bg-primary mx-auto mt-6"></div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-primary">
                  {language === 'tr' ? 'İletişim Bilgileri' : 'Contact Information'}
                </h2>
                <p className="text-gray-300 mb-8">
                  {language === 'tr'
                    ? 'MMBR ile iletişime geçmek için aşağıdaki kanalları kullanabilirsiniz.'
                    : 'You can use the following channels to get in touch with MMBR.'}
                </p>
              </div>

              <div className="space-y-6">
                {contact.address && (
                  <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg">
                    <MapPin className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">{language === 'tr' ? 'Adres' : 'Address'}</h3>
                      <p className="text-gray-300">{contact.address}</p>
                    </div>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg">
                    <Phone className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">{language === 'tr' ? 'Telefon' : 'Phone'}</h3>
                      <a href={`tel:${contact.phone}`} className="text-gray-300 hover:text-primary transition-colors">
                        {contact.phone}
                      </a>
                      <p className="text-gray-400 text-sm">
                        {language === 'tr' ? 'Rezervasyon & Bilgi' : 'Reservations & Information'}
                      </p>
                    </div>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg">
                    <Mail className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">{language === 'tr' ? 'E-posta' : 'Email'}</h3>
                      <a href={`mailto:${contact.email}`} className="text-gray-300 hover:text-primary transition-colors">
                        {contact.email}
                      </a>
                      <p className="text-gray-400 text-sm">
                        {language === 'tr' ? 'Genel sorular' : 'General inquiries'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg">
                  <Clock className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">
                      {language === 'tr' ? 'Çalışma Saatleri' : 'Operating Hours'}
                    </h3>
                    <div className="text-gray-300 space-y-1">
                      <p>{language === 'tr' ? 'Cuma' : 'Friday'}: {hours.fridayTime}</p>
                      <p>{language === 'tr' ? 'Cumartesi' : 'Saturday'}: {hours.saturdayTime}</p>
                      <p className="text-gray-500 text-sm">
                        {language === 'tr' ? 'Diğer günler kapalı' : 'Closed other days'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="font-semibold mb-4">{language === 'tr' ? 'Sosyal Medya' : 'Social Media'}</h3>
                <div className="flex gap-4 flex-wrap">
                  {contact.instagram && (
                    <a
                      href={contact.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gray-800 hover:bg-primary transition-colors p-3 rounded-lg text-sm"
                    >
                      <Instagram className="w-4 h-4" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {contact.facebook && (
                    <a
                      href={contact.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gray-800 hover:bg-primary transition-colors p-3 rounded-lg text-sm"
                    >
                      <Facebook className="w-4 h-4" />
                      <span>Facebook</span>
                    </a>
                  )}
                  {!contact.instagram && !contact.facebook && (
                    <a
                      href="https://www.instagram.com/mmbrankara"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gray-800 hover:bg-primary transition-colors p-3 rounded-lg text-sm"
                    >
                      <Instagram className="w-4 h-4" />
                      <span>Instagram</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Map */}
              {contact.mapUrl && contact.mapUrl !== 'https://maps.google.com' && (
                <div>
                  <h3 className="font-semibold mb-4">{language === 'tr' ? 'Konum' : 'Location'}</h3>
                  <a
                    href={contact.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:text-accent transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    {language === 'tr' ? 'Google Maps\'te Görüntüle' : 'View on Google Maps'}
                  </a>
                </div>
              )}
            </div>

            {/* Contact Form */}
            <div className="bg-gray-800/30 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-6 text-primary">{t('contact.form.submit')}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    {t('contact.form.name')} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                    placeholder={t('contact.form.namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    {t('contact.form.email')} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                    placeholder={t('contact.form.emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    {t('contact.form.phone')}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                    placeholder={t('contact.form.phonePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2">
                    {t('contact.form.subject')} *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                  >
                    {subjectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    {t('contact.form.message')} *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-white"
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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}