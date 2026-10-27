import React from 'react';
import { useTranslation } from 'react-i18next';

// Ionic components
import { 
  IonIcon
} from '@ionic/react';


// Styles
import './DefaultCard.css';
import { closeCircleOutline, closeOutline, lockClosedOutline } from 'ionicons/icons';

type DefaultCardProps = {
  color: string;
  title: string;
  identifier: string;
  logo: string;
  amount: string; // Amount value
  editMode: boolean;
  isShared?: boolean;
  isActive?: boolean; // New optional prop
};

const DefaultCard: React.FC<DefaultCardProps> = ({ 
  color, 
  title, 
  identifier, 
  logo, 
  amount, 
  editMode,
  isShared = false,
  isActive = true 
}) => {  
  const { t } = useTranslation();
  console.log("💳 Card name: ", title);
  console.log("Is shared? ", isShared);
  console.log("Is disabled? ", isActive);

  return (
    <div className="card-container">  
      <div className={`default-card ${color} ${!isActive ? 'is-disabled' : ''}`}>
        {/* Light gray overlay for disabled state */}
        {!isActive && <div className="disabled-overlay" />}

        <div className="card-bgk">
          {/* Account icon */}
          <div className="bgk-icon-default-card">
            <i className={`fa-solid ${logo}`}></i>    
          </div>

          {/* Account name and identifier */}
          <div className='top-bar'>
            <div className={`card-title ${!title ? 'card-placeholder' : ''}`}>
              {!isActive && !isShared ? (<IonIcon icon={lockClosedOutline}></IonIcon>) : !isActive ? (<IonIcon icon={closeCircleOutline}></IonIcon>) : null}
              {(title === "Cash" ? t('accounts.default_account_name') : title) || t('accounts.card_name')}
            </div>
            <div className={`card-identifier ${!identifier && editMode ? 'card-placeholder' : ''}`}>
              {identifier || (editMode ? '1234' : '')}
            </div>
          </div>
          <div className='bottom-bar'>
            <span>{amount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DefaultCard;