import React from 'react';
import { IonButton } from '@ionic/react';
import { useUser } from '../context/UserContext';

const ResetButton: React.FC = () => {
  const { resetUser } = useUser();

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the app?')) {
      resetUser();
    }
  };

  return (
    <IonButton onClick={handleReset} className='reset-btn'>
      DEV - Reset App
    </IonButton>
  );
};

export default ResetButton;
