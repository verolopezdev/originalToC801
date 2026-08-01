import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { Preferences } from '@capacitor/preferences';
import { useTranslation } from 'react-i18next';
import { loadUserLanguage } from "../i18n";
import { db } from '../db';

// Ionic components
import {
  IonButton, 
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';


const StartupRedirect: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  

  useEffect(() => {
    const checkRoute = async () => {
      const start = Date.now();
  
      // Load preferred language
      await loadUserLanguage();
  
      // User mode
      const { value: userMode } = await Preferences.get({ key: "userMode" });
  
      // Load user
      const user = await db.users.toCollection().first();
  
      const country = user?.selectedCountry;
      const hasValidCountry = !!country;
  
      // Minimum loading time
      const elapsed = Date.now() - start;
      const minimumTime = 2000;
  
      if (elapsed < minimumTime) {
        await new Promise(resolve =>
          setTimeout(resolve, minimumTime - elapsed)
        );
      }
  
      if (userMode === "free") {
        history.replace(hasValidCountry ? "/app/dashboard" : "/select-country");
      } else if (userMode === "account") {
        history.replace("/app/dashboard");
      } else {
        history.replace("/welcome");
      }
    };
  
    checkRoute();
  }, [history]);



  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="page-container centered-screen">
          <div className="centered-container">
            <img
              src="/assets/images/logo.png"
              alt="App logo"
              className="app-logo medium-logo"
            />

            <div className="mt-40">
              <IonSpinner name="dots" />
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StartupRedirect;