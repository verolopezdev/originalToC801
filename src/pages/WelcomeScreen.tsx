// src/pages/WelcomeScreen.tsx
import React from 'react';
import { useHistory } from 'react-router';
import { Preferences } from '@capacitor/preferences';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';


// Ionic's components
import { 
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonModal,
  IonPage, 
  IonTitle,
  IonToolbar 
} from '@ionic/react';


const WelcomeScreen: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  

  const handleContinueFree = async () => {
    // Save that the user selected free mode
    await Preferences.set({ key: 'userMode', value: 'free' });
    // Navigate to country selection
    history.push('/select-country');
  };

  const handleHaveAccount = async () => {
    await Preferences.set({ key: 'userMode', value: 'account' });
    // Navigate to your login route
    history.push('/login');
  };

  return (
    <>
      <div className="ion-page ion-justify-content-center ion-align-items-center ion-padding">
        <h2>Welcome</h2>
        <button onClick={handleHaveAccount}>Have Account</button>
        <button onClick={handleContinueFree}>Continue Free</button>
      </div>

      <IonPage>
        <IonContent className="ion-padding-horizontal">
          <div className="country-screen">
            {/* Logo and app name */}
            <div className="centered-container">
              <img
                src="/assets/images/logo.png"
                alt="App logo"
                className="big-logo"
              />
              <h1 className='app-name'>AppName</h1>
              <h4 className='app-type'>Expense Tracker</h4>
            </div>
  
            {/* Screen headers */}
            <h1 className='big-header'>{t('country_selection.big_heading')}</h1>
            <h5 className='country-header-prompt'>{t('country_selection.subheading')}</h5>
  
            {/* Have account button */}
            <IonButton expand="block" onClick={handleHaveAccount}>
              Have Account
            </IonButton>

            {/* Free button */}
            <IonButton expand="block" fill="outline" onClick={handleContinueFree}>
              Continue Free
            </IonButton>

          </div>
  
        </IonContent>
      </IonPage>
      
    </>
  );
};

export default WelcomeScreen;