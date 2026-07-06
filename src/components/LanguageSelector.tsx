import React, { useState, useEffect } from 'react';
import { IonSelect, IonSelectOption } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Preferences } from '@capacitor/preferences';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Load initial language from Capacitor Preferences
  useEffect(() => {
    const loadLanguage = async () => {
      const prefLang = (await Preferences.get({ key: 'i18nextLng' })).value;
      if (prefLang && prefLang !== selectedLanguage) {
        setSelectedLanguage(prefLang);
        i18n.changeLanguage(prefLang);
      }
    };
    loadLanguage();
  }, []);

  // Handle change language 
  const changeLanguage = async (value: string) => {
    setSelectedLanguage(value);

    // Save to Capacitor Preferences
    await Preferences.set({ key: 'i18nextLng', value });

    // Change i18n language
    i18n.changeLanguage(value);
  };

  return (
    <IonSelect
      label={t('settings.language')}
      value={selectedLanguage}
      onIonChange={(e) => changeLanguage(e.detail.value)}
      className="language-select"
      interface="popover"
    >
      <IonSelectOption value="en">English</IonSelectOption>
      <IonSelectOption value="es">Español</IonSelectOption>
      <IonSelectOption value="fr">Française</IonSelectOption>
      <IonSelectOption value="pt">Português</IonSelectOption>
    </IonSelect>
  );
};

export default LanguageSelector;
