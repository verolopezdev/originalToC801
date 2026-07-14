import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';


// App components
import Modal from '../components/Modal';
import TripData from '../components/TripData';
import TripExpensesList from '../components/TripExpensesList';


// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop'; 
import { useCurrency } from '../context/CurrencyContext';
import { useTrip } from '../context/TripContext';


// Ionic's components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonPage,
  IonToolbar,
} from '@ionic/react';


// Styles
import '../Main.css';
import { trashOutline } from 'ionicons/icons';
import ExchangeRateDisplay from '../components/ExchangeRateDisplay';


interface CurrencyData {
  name: string;
  code: string;
  locale: string;
  symbol: string;
  decimalSeparator: string;
  thousandSeparator: string;
}


const defaultCurrency: CurrencyData = {
  name: 'United States Dollar',
  code: 'USD',
  symbol: '$',
  locale: 'en-US',
  thousandSeparator: ',',
  decimalSeparator: '.',
};


const ViewTrip: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { currency, allSelectedCurrencies } = useCurrency();
  const defaultCurrencyCode = currency.defaultCurrency.code;
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyData>(defaultCurrency);

  const { checkTrip, travelMode, selectedTripId } = useTrip();

  const { tripId } = useParams<{ tripId: string }>(); // expense id to fill the form
  const trip = useLiveQuery(() => db.trips.get(tripId), [tripId]);  
  const passedTripId = tripId;
  const [tripIcon, setTripIcon] = useState<string>("fa-plane-departure");
  const [tripName, setTripName] = useState<string>('');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  
  const [tripTotal, setTripTotal] = useState<number | null>(null); // null means "not ready"


  // Modal variables
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
  });
  
  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isConfirmationModalOpen, setIsConfirmationModalOpen);


  // Initialize state variable with data read from Dexie for this tripId
  useEffect(() => {
    if(trip) {
      setTripName(trip.tripName);
      setTripIcon(trip.tripIcon);
      setFromDate(new Date(trip.fromDate));
      setToDate(new Date(trip.toDate));
    }
  }, [trip]);

  useEffect(() => {
    if (trip && allSelectedCurrencies.length > 0) {
      const matchedCurrency = allSelectedCurrencies.find(
        (currency) => currency.code === trip.currencyCode
      );
  
      if (matchedCurrency) {
        setSelectedCurrency(matchedCurrency); 
      }
    }
  }, [trip, allSelectedCurrencies]);


  // Success Modal
  const openSuccessModal = (message: string) => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: message,
      actions: [
        {
          label: t('common.continue'),
          action: () => {
            setIsConfirmationModalOpen(false);
            history.back(); // This works like <IonBackButton />
          },
        },
      ],
    });
    setIsConfirmationModalOpen(true);
  };
    
  
  // Failure Modal
  const openFailureModal = (message: string) => {
    setModalConfig({
      icon: 'failure',
      title: t('modal.failure_modal_title'),
      content: message,
      actions: [
        {
          label: t('common.try_again'),
          action: () => {
            setIsConfirmationModalOpen(false);
          },
          style: 'fail-btn', // Optional CSS class
        },
      ],
    });
    setIsConfirmationModalOpen(true);
  };
  

  // Delete expense
  async function deleteTrip(tripId: string) {
    try {
      // Check if category exists
      const existingTrip = await db.trips.get(tripId);
      if (!existingTrip) {
        openFailureModal(t('trip.trip_not_found'));
        return;
      }

      await db.transaction(
        'rw', 
        db.trips,
        async (tx) => {
          // Update the category record
          await tx.trips.delete(tripId);
        }
      );

      
      checkTrip(); // Notify totalizers like SliderTotalCard to re-fetch the total

      openSuccessModal(t('trip.trip_deleted')); // Success feedback

    } catch (error) {
      console.error("Error deleting trip:", error);
      openFailureModal(t('trip.error_deleting'));
    }
  }


  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>

          {/* Delete button for this trip */}
          {tripTotal === 0 && (selectedTripId !== passedTripId) &&  (
            <IonButtons slot="end">
              <IonIcon 
                className='medium-icon-btn mr-15 danger' 
                icon={trashOutline} 
                onClick={() => {
                  setTimeout(() => deleteTrip(passedTripId), 100); // Delay state change
                }}
              />
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        {/* Screen Header */}
        <div className='centered-container'>
          <h2 className='screen-title'>{t("trip.trip_title", { trip: tripName })}</h2>
        </div>

        <section className='mt-20'>
          <TripData 
            tripIcon={tripIcon}
            fromDate={fromDate}
            toDate={toDate}
            currencyName={selectedCurrency.name}
            currencySymbol={selectedCurrency.symbol}
            currencyCode={selectedCurrency.code}
            locale={selectedCurrency.locale}
            totalSpent={tripTotal ?? 0} // if tripTotal is null or undefined, use 0 instead to avoid flicker (shows icon for a split second)
          />
          {selectedCurrency.code !== defaultCurrencyCode && (
            <ExchangeRateDisplay targetCurrency={selectedCurrency.code} showLastUpdated={true} />
          )}
        </section>

        <section>
          <h6 className="section-title">{t('trip.trip_exps')}</h6>
          <div className='mt-10'>
          <TripExpensesList tripId={passedTripId} onTotalChange={setTripTotal} />   
          </div>
        </section>  

        {/* Confirmation Modal */}
        <Modal
          isOpen={isConfirmationModalOpen}
          icon={modalConfig.icon}
          title={modalConfig.title}
          content={modalConfig.content}
          closeModal={() => setIsConfirmationModalOpen(false)}
          actions={modalConfig.actions}
        />

      </IonContent>
    </IonPage>
  );
};

export default ViewTrip;
