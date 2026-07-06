import React from 'react';
import { useTranslation } from 'react-i18next';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// Ionic's components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar 
} from '@ionic/react';

// Styles
import '../Main.css';

const SplashScreen: React.FC = () => {
  const { t } = useTranslation();
  const contentRef = useScrollToTop(); // use the custom hook 

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal"  ref={contentRef}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#FFFFFF', // Use your App's background color
          color: '#3498db', // Use your App's primary brand color
          fontFamily: 'sans-serif'
        }}>
          
          {/* 1. App Logo/Branding */}
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
            {/* Placeholder for your actual logo component or SVG */}
            💰 {/* Replace with your app logo/icon */}
          </div>
          
          {/* 2. Loading Animation (Subtle Spinner) */}
          <div className="spinner-animation" style={{
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderTop: '4px solid #3498db', // Brand Color
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            animation: 'spin 1s linear infinite',
            marginBottom: '15px'
          }} />

          {/* 3. Conditional Feedback Text */}
          <p style={{ margin: 0, fontSize: '1.1rem' }}>
            loading message
          </p>

          {/* You must include the CSS animation definition somewhere in your global styles: */}
          {/* @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } */}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SplashScreen;