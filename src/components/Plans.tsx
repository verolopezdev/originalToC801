import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { SubscriptionPlan } from '../db';
import { Preferences } from '@capacitor/preferences';
import { activatePremium } from "../services/PremiumService";


// Ionic components
import { 
  IonAlert,
  IonButton,
  IonChip,
  IonIcon, 
  IonLabel,
  IonNote,
} from '@ionic/react';

// Ionic icons
import { 
  checkmarkCircle, 
  star 
} from 'ionicons/icons';

// Styles
import '../Main.css';
import './Plans.css';


const Plans: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(user.subscriptionPlan);
  const [showAlert, setShowAlert] = useState(false);


    const simulatePremiumPurchase = async () => {
      await activatePremium(
        user.userId,
        "monthly",
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );

      await Preferences.set({ key: 'userMode', value: 'account' });
    };
  
  
  
  return(
    <>
      {/* Monthly */}
      <div 
        className={`plan-item ${selectedPlan === 'monthly' ? 'selected-plan' : ''}`}
        onClick={() => setSelectedPlan('monthly')}
      >
        <div className='left-col'>
          <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
        </div>
        <div className='center-col'>
          <div>$6.99 {t('plans.per_month')}</div>
          <IonNote>{t('plans.monthly_subs')}</IonNote>
        </div>
      </div>

      {/* Quarterly */}
      <div
        className={`plan-item ${selectedPlan === 'quarterly' ? 'selected-plan' : ''}`}
        onClick={() => setSelectedPlan('quarterly')}
      >
        <div className='left-col'>
          <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
        </div>
        <div className='center-col'>
          <div>$17.99 {t('plans.per_quarter')}</div>
          <IonNote>{t('plans.quarterly_subs')}</IonNote>
        </div>
      </div>

      {/* Yearly */}
      <div
        className={`plan-item ${selectedPlan === 'yearly' ? 'selected-plan' : ''}`}
        onClick={() => setSelectedPlan('yearly')}
      >
        <div className='left-col'>
          <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start"></IonIcon>
        </div>
        <div className='center-col'>
          <div>$59.99 {t('plans.per_year')}</div>
          <IonNote>{t('plans.annual_subs')}</IonNote>
        </div>
        <div className='right-col'>
          <IonChip slot="end">
            <IonIcon icon={star}></IonIcon>
            <IonLabel>{t('plans.save')} 20%</IonLabel>
          </IonChip>
        </div>
      </div>

      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header="Subscription"
        message="Your subscription has been updated successfully."
        buttons={['OK']}
      />

      {import.meta.env.DEV && (
        <IonButton
          expand="block"
          color="danger"
          onClick={simulatePremiumPurchase}
        >
          Simulate Premium
        </IonButton>
      )}
      
{/*       <IonButton expand="block" onClick={handleSubscribe}>
        {user.subscriptionPlan !== 'free' && user.isPremium === false ? ('Renew Subscription') : ('Subscribe Now')}
      </IonButton>
 */}    </>
  )
}

export default Plans;