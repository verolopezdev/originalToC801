import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

import { validateEmail } from '../utils/validateName';
import { db, enableDexieCloud } from '../db'; // Import db and cloud initializer

// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar 
} from '@ionic/react';

// Styles
import '../Main.css';

const DefaultPage: React.FC = () => {
  const contentRef = useScrollToTop();
  const { t } = useTranslation();
  const history = useHistory();
  
  const [userEmail, setUserEmail] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({
    userEmail: null,
  });
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (
    field: string,
    value: string,
    setFieldValue: React.Dispatch<React.SetStateAction<string>>,
    validationFn: (value: string) => boolean,
    errorMessage: string
  ) => {
    setFieldValue(value);

    // Validate input
    let isValid = true;
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: t('common.empty_field') }));
      isValid = false;
    } else if (!validationFn(value)) {
      setErrors((prev) => ({ ...prev, [field]: errorMessage }));
      isValid = false;
    } else {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }

    setIsFormValid(isValid);
  };

  const handleSignIn = async () => {
    if (!isFormValid || !userEmail) return;

    setIsLoading(true);
    try {
      // 1. Ensure Dexie Cloud config is enabled
      //enableDexieCloud();

      // 2. Trigger Dexie Cloud's built-in OTP dialog modal pre-filled with the email
      await db.cloud.login({ email: userEmail });

      console.log("✅ Successfully logged in via Dexie Cloud!");
      
      // 3. Navigate the user to their main dashboard or profile
      history.replace('/app/dashboard');
    } catch (error) {
      console.error("❌ Login cancelled or failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <div className="centered-screen">
          <div className="centered-container">
            <img
              src="/assets/images/logo.png"
              alt="App logo"
              className="big-logo"
            />
            <h1 className='app-name'>AppName</h1>
            <h4 className='app-type'>Expense Tracker</h4>
          </div>
          <h1>Welcome back!</h1>
          <p>Let's get you signed in. Enter your registered email below.</p>
          
          <section>
            {/* User's email */}
            <div className='form-item'>
              <div className="input-container">
                <label>Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) =>
                    handleInputChange(
                      'userEmail',
                      e.target.value,
                      setUserEmail,
                      validateEmail,
                      t('profile.invalid_email')
                    )
                  }
                  placeholder={t('profile.type_email')}
                  className={`input ${errors.userEmail ? 'invalid' : ''}`}
                />
                {errors.userEmail && <p className="error-text">{errors.userEmail}</p>}
              </div>
            </div>

            <IonButton
              className="block"
              disabled={!isFormValid || isLoading}
              onClick={handleSignIn}
            >
              {isLoading ? 'Connecting...' : t('common.continue')}
            </IonButton>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DefaultPage;