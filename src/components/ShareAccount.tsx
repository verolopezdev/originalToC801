import React, { useState } from 'react'; 
import { useTranslation } from 'react-i18next'; 
import { IonButton, } from '@ionic/react'; 
import { useUser } from '../context/UserContext';

import { shareAccountWithGuest } from '../services/SharingService';

const ShareAccount: React.FC = () => { 
  const { t } = useTranslation(); 
  const { user } = useUser();
  
  const [guestEmail, setGuestEmail] = useState<string>(''); 
  const [error, setError] = useState<string | null>(null); 
  

  // Validate email format 
  const validateEmail = (email: string): boolean => { 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    return emailRegex.test(email); 
  }; 
  


  const handleEmailChange = (value: string) => { 
    setGuestEmail(value); 
    
    // Clear error while the user is typing 
    if (error) { setError(null); 
    } 
  }; 
    


  const handleInvite = async () => {
    const email = guestEmail.trim();
  
    if (!email) {
      setError(t('common.empty_field'));
      return;
    }
  
    if (!validateEmail(email)) {
      setError(t('profile.invalid_email'));
      return;
    }
  
    try {
      await shareAccountWithGuest(user, email);
  
      setGuestEmail('');
      setError(null);
    } catch (error) {
      console.error('Failed to invite guest:', error);
  
      setError(
        error instanceof Error
          ? error.message
          : "SOMETHING WENT WRONG"
      );
    }
  };
  
  

  return ( 
    <section> 
      <h6 className="section-title"> Share account </h6> 
      <p> Share your expense tracker with one other person. </p> 
      
      <div className="form-item"> 
        <div className="input-container"> 
          <input 
            id="guest-email" 
            type="email" 
            value={guestEmail} 
            onChange={(e) => handleEmailChange(e.target.value)} 
            placeholder={t('premium.type_email')} 
            className={`input ${error ? 'invalid' : ''}`} 
            aria-invalid={!!error} 
          /> 
          {error && ( 
            <p className="error-text"> {error} </p> 
          )} 
        </div> 
      </div> 
      
      <IonButton 
        className="block mt-20" 
        onClick={handleInvite} 
      > 
        Invite user 
      </IonButton> 
    </section> 
  ); 
}; 

export default ShareAccount;