// src/pages/WelcomeScreen.tsx
import React from 'react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';

// Ionic's components
import { 
  IonButton,
  IonContent, 
  IonPage, 
} from '@ionic/react';


const WelcomeScreen: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const handleContinueFree = async () => {
    history.push('/select-country');
  };

  const handleHaveAccount = async () => {
    history.push('/login');
  };

  return (
    <IonPage>
      <IonContent className="ion-padding-horizontal">
        <div className="centered-screen">  
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
            {t('accounts.have_account')}
          </IonButton>

          {/* Free button */}
          <IonButton expand="block" fill="outline" onClick={handleContinueFree}>
            {t('accounts.continue_free')}
          </IonButton>

        </div>

      </IonContent>
    </IonPage>
  );
};

export default WelcomeScreen;