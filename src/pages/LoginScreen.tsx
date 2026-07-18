import React from 'react';

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

const DefaultPage: React.FC = () => {
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
        <h1>Welcome back!</h1>
        <p>Let's get you signed in. Enter your registered email below.</p>
      </IonContent>
    </IonPage>
  );
};

export default DefaultPage;