import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';
import es from './es.json';
import fr from './fr.json';

const savedLang = localStorage.getItem('kardaoke-lang') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
