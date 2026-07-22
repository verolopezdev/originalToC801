import React, { useEffect, useState } from 'react';
import { db, Trip } from '../db'; 
import { useTranslation } from 'react-i18next';


// App components
import TravelList from '../components/TravelList';
import Footer from '../components/Footer';
import FormattedDate from '../components/FormattedDate';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import { useTrip } from '../context/TripContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../theme/ThemeContext';


// Ionic's components
import { 
  IonButton,
  IonButtons,
  IonContent, 
  IonHeader, 
  IonIcon,
  IonImg,
  IonItem,
  IonLabel,
  IonModal,
  IonPage, 
  IonTitle,
  IonToggle,
  IonToolbar 
} from '@ionic/react';


// Ion icon components
import { 
  add,
  barChartOutline, 
  layersOutline,
  closeOutline,
  homeOutline,
  cashOutline,
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './TravelMode.css';


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/app/accounts', icon: layersOutline },
  { title: 'Add', url: '/app/newtrip', icon: add },
  { title: 'activity', url: '/app/activity', icon: cashOutline }
];



const TravelMode: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { allSelectedCurrencies, updateTravelCurrency, updateActualCurrency, clearTravelCurrency } = useCurrency();  
  const { t } = useTranslation();
  const { themeColor } = useTheme(); 
  const color = themeColor.split("-")[1]; // Extracts "red"
  const { setTravelMode, activateTravelMode, setActivateTravelMode, setSelectedTripId, checkTrip } = useTrip(); 
  const [isTravelModeModalOpen, setIsTravelModeModalOpen] = useState<boolean>(false);
  const [tripCount, setTripCount] = useState(0);
  
  const [trips, setTrips] = useState<Trip[]>([]);


  // Translate titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));

  
  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isTravelModeModalOpen, setIsTravelModeModalOpen);

  
  // Get trips from db to show on modal
  useEffect(() => {
    const fetchAll = async () => {
      const data = await db.trips.orderBy('fromDate').reverse().toArray();
      setTrips(data);
    };

    fetchAll();
  }, [checkTrip]);


  // Open modal to select a trip
  const toggleTravelModeModal = () => {
    if (activateTravelMode) {
      setActivateTravelMode(false);
      clearTravelCurrency();
    } else {
      setTravelMode(false);
      setIsTravelModeModalOpen(true);
    }
  };


  // Select a trip to enable travel mode
  const selectTrip = (trip: Trip) => {
    const foundCurrency =
      allSelectedCurrencies.find((currency) => currency.code === trip.currencyCode) ??
      allSelectedCurrencies[0];
    updateTravelCurrency(foundCurrency);
    updateActualCurrency(foundCurrency);
    setActivateTravelMode(true);
    setTravelMode(true);
    setSelectedTripId(trip.tripId);
    setIsTravelModeModalOpen(false);
  };



  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal"  ref={contentRef}>
        {/* Screen Header */}
        <section className='centered-container'>
          <h2 className='screen-title'>{t('common.travel_mode')}</h2>
          <IonImg
            src={`assets/images/travel/${color}-travel.svg`} // Dynamically set the SVG source
            alt="Theme image"
            className='screen-wide-img'
          ></IonImg>
        </section> 

        
        {/* Travel mode toggle */}
        <section>
          <p>{t('currency.travel_mode_prompt')}</p>
          <IonToggle 
            labelPlacement="end"
            checked={activateTravelMode} 
            disabled={tripCount === 0}
            onIonChange={toggleTravelModeModal} 
          >
            {t('currency.enable_travel_mode')}
          </IonToggle>
        </section>


        {/* My trips */}
        <section>
          <div className="section-header">
            <h6 className="section-title">{t('trip.my_trips')}</h6>
          </div>
          <TravelList onTripCountChange={setTripCount} /> 
        </section>


        {/* modal for trip selection */}
         <IonModal isOpen={isTravelModeModalOpen} onDidDismiss={() => setIsTravelModeModalOpen(false)}>
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonTitle>{t('trip.select_trip')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsTravelModeModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {trips.length > 0 ? (
              trips.map((trip) => {
                const foundCurrency =
                  allSelectedCurrencies.find((currency) => currency.code === trip.currencyCode) ??
                  allSelectedCurrencies[0];

                  return(
                  <IonItem
                    key={trip.tripId}
                    button
                    onClick={() => selectTrip(trip)}
                  >
                    <IonLabel>{trip.tripName}</IonLabel>
                    <span className='note'>
                      {trip.fromDate && trip.toDate
                        ? <FormattedDate
                            from={new Date(trip.fromDate)}
                            to={new Date(trip.toDate)}
                            format='dayMonth'
                          />
                        : t('date.invalid')}
                    </span>
                    
                  </IonItem>
                );
              })
            ) : (
              <p>{t('trips.no_trips')}</p>
            )}
          </IonContent>
        </IonModal>

        </IonContent>
      <Footer appPages={translatedMenuItems} />

    </IonPage>
  );
};

export default TravelMode;