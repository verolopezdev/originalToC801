import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';


// App components
import Plans from '../components/Plans';

// Ionic components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonImg,
  IonMenuButton,
  IonPage, 
  IonTitle,
  IonToolbar 
} from '@ionic/react';


// Styles
import '../Main.css';

const Billing: React.FC = () => {
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
          <h2 className='screen-title'>{t('billing.billing_title')}</h2>
          <IonImg
            src={`assets/images/billing/${color}-billing.svg`} // Dynamically set the SVG source
            alt="Backup image"
            className='screen-wide-img'
          ></IonImg>
          <h3>{t('billing.your_plan')}</h3>
        </section>

        {/* Choose a Plan */}
        <section>
          <Plans />
          <p>{t('billing.renew')} June 3, 2025</p>
        </section>

        <section className='centered-container'>
          <a className='link' href='https://www.datasur.net.ar/'>{t('common.learn_more')}</a>
        </section>
      </IonContent>
    </IonPage>
  );
};

export default Billing;