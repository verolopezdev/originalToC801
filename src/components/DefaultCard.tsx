import React from 'react';
import { useTranslation } from 'react-i18next';

// Ionic components
import { 
  IonIcon
} from '@ionic/react';


// Styles
import './DefaultCard.css';
import { closeCircle, closeCircleOutline, closeOutline, lockClosed, lockClosedOutline } from 'ionicons/icons';

type DefaultCardProps = {
  color: string;
  title: string;
  identifier: string;
  logo: string;
  amount: string; // Amount value
  editMode: boolean;
  isShared?: boolean;
  showOwner?: boolean;
  isActive?: boolean; // New optional prop
  owner?: string;
};

const DefaultCard: React.FC<DefaultCardProps> = ({ 
  color, 
  title, 
  identifier, 
  logo, 
  amount, 
  editMode,
  isShared = false,
  showOwner = false,
  isActive = true,
  owner
}) => {  
  const { t } = useTranslation();
  

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
              {!isActive && !isShared ? (<IonIcon icon={lockClosed}></IonIcon>) : !isActive ? (<IonIcon icon={closeCircle}></IonIcon>) : null}
              {(title === "Cash" ? t('accounts.default_account_name') : title) || t('accounts.card_name')}
            </div>
            <div className={`card-identifier ${!identifier && editMode ? 'card-placeholder' : ''}`}>
              {identifier || (editMode ? '1234' : '')}
            </div>
            {showOwner && (
              <div className='card-placeholder'>
                {owner}
              </div>
            )}
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