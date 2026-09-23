import React from 'react'; 
import { useTranslation } from 'react-i18next'; 
import { IonLabel, IonList, IonNote } from '@ionic/react'; 
import { useUser } from '../context/UserContext';


const SubscriptionDetails: React.FC = () => {  
  const { t } = useTranslation(); 
  const { user } = useUser();
  
  
  return ( 
    <section className="subscription-details"> 
      <h6 className="section-title"> Plan Details </h6> 

      <ul>
        <li>Current plan: {user.subscriptionPlan}</li>
        <li>Status:  (Active)</li>
        <li>Purchase date</li>
        <li>Renewal date</li>
        <li>Expiration date: {user.subscriptionExpirationDate || '—'}</li>
        <li>Auto-renew ✓ </li>
      </ul>
    </section> 
  ); 
}; 

export default SubscriptionDetails;