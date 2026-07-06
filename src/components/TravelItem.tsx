import React from 'react';


// App components
import CategoryIcon from './CategoryIcon';
import FormattedDate from './FormattedDate';


// Custom hooks
import { useTrip } from '../context/TripContext';
import { useTheme } from '../theme/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';


// Styles
import '../Main.css';
import './TransactionItem.css';


// Ionic components
import { 
  IonIcon,
  IonRouterLink
} from '@ionic/react';


// Ionic icons
import { 
  chevronForwardOutline, 
} from 'ionicons/icons';



interface TravelItemProps {
  tripId: number;
  tripName: string;
  tripIcon: string;
  fromDate: Date;
  toDate: Date;
  currencyCode: string;
}


const TravelItem: React.FC<TravelItemProps> = ({
  tripId,
  tripName,
  tripIcon,
  fromDate,
  toDate,
  currencyCode,
}) => {
  const { allSelectedCurrencies } = useCurrency();  
  const { selectedTripId } = useTrip();
  const { themeColor } = useTheme(); 
  const color = themeColor.split("-")[1]; // Extracts "red"
  

  return (
      <div className={`transaction ${selectedTripId === tripId ? 'active' : ''}`}> 
        <div className='left-col'>
          <CategoryIcon categoryColor={`${selectedTripId === tripId ? color : 'neutral'}`} iconName={tripIcon} />  
        </div>
        <IonRouterLink routerLink={`edittrip/${tripId}`} routerDirection="forward">
          <div className='center-col border-right'>
            <div className='text'>{tripName}</div>
              <div className='travel-date-range'>
                <FormattedDate from={fromDate} to={toDate} format='dayMonth' />
              </div>
          </div>
        </IonRouterLink>
        <IonRouterLink routerLink={`viewtrip/${tripId}`} routerDirection="forward">
          <div className='right-col'>
            <IonIcon icon={chevronForwardOutline} />
          </div>
        </IonRouterLink>
      </div>
  );
  }

export default TravelItem;