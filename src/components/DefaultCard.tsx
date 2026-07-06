import React from 'react';
import { useTranslation } from 'react-i18next';

// Styles
import './DefaultCard.css';

type DefaultCardProps = {
  color: string;
  title: string;
  identifier: string;
  logo: string;
  amount: string; // Amount value
  editMode: boolean;
};

const DefaultCard: React.FC<DefaultCardProps> = ({ color, title, identifier, logo, amount, editMode }) => {  
  const { t } = useTranslation();

  return (
    <>
      {/* Default card for this component */}
      <div className="card-container">  
        <div className={`default-card ${color}`}>
          <div className="card-bgk">
            {/* Account icon */}
            <div className="bgk-icon-default-card">
              <i className={`fa-solid ${logo}`}></i>    
            </div>

            {/* Account name and identifier */}
            <div className='top-bar'>
              <div className={`card-title ${!title ? 'card-placeholder' : ''}`}>
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


    </>
  );
}

export default DefaultCard;