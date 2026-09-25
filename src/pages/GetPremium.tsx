import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

import PremiumHeader from '../components/PremiumHeader';
import SubscriptionDetails from '../components/SubscriptionDetails';
import Members from '../components/Members';
import ShareAccount from '../components/ShareAccount';
import { useHasGuest } from '../services/SharingService';

// Ionic components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonPage, 
  IonToolbar 
} from '@ionic/react';

// Ionic icons
import { 
  diamond, 
} from 'ionicons/icons';

// Styles
import '../Main.css';
import './GetPremium.css';
import Plans from '../components/Plans';

const GetPremium: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { user } = useUser();
  const hasGuest = useHasGuest(user.sharedRealmId);
  const isPremium = user.isPremium;

  const hasExpiredSubscription = user.subscriptionPlan !== 'free' && !user.isPremium;
  
  
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
        <div className="page-container">
          {isPremium ? (
            <>
              {/* Header */}
              <section className='premium-header'>
                <IonIcon icon={diamond} className='premium-icon'></IonIcon>
                <h2>{t('plans.subscription')}</h2>
              </section>

              <SubscriptionDetails />
              <Members />
              {!hasGuest && <ShareAccount />}

            </>
          ) : (
            <>
              <PremiumHeader expired={hasExpiredSubscription} />
              <Plans /> 
            </>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default GetPremium;