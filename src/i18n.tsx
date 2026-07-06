// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Preferences } from '@capacitor/preferences';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
};

// Async init function to load stored language
export const initI18n = async () => {
  const { value: storedLng } = await Preferences.get({ key: 'i18nextLng' });

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: storedLng || 'en', // use stored language or fallback
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      supportedLngs: ['en', 'es', 'fr', 'pt'],
    });
};

export default i18n;
