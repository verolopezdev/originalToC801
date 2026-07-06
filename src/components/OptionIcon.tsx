import React from 'react';
import { IonIcon } from '@ionic/react';

// Styles
import './OptionIcon.css';

interface OptionIconProps {
  icon: string; // Icon or string for the IonIcon prop
}

const OptionIcon: React.FC<OptionIconProps> = ({ icon }) => {
  return (
    <div className="option-icon">
      <div>
        <IonIcon icon={icon} />
      </div>
    </div>
  );
};

export default OptionIcon;
