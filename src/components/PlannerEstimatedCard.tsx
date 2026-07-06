import React from "react";
import { useCurrency } from '../context/CurrencyContext';
import { useTranslation } from 'react-i18next';


// App components
import FormatAmount from "./FormatAmount";


// Styles
import '../pages/TravelMode.css';


interface PlannerEstimatedCardProps {
  totalSpent: number;
}

const PlannerEstimatedCard: React.FC<PlannerEstimatedCardProps> = ({
  totalSpent,
}) => {
  const { currency } = useCurrency();
  const { t } = useTranslation();
  

  return(
    <div className="estimated-card-container">
      <div className='dashboard-trip-card'>      
        <div className="card-container">
          <div className="bgk-icon-card">
            <i className="fas fa-calculator"></i>  
          </div>
          <div className='top-bar'>
            <div className="trip-days">
              <div>{t('common.estimated_total')}</div>
            </div>
          </div>
          <div className='bottom-bar'>
            <FormatAmount 
              amount={(totalSpent ?? 0) /100}
              currencyCode={currency.defaultCurrency.code}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

export default PlannerEstimatedCard;
