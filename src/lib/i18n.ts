import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en';
import ar from '../locales/ar';

// Retrieve the saved language from localStorage (handled by our useLanguage store) or default to 'ar'
const savedLang = typeof window !== 'undefined' ? localStorage.getItem('zenith-dir') === 'ltr' ? 'en' : 'ar' : 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      ar,
    },
    lng: savedLang, // Set initial language synchronously to avoid lag
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
  });

export default i18n;
