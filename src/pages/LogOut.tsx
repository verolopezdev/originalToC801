import React from 'react';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// Ionic components
import { 
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonMenuButton, 
  IonPage, 
  IonTitle, 
  IonToolbar 
} from '@ionic/react';

// Styles
import '../Main.css';

const LogOut: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>LogOut</IonTitle>
        </IonToolbar>
      </IonHeader>


      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <h2>Welcome to the LogOut Page!</h2>
      </IonContent>
    </IonPage>
  );
};

export default LogOut;
