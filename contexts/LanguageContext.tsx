import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tmdbService } from '../services/tmdbService';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  
  // Initialize from i18n.language, fallback to 'en'
  const [currentLanguage, setCurrentLanguage] = useState<string>(
    i18n.language ? i18n.language.split('-')[0] : 'en'
  );

  // Sync state and services when i18n language changes
  useEffect(() => {
    const lang = i18n.language || 'en';
    const normalizedLang = lang.split('-')[0];
    
    // Update local state
    setCurrentLanguage(normalizedLang);
    
    // Update TMDB Service
    const tmdbLang = normalizedLang === 'it' ? 'it-IT' : 'en-US';
    tmdbService.setLanguage(tmdbLang);
    
    // Update document language for accessibility
    document.documentElement.lang = normalizedLang;
  }, [i18n.language]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};