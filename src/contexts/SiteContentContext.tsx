import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../utils/api';

export interface SiteContent {
  hero: {
    image: string;
  };
  about: {
    desc1Tr: string;
    desc1En: string;
    desc2Tr: string;
    desc2En: string;
    desc3Tr: string;
    desc3En: string;
    image: string;
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    instagram: string;
    facebook: string;
    mapUrl: string;
  };
  hours: {
    fridayTime: string;
    saturdayTime: string;
  };
  rules: {
    rule1Tr: string; rule1En: string;
    rule2Tr: string; rule2En: string;
    rule3Tr: string; rule3En: string;
    rule4Tr: string; rule4En: string;
    rule5Tr: string; rule5En: string;
  };
}

const defaultContent: SiteContent = {
  hero: {
    image: ""
  },
  about: {
    desc1Tr: "MMBR, Ankara gece hayatına yeni bir standart getirmek için kurulmuş, üyelik bazlı, özel bir sosyal kulüptür.",
    desc1En: "MMBR is an exclusive membership-based social club established to bring a new standard to Ankara's nightlife.",
    desc2Tr: "MMBR'da amaç sadece eğlendirmek değil; aynı vizyonu, aynı frekansı ve aynı yaşam tarzını paylaşan insanları bir araya getirmektir.",
    desc2En: "At MMBR, the goal is not just to entertain; it is to bring together people who share the same vision, the same frequency and the same lifestyle.",
    desc3Tr: "MMBR, kalabalığın değil; doğru kalabalığın olduğu yerdir.",
    desc3En: "MMBR is where the right crowd is, not the big crowd.",
    image: ""
  },
  contact: {
    address: "Ankara, Türkiye",
    phone: "+90 000 000 00 00",
    email: "info@mmbrsociety.com",
    instagram: "https://instagram.com/mmbrsociety",
    facebook: "",
    mapUrl: "https://maps.google.com"
  },
  hours: {
    fridayTime: "23:00 - 03:00",
    saturdayTime: "23:00 - 03:00"
  },
  rules: {
    rule1Tr: "Girişlerde cinsiyet dengesi gözetilmektedir.",
    rule1En: "Gender balance is observed at entrances.",
    rule2Tr: "Smart Casual kıyafet kodu uygulanmaktadır.",
    rule2En: "Smart Casual dress code is enforced.",
    rule3Tr: "Tavır, kıyafet ve genel uygunluk değerlendirilir; uygun görülmeyenlere giriş reddedilebilir.",
    rule3En: "Attitude, attire, and general suitability are evaluated; entry may be refused for those deemed unsuitable.",
    rule4Tr: "Kapora yatırmamış olanlar için rezervasyon 23:30'dadır ve 30 dakika sonra iptal edilecektir.",
    rule4En: "Except for those who have paid a deposit, reservations are at 23:30 and will be canceled after 30 minutes.",
    rule5Tr: "Mekanda ses ve görüntü kaydı yapılmakta olup tanıtım amaçlı kullanılabilir.",
    rule5En: "Audio and video recordings are made at the venue and may be used for promotional purposes."
  }
};

interface SiteContentContextType {
  content: SiteContent;
  loading: boolean;
  refreshContent: () => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextType>({
  content: defaultContent,
  loading: false,
  refreshContent: async () => {}
});

export const useSiteContent = () => useContext(SiteContentContext);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [loading, setLoading] = useState(true);

  const refreshContent = useCallback(async () => {
    try {
      const response = await apiService.getSiteContent();
      if (response.content) {
        setContent({ ...defaultContent, ...response.content });
      }
    } catch (error) {
      console.error('Error loading site content:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  return (
    <SiteContentContext.Provider value={{ content, loading, refreshContent }}>
      {children}
    </SiteContentContext.Provider>
  );
}
