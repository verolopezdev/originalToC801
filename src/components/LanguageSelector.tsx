import React from 'react';
import { IonSelect, IonSelectOption } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '../db';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  // Reactively load settings from the database
  const settings = useLiveQuery(() =>
    db.userSettings
      .where("key")
      .equals("settings")
      .first()
  );

  const changeLanguage = async (value: string) => {
    const settings = await db.userSettings
      .where("key")
      .equals("settings")
      .first();
  
    if (!settings) return;
  
    await db.userSettings.put({
      ...settings,
      language: value,
    });
  
    await i18n.changeLanguage(value);
  };

  
  return (
    <IonSelect
      label={t('settings.language')}
      value={settings?.language ?? 'en'}
      onIonChange={(e) => changeLanguage(e.detail.value)}
      className="language-select"
      interface="popover"
    >
      <IonSelectOption value="en">English</IonSelectOption>
      <IonSelectOption value="es">Español</IonSelectOption>
      <IonSelectOption value="fr">Français</IonSelectOption>
      <IonSelectOption value="pt">Português</IonSelectOption>
    </IonSelect>
  );
};

export default LanguageSelector;