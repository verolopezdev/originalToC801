import React, { useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

// Ionic components
import { IonSelect, IonSelectOption } from '@ionic/react';


const ModePreferenceSelector: React.FC = () => {
  const { t } = useTranslation();
  const { modePreference, setModePreference } = useTheme();

  // Apply the selected mode
  useEffect(() => {
    if (modePreference === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', prefersDark);
    } else {
      document.body.classList.toggle('dark', modePreference === 'dark');
    }
  }, [modePreference]);

  return (
    <IonSelect
      label={t('settings.mode_preferences')} 
      value={modePreference}
      placeholder={t('themes.select_theme')}
      onIonChange={(e) => setModePreference(e.detail.value)}
      interface="popover"
    >
      <IonSelectOption value="light">{t('settings.light_mode')}</IonSelectOption>
      <IonSelectOption value="dark">{t('settings.dark_mode')}</IonSelectOption>
      <IonSelectOption value="system">{t('settings.default_mode')}</IonSelectOption>
    </IonSelect>
  );
};

export default ModePreferenceSelector;
