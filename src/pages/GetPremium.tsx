import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '../context/UserContext';
import { db } from '../db';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

import PremiumHeader from '../components/PremiumHeader';
import SubscriptionDetails from '../components/SubscriptionDetails';
import Members from '../components/Members';
import ShareAccount from '../components/ShareAccount';
import PreviousGuests from '../components/PreviousGuests';
import Plans from '../components/Plans';
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
import { diamond } from 'ionicons/icons';

// Styles
import '../Main.css';
import './GetPremium.css';

const GetPremium: React.FC = () => {
  const contentRef = useScrollToTop(); 
  const { t } = useTranslation();
  const { user } = useUser();
  const hasActiveGuest = useHasGuest(user.sharedRealmId);
  const isPremium = user.isPremium;

  const hasExpiredSubscription = user.subscriptionPlan !== 'free' && !user.isPremium;

  // Fetch previous (inactive) guests from Dexie DB
  const previousGuests = useLiveQuery(
    async () => {
      if (!user?.sharedRealmId) return [];

      const users = await db.users
        .where('realmId')
        .equals(user.sharedRealmId)
        .toArray();

      return users.filter(
        (item) =>
          item.sharingRole === 'guest' && item.sharingStatus === 'inactive'
      );
    },
    [user?.sharedRealmId],
    []
  );

  const handleReinviteGuest = (userId: string) => {
    console.log('🔄 Reinvite guest:', userId);
  };

  return (
    <IonPage>
      <IonHeader className="page-header ion-no-border">
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
              <section className="premium-header">
                <IonIcon icon={diamond} className="premium-icon" />
                <h2>{t('plans.subscription')}</h2>
              </section>

              <SubscriptionDetails />
              {hasActiveGuest && <Members />}
              {!hasActiveGuest && <ShareAccount />}

              {/* Placed right after ShareAccount */}
              <PreviousGuests
                previousGuests={previousGuests || []}
                isAdmin={user?.sharingRole === 'admin'}
                onReinvite={handleReinviteGuest}
              />
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