import React from 'react';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';


// Ionic's components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonImg,
  IonPage,
  IonToolbar,
} from '@ionic/react';

// Styles
import '../Main.css';
import ExportForm from '../components/ExportForm';

const DefaultPage: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { themeColor } = useTheme(); 
  const color = themeColor.split("-")[1]; // Extracts "red"
  

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
        {/* Screen Header */}
        <section className='centered-container'>
          <h2 className='screen-title'>{t('export.screen_title')}</h2>
          <IonImg
            src={`assets/images/export/${color}-export.svg`} // Dynamically set the SVG source
            alt="Theme image"
            className='screen-narrow-img'
          ></IonImg>
        </section>
        

        <section>
          <h6 className="section-title">{t('export.subtitle')}</h6>
          <p>{t('export.what_to_do')}</p>


          <ExportForm />
        </section>

      </IonContent>
    </IonPage>
  );
};

export default DefaultPage;