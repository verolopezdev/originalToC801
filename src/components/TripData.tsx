import React from "react";


// App components
import FormatAmount from "./FormatAmount";
import FormattedDate from "./FormattedDate";


// Utils
import { getDaysBetween } from '../utils/formatDate'; 


// Ionic components
import { IonIcon } from "@ionic/react";


// Ionic Icons
import { calendarOutline } from "ionicons/icons";


// Styles
import '../pages/TravelMode.css';


interface TripDataProps {
  tripIcon: string;
  fromDate: Date;
  toDate: Date;
  currencyName: string;
  currencySymbol: string;
  currencyCode: string;
  totalSpent: number;
  locale: string;
}

const TripData: React.FC<TripDataProps> = ({
  tripIcon,
  fromDate,
  toDate,
  currencyName,
  currencySymbol,
  currencyCode,
  totalSpent,
  locale,
}) => {

  const tripDays = getDaysBetween(fromDate, toDate);

  return(
    <>
    <div className='trip-main-card'>  
      <div className="card-bgk">
        <div className="bgk-icon-card">
          <i className={`fas ${tripIcon}`}></i>  
        </div>
        <div className='top-bar'> 
          <div>
            <div className="trip-days"> 
              <IonIcon icon={calendarOutline} className="mr-5" />
              {tripDays} day{tripDays > 1 ? 's' : ''}
            </div>
          </div>
          <div>
            <p>
              <FormattedDate from={fromDate} to={toDate} format='dayMonth' />
            </p>
            <p>{currencyName} ({currencySymbol})</p> 
          </div>
        </div>
        <div className='bottom-bar'>
          <FormatAmount 
            amount={(totalSpent ?? 0) /100}
            currencyCode={currencyCode}
          />
        </div>
      </div>
    </div>
  </>
  );
}

export default TripData;
