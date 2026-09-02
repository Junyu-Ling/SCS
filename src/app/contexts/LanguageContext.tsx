import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'cn';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (en: string, cn: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'en' || saved === 'cn') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'cn' : 'en');
  };

  const t = (en: string, cn: string) => {
    return language === 'en' ? en : cn;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
