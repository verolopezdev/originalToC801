import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Device } from "@capacitor/device";

import { db } from "./db";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";

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

/**
 * Fast synchronous initialization.
 * Call this before rendering React.
 */
export const initI18n = () => {
  return i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",          // temporary language
      fallbackLng: "en",
      supportedLngs,
      interpolation: {
        escapeValue: false,
      },
    });
};

/**
 * Loads the real language and switches to it.
 * Call this during StartupRedirect.
 */
export const loadUserLanguage = async () => {
  let language = "en";

  const user = await db.users.toCollection().first();

  if (user?.language && supportedLngs.includes(user.language)) {
    language = user.language;
  } else {
    language = await getDeviceLanguage();
  }

  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
};

export default i18n;