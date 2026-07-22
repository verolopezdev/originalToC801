import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Trip } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next'; 


// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop'; 
import { useCurrency } from '../context/CurrencyContext';
import { useTrip } from '../context/TripContext';
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';


// Utils
import { formatDate } from '../utils/formatDate'; 
import { validateName } from '../utils/validateName';


// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonTitle, 
  IonToolbar,
} from '@ionic/react';


// Ion icon components
import { 
  calendarOutline,
  caretDownOutline,
  chevronForwardOutline,
  closeOutline,
} from 'ionicons/icons';


// App's components
import CategoryPreview from '../components/CategoryPreview';
import IconPicker from '../components/IconPicker';
import Modal from '../components/Modal';
import DatePicker from '../components/DatePicker';


// Styles
import '../Main.css';


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



const EditTrip: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  
  const { tripId } = useParams<{ tripId: string }>(); // expense id to fill the form
  const trip = useLiveQuery(() => db.trips.get(tripId), [tripId]);
  const [passedTripId, setPassedTripId] = useState<string>(tripId);
  
  const { currency } = useCurrency();
  const [originalTrip, setOriginalTrip] = useState<Trip | null>(null);
  const { checkTrip } = useTrip();
  const [tripIcon, setTripIcon] = useState<string>("fa-plane-departure");
  const [tripName, setTripName] = useState<string>('');
  const [hasExpenses, setHasExpenses] = useState<boolean>(false);
  const [isFormValid, setIsFormValid] = useState<boolean>(true);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isOpenCategoryModal, setIsOpenCategoryModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
    destination: '',
  });
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  
  const [error, setError] = useState<string | null >(null);
  
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [fromDateIsOpen, setFromDateIsOpen] = useState(false);
  const [toDateIsOpen, setToDateIsOpen] = useState(false);

  const [editingDateType, setEditingDateType] = useState<'from' | 'to' | null>(null);
  
  const [travelCurrencies, setTravelCurrencies] = useState<CurrencyData[]>([]);
  const [isTravelModeModalOpen, setIsTravelModeModalOpen] = useState<boolean>(false);
  const [travelModeEnabled, setTravelModeEnabled] = useState<boolean>(false);
  const [alternativeCurrencies, setAlternativeCurrencies] = useState<CurrencyData[]>([]); // State for alternative currencies
  
  
  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isTravelModeModalOpen, setIsTravelModeModalOpen);
  useKeyboardAutoClose();

  const [selectedCurrency, setSelectedCurrency] = useState<{
    code: string;
    name: string;
    symbol: string;
    locale: string;
  }>(defaultCurrency);


  const [actualCurrency, setActualCurrency] = useState<{
    code: string;
    name: string;
    symbol: string;
    locale: string;
  } | undefined>(undefined);
  

  // Initialize state from currency context
  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency.defaultCurrency || undefined);
      setActualCurrency(currency.actualCurrency || undefined);
      setAlternativeCurrencies(currency.alternativeCurrencies || []);

      // Combine defaultCurrency and alternativeCurrencies into one array
      const defaultCurr = currency.defaultCurrency ? [currency.defaultCurrency] : [];
      const combined = [...defaultCurr, ...(currency.alternativeCurrencies || [])];
      setTravelCurrencies(combined);
    }
  }, [currency]);
    
  
  useEffect(() => {
    if(trip) {
      setOriginalTrip(trip); // store original trip for comparison
      setTripName(trip.tripName);
      setTripIcon(trip.tripIcon);
      setFromDate(new Date(trip.fromDate));
      setToDate(new Date(trip.toDate)); 

    // Check for associated expenses
    const checkExpenses = async () => {
      const hasExpenses = await db.expenses
        .where("tripId")
        .equals(trip.tripId) 
        .count() > 0;

      setHasExpenses(hasExpenses); 
    };

    checkExpenses();
    }
  }, [trip]);

  useEffect(() => {
    if (trip && travelCurrencies.length > 0) {
      const matchedCurrency = travelCurrencies.find(
        (currency) => currency.code === trip.currencyCode
      );
  
      if (matchedCurrency) {
        setSelectedCurrency(matchedCurrency); 
      }
    }
  }, [trip, travelCurrencies]);


  const hasChanges = useMemo(() => {
    if (!originalTrip) return false;
  
    return (
      tripName !== originalTrip.tripName ||
      tripIcon !== originalTrip.tripIcon ||
      fromDate.getTime() !== new Date(originalTrip.fromDate).getTime() ||
      toDate.getTime() !== new Date(originalTrip.toDate).getTime() ||
      selectedCurrency?.code !== originalTrip.currencyCode
    );
  }, [tripName, tripIcon, fromDate, toDate, selectedCurrency, originalTrip]);
  

  // Handle input name 
  const handleInputChange = async (value: string) => {
    setTripName(value);
  
    const trimmed = value.trim();
  
    // Always reset the error first
    setError(null);
    setIsFormValid(true);
  
    if (!trimmed) {
      setError(t('common.field_required'));
      setIsFormValid(false);
      return;
    }
  
    if (!validateName(trimmed)) {
      setError(t("common.invalid_name"));
      setIsFormValid(false);
      return;
    }
  
    const tripExists = await db.trips.where("tripName").equalsIgnoreCase(trimmed).count();
    if (tripExists) {
      setError(t('trip.already_exists'));
      setIsFormValid(false);
      return;
    }
  };
    
  
  // Handle dates
  const handleDateSelect = (date: Date) => {
    if (editingDateType === 'from') {
      setFromDate(date);
      // If "from" is after "to", reset "to" to be after "from"
      if (toDate < date) {
        setToDate(date);
      }
      setFromDateIsOpen(false);
    } else if (editingDateType === 'to') {
      if (date >= fromDate) {
        setToDate(date);
      } else {
        setError(t('date.end_date_warning'));
        setIsFormValid(false);
      }
      setToDateIsOpen(false);
    }
  
    setEditingDateType(null);
  };


  // Handle travel currency
  const selectTravelCurrency = (currency: CurrencyData) => {
    setSelectedCurrency(currency);
    setIsTravelModeModalOpen(false);
  };


  // Success Modal
  const openInfoModal = () => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: t('trip.updated'),
      actions: [
        {
          label: t('common.continue'),
          action: () => setIsConfirmationModalOpen(false),
        },
      ],
      destination: '/app/travelmode'
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
            setResetTrigger(prev => prev + 1);
          },
          style: 'fail-btn', // Optional CSS class
        },
      ],
      destination: '/app/travelmode'
    });
    setIsConfirmationModalOpen(true);
  };

  
  // Create new account record in database
  async function updateTrip(tripId: string) {
    // Check if trip exists
    const existingTrip = await db.trips.get(tripId);

    if (!existingTrip) {
      openFailureModal(t('trip.not_found'));
      return;
    }

    
    try {
      await db.transaction(
        'rw', 
        db.trips,
        async (tx) => {
          await tx.trips.update(existingTrip, {
            tripName,
            tripIcon,
            fromDate,
            toDate,
            currencyCode: selectedCurrency.code
          });
        }
      );
      
      checkTrip(); // Notify TransactionList to refresh it
      setSelectedCurrency(currency.defaultCurrency || undefined);
      openInfoModal();

    } catch (error) {
      // show error
      openFailureModal(t('trip.error_updating'));
    }
  }


  
  
  

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        {/* Screen Header and Category Design */}
        <section>
          <div 
            className="centered-container" 
            onClick={() => { setIsOpenCategoryModal(true); }}
          >
            <h2 className='screen-title'>{t('trip.edit_title')}</h2>
            <div className='mt-20'>
              <CategoryPreview
                categoryColor= 'neutral'
                categoryIcon={tripIcon}
              />
            </div>
            
          </div>
        </section>


        {/* Trip name */}
        <section>
          <div className="parent-input">
            <div className="input-container">
              <input
                type="text"
                value={tripName}
                maxLength={20}
                onChange={(e) => handleInputChange(e.target.value) }
                placeholder="Trip Name or destination"
                className={`input capitalize ${error ? 'invalid' : ''}`}
              />
              {error && <p className="error-text">{error}</p>}
            </div>
          </div>
        </section>

        {/* Date range */}
        <section>
          <h6 className="section-title">{t('date.select_dates')}</h6>
          <div className='additional-config'>
            <div className='aditional-btn'>
              <div>
                <IonIcon icon={calendarOutline}></IonIcon>
              </div>
              <div className='selected-info' onClick={() => {
                setEditingDateType('from');
                setFromDateIsOpen(true);
              }}>                
                <span className="title">{t('date.from')}</span>
                <span className='data'>{formatDate(fromDate, currency.actualCurrency.locale, 'short')}</span>
              </div>
            </div>

            <div className='aditional-btn'>
              <div>
                <IonIcon icon={calendarOutline}></IonIcon>
              </div>
              <div className='selected-info' onClick={() => {
                setEditingDateType('to');
                setToDateIsOpen(true);
              }}>
                <span className="title">{t('date.to')}</span>
                <span className='data'>{formatDate(toDate, currency.actualCurrency.locale, 'short')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Travel currency */}
        <section>
          <h6 className="section-title">{t('trip.travel_curr')}</h6>
          <IonItem button onClick={() => setIsTravelModeModalOpen(true)} disabled={hasExpenses}>
            <div className='list-item-select'>
              <span>
                {selectedCurrency && selectedCurrency.name && selectedCurrency.symbol
                  ? `${selectedCurrency.name} (${selectedCurrency.symbol})`
                  : 'Make a Selection'}
              </span>
              <IonIcon aria-hidden="true" icon={caretDownOutline}></IonIcon>  
            </div>
          </IonItem>  
        </section>
        

        {/* Icon picker */}
        <section>
          <h6 className="section-title">{t('categories.choose_icon')}</h6>
          <IonItem button onClick={() => {
            setIsOpenCategoryModal(true);  
          }}>
            <div className='list-item-select'>
              <span>{t('categories.selected_icon')}</span>
              <div>
                <span>
                  {tripIcon
                    ? <i className={`fas ${tripIcon} icon`}></i>
                    : t('categories.make_a_selection')}
                </span>
                <IonIcon icon={chevronForwardOutline}></IonIcon>
              </div>
            </div>
          </IonItem>
        </section>

        {/* Add new trip button */}
        <IonButton
          className="block mb-20"
          onClick={() => {
            if (isFormValid) {
              updateTrip(passedTripId);
            }
          }}
          disabled={!isFormValid || !hasChanges} // Disable the button if the form is invalid or didn't have changes
        >
          {t('trip.update_trip')}
        </IonButton>

        {/* Confirmation Modal */}
        <Modal
          isOpen={isConfirmationModalOpen}
          icon={modalConfig.icon}
          title={modalConfig.title}
          content={modalConfig.content}
          closeModal={() => setIsConfirmationModalOpen(false)}
          actions={modalConfig.actions}
          destination={modalConfig.destination}
        />

        {/* Modal containing DatePicker "from" date */}
        <IonModal 
          isOpen={fromDateIsOpen} 
          onDidDismiss={() => setFromDateIsOpen(false)} 
          backdropDismiss={true}
        >
          <div className="centered-modal-content">
            <DatePicker prevDate={fromDate} onDateChange={handleDateSelect} />
          </div>
        </IonModal>

        {/* Modal containing DatePicker "to" date*/}
        <IonModal 
          isOpen={toDateIsOpen} 
          onDidDismiss={() => setToDateIsOpen(false)} 
          backdropDismiss={true}
        >
          <div className="centered-modal-content">
            <DatePicker prevDate={toDate} onDateChange={handleDateSelect} disableUpTo={fromDate} />
          </div>
        </IonModal>


        
        {/* modal for travel currency selection */}
        <IonModal isOpen={isTravelModeModalOpen} onDidDismiss={() => setIsTravelModeModalOpen(false)}>
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonTitle>{t('currency.select_travel_currency')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsTravelModeModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {travelCurrencies.length > 0 ? (
              travelCurrencies.map((currencyItem) => (
                <IonItem
                  key={currencyItem.code}
                  button
                  onClick={() => selectTravelCurrency(currencyItem)}
                >
                  <IonLabel>{`${currencyItem.name} (${currencyItem.symbol})`}</IonLabel>
                </IonItem>
              ))
            ) : (
              <p>{t('currency.no_alt_curr_add')}</p>
            )}
          </IonContent>
        </IonModal>

        {/* Icon picker modal */}
        <IonModal isOpen={isOpenCategoryModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('categories.select_an_icon')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsOpenCategoryModal(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
          <IconPicker
            selectedIcon={tripIcon}
            onIconSelect={(icon) => {
              setTripIcon(icon); // Update the selected icon for trip
              setIsOpenCategoryModal(false); // Close the modal
            }}
          />
          </IonContent>
        </IonModal>

        
      </IonContent>
    </IonPage>
  );
};

export default EditTrip;