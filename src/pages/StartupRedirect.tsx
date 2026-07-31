import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { Preferences } from '@capacitor/preferences';
import { useTranslation } from 'react-i18next';

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

      // 1. Initialize everything
      // User mode is still stored in Preferences
      const { value: userMode } = await Preferences.get({ key: 'userMode' });

      // Load settings from the database
      const settings = await db.userSettings
        .where("key")
        .equals("settings")
        .first();

      const country = settings?.selectedCountry;
      const hasValidCountry = !!country;

      // 2. Ensure loading screen is visible long enough
      const elapsed = Date.now() - start;
      const minimumTime = 2000;

      if (elapsed < minimumTime) {
        await new Promise(resolve =>
          setTimeout(resolve, minimumTime - elapsed)
        );
      }

      // 3. Navigate

      if (userMode === 'free') {
        if (hasValidCountry) {
          history.replace('/app/dashboard');
        } else {
          history.replace('/select-country');
        }
      } else if (userMode === 'account') {
        history.replace('/app/dashboard');
      } else {
        history.replace('/welcome');
      }
    };

    checkRoute();
  }, [history]);

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="centered-screen">
          <div className="centered-container">
            <img
              src="/assets/images/logo.png"
              alt="App logo"
              className="medium-logo"
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