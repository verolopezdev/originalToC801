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

const HelpPage: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 

  return (
    <IonPage>
      <div className="background-bubbles">
        <div className="bubble bubbleLeft"></div>
        <div className="bubble bubbleTop"></div>
      </div>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>HelpPage</IonTitle>
        </IonToolbar>
      </IonHeader>


      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <h2>Welcome to the HelpPage Page!</h2>
      </IonContent>
    </IonPage>
  );
};

export default HelpPage;
