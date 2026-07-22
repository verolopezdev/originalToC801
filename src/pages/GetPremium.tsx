import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// Ionic components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon, 
  IonLabel,
  IonPage, 
  IonToolbar 
} from '@ionic/react';

// Ionic icons
import { 
  checkmarkCircle, 
  diamond, 
  diamondOutline, 
} from 'ionicons/icons';

// Styles
import '../Main.css';
import './GetPremium.css';
import Plans from '../components/Plans';

const GetPremium: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { user } = useUser();

  const isPremium = user.isPremium;

  
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
        
          {isPremium ? (
            <>
              {/* Header */}
              <section className='premium-header'>
                <IonIcon icon={diamond} className='premium-icon'></IonIcon>
                <h2>{t('plans.subscription')}</h2>
                <ul>
                  <li>Current plan: {user.subscriptionPlan}</li>
                  <li>Status:  (Active)</li>
                  <li>Purchase date</li>
                  <li>Renewal date</li>
                  <li>Expiration date: {user.subscriptionExpirationDate}</li>
                  <li>Auto-renew ✓ </li>
                </ul>

              </section>

            </>
          ) : user.subscriptionPlan !== "free" && user.isPremium === false ? (
            <>
              <section className='premium-header'>
              <IonIcon icon={diamondOutline} className='premium-icon'></IonIcon>
              <h2>{t('plans.renew_premium')}</h2>
              <p className='screen-prompt'>Your subscription expired on...</p>
              <ul className='premium-list'>
                <li>
                  <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
                  <IonLabel>{t('plans.reason_1')}</IonLabel>
                </li>
                <li>
                  <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
                  <IonLabel>{t('plans.reason_2')}</IonLabel>
                </li>
                <li>
                  <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
                  <IonLabel>{t('plans.reason_3')}</IonLabel>
                </li>
              </ul>
              </section>

              {/* Choose a Plan */}
              <section>
                <h6 className='section-title'>{t('plans.choose_plan')}</h6>
                
                <Plans />
              </section>
            </>
          ) : (
            <>
              <section className='premium-header'>
              <IonIcon icon={diamondOutline} className='premium-icon'></IonIcon>
              <h2>{t('plans.unlock')}</h2>
              <p className='screen-prompt'>{t('plans.prompt')}</p>
              <ul className='premium-list'>
                <li>
                  <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
                  <IonLabel>{t('plans.reason_1')}</IonLabel>
                </li>
                <li>
                  <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
                  <IonLabel>{t('plans.reason_2')}</IonLabel>
                </li>
                <li>
                  <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
                  <IonLabel>{t('plans.reason_3')}</IonLabel>
                </li>
              </ul>
              </section>

              {/* Choose a Plan */}
              <section>
                <h6 className='section-title'>{t('plans.choose_plan')}</h6>
                
                <Plans />
              </section>
            </>
          )}

        <section className='centered-container'>
          <a className='link' href='https://www.datasur.net.ar/'>{t('common.learn_more')}</a>
        </section>
      </IonContent>
    </IonPage>
  );
};

export default GetPremium;