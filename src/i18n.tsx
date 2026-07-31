// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Device } from "@capacitor/device";

import { db } from './db';

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

export const supportedLngs = ["en", "es", "fr", "pt"];

const getDeviceLanguage = async () => {
  const { value: deviceLocale } = await Device.getLanguageTag();

  const language = deviceLocale?.split("-")[0] ?? "en";

  return supportedLngs.includes(language)
    ? language
    : "en";
};

export const initI18n = async () => {
  let language = "en";

  // Try existing user preference first
  const settings = await db.userSettings
    .where("key")
    .equals("settings")
    .first();

  if (settings?.language && supportedLngs.includes(settings.language)) {
    language = settings.language;
  } else {
    // First launch: use device language
    language = await getDeviceLanguage();
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      supportedLngs,
    });
};

export default i18n;