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
        <h1>Testing GIT CONNECTION</h1>
        <h2>Some Content</h2>
      </IonContent>
    </IonPage>
  );
};

export default DefaultPage;