import React from 'react';
import { useTranslation } from 'react-i18next';

// Styles
import './DefaultCard.css';
import './SliderCard.css';

type SliderCardProps = {
  color: string;
  title: string;
  identifier: string;
  logo: string;
};

const SliderCard: React.FC<SliderCardProps> = ({ color, title, identifier, logo }) => {  
  const { t } = useTranslation();

  return (
    <div className="card-container">
      <div className={`slider-card ${color}`}> 
        <div className="card-bgk">  
          {/* Account icon */}
          <div className="bgk-icon-default-card">
            <i className={`fa-solid ${logo}`}></i>    
          </div>

          <div className='top-bar'>
            <div className="card-title">
              {(title === "Cash" ? t('accounts.default_account_name') : title) || t('accounts.card_name')}
            </div>
            <div className="card-identifier">
              {identifier}
            </div>  
          </div>
        </div>
      </div>
    </div>
  );
}

export default SliderCard;