import React from "react";
import { IonSelect, IonSelectOption } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { useUser } from '../context/UserContext'; 


const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const { user, updateUser } = useUser();
  // Assuming there is only one user in the local database

  const changeLanguage = async (value: string) => {
    if (!user) return;
  
    await updateUser({
      language: value,
    });
  };

  return (
    <IonSelect
      label={t("settings.language")}
      value={user.language}
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