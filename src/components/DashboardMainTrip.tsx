import React from "react";


// App components
import FormatAmount from "./FormatAmount";
import FormattedDate from "./FormattedDate";


// Ionic components
import { 
  IonRouterLink 
} from "@ionic/react";


// Styles
import '../pages/TravelMode.css';


interface TripDataProps {
  tripId: string;
  tripIcon: string;
  fromDate: Date;
  toDate: Date;
  tripName: string;
  currencyCode: string;
  totalSpent: number;
}

const TripData: React.FC<TripDataProps> = ({
  tripId,
  tripIcon,
  fromDate,
  toDate,
  tripName,
  currencyCode,
  totalSpent,
}) => {

  return(
    <IonRouterLink routerLink={`/app/viewtrip/${tripId}`} routerDirection="forward">  
      <div className='dashboard-trip-card'>      
        <div className="card-container">
          <div className="bgk-icon-card">
            <i className={`fas ${tripIcon}`}></i>  
          </div>
          <div className='top-bar'>
              <div className="trip-days">
                <div>{tripName}</div>
              </div>
            <div>
              <p>
                <FormattedDate from={fromDate} to={toDate} format='dayMonth' />
              </p>
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
    </IonRouterLink>
  );
}

export default TripData;
