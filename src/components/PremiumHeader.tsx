import React from 'react'; 
import { useTranslation } from 'react-i18next'; 
import { IonIcon, IonLabel } from '@ionic/react'; 
import { checkmarkCircle, diamondOutline, } from 'ionicons/icons'; 

interface PremiumHeaderProps { expired?: boolean; } 

const PremiumHeader: React.FC<PremiumHeaderProps> = (
  { expired = false, }
) => { 
  const { t } = useTranslation(); 
  
  return ( 
    <section className="premium-header"> 
      <IonIcon icon={diamondOutline} className="premium-icon" /> 
      <h2> {expired ? t('plans.renew_premium') : t('plans.unlock')} </h2> 
      <p className="screen-prompt"> {expired ? 'Your subscription expired on...' : t('plans.prompt')} </p> 
      
      <ul className="premium-list"> 
        <li> 
          <IonIcon aria-hidden="true" icon={checkmarkCircle} /> 
          <IonLabel> {t('plans.reason_1')} </IonLabel> 
        </li> 
        <li> 
          <IonIcon aria-hidden="true" icon={checkmarkCircle} /> 
          <IonLabel> {t('plans.reason_2')} </IonLabel> 
        </li> 
        <li> 
          <IonIcon aria-hidden="true" icon={checkmarkCircle} /> 
          <IonLabel> {t('plans.reason_3')} </IonLabel> 
        </li> 
      </ul> 
    </section> 
    ); 
  }; 
  
export default PremiumHeader;