import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Trip, Account } from '../db';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import { useCurrency } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useExpense } from '../context/ExpenseContext';
import { useTrip } from '../context/TripContext';
import { useExchangeRates } from '../context/ExchangeRateContext';
import { RecurrenceSettings, useRecurringExpense } from '../hooks/useRecurringExpense'; 
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';
import { useDatePicker } from '../context/DatePickerContext';


// Utils
import { validateName } from '../utils/validateName';
import { logAutoExpenses } from '../utils/autoLogger';


// App components
import AccountSlider from '../components/AccountSlider';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import Modal from '../components/Modal';
import FormattedDate from '../components/FormattedDate';
import CustomToast from '../components/CustomToast';
import FrequencyForm from '../components/FrequencyForm';
import NotificationForm, { NotificationData } from '../components/NotificationForm';


// Ionic components 
import { 
  IonBackButton, 
  IonButton,
  IonButtons,
  IonChip, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonTitle, 
  IonToolbar,
  useIonViewWillEnter
} from '@ionic/react';

// Ionic icons
import { 
  airplane,
  airplaneOutline,
  arrowBackOutline,
  calendarOutline,
  cashOutline,
  closeOutline,
  gitCompareOutline,
  gridOutline,
  notificationsOffOutline,
  notificationsOutline,
  syncOutline,
} from 'ionicons/icons';

// Styles
import '../Main.css';
import './NewExpense.css';


function useCategory(categoryId?: number) {
  return useLiveQuery(async () => {
    if (!categoryId) return undefined;
    return db.categories.get(categoryId); // Fetch parent category by its ID
  }, [categoryId]);
}

function useSubcategory(subcategoryId?: number | null) {
  return useLiveQuery(async () => {
    if (!subcategoryId) return undefined;
    return db.subcategories.get(subcategoryId); // Fetch parent category by its ID
  }, [subcategoryId]);
}

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

const defaultRecurrence: RecurrenceSettings = {
  isRecurring: 0,
  unit: 'month',          // Arbitrary; won't be used if isRecurring is false
  interval: 1,
  endCondition: 'never',
  totalOccurrences: null,
  endDate: null,
  lastLoggedDate: '',
  lastLoggedInstallmentIndex: 0,
  logAutomatically: false
};




// Main fx
const NewExpense: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser(); 
  const { addExpenseWithRecurrence } = useRecurringExpense();
  const { openDatePicker } = useDatePicker();
  const { passedAccountId } = useParams<{ passedAccountId: string }>(); // passed expense id to fill the form, always a string
  const accId = Number(passedAccountId);
  const { currency, allSelectedCurrencies } = useCurrency(); 
  const { convertCurrency, getExchangeRate } = useExchangeRates();
  
  const { selectedTripId, trips, checkTrip } = useTrip();
  const [selectedTrip, setSelectedTrip] = useState<Trip>();
  const [tripCurrencyCode, setTripCurrencyCode] = useState<string>('');
  const [isTravelMode, setIsTravelMode] = useState<boolean>(false);
  const [tripId, setTripId] = useState<number | null>(null);
  const accounts: Account[] | undefined = useLiveQuery(
    () => db.accounts.orderBy('sortOrder').toArray()
  );
  const today = new Date();

  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [amountInCents, setAmountInCents] = useState(0);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [subcategoryId, setSubcategoryId] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(today);  
  const [expenseCurrencyCode, setExpenseCurrencyCode] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyData>(defaultCurrency);
  const [expenseLocale, setExpenseLocale] = useState<string>('');
  const [note, setNote] = useState<string>('');
  
  const [error, setError] = useState<string | null >(null);
  const [isFormValid, setIsFormValid] = useState<boolean>(false); // Change to false when validating form
  const [showFavourites, setShowFavourites] = useState(false); // State to toggle between favourites and all categories
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Modal variables
  const [isOpenCategoryModal, setIsOpenCategoryModal] = useState(false);
  const [isAlternativeModalOpen, setIsAlternativeModalOpen] = useState<boolean>(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
  });

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'error' | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  // Frecuency modal variables
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrence);
  const [notification, setNotification] = useState<NotificationData | undefined>(undefined);
  const [showNotifyModal, setShowNotifyModal] = useState<boolean>(false);
    

  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isOpenCategoryModal, setIsOpenCategoryModal);
  // Keyboard close on tap or scroll
  useKeyboardAutoClose();
  

  useEffect(() => {
    setSelectedCurrency(currency.actualCurrency);
    setExpenseLocale(currency.actualCurrency.locale);
    setExpenseCurrencyCode(currency.actualCurrency.code);
  }, [currency]);

  // Check if in travel mode and initialize variables
  useEffect(() => {
    if(selectedTripId) {
      setIsTravelMode(true);
      setTripId(selectedTripId);

      const foundTrip = trips.find(
        (trip) => trip.tripId === selectedTripId
      );

      if(foundTrip) {
        setTripCurrencyCode(foundTrip.currencyCode);
        setSelectedTrip(foundTrip);
      } 

    } else {
      setIsTravelMode(false);
      setTripId(null);
    }
  }, []);

  const convertedAmountText = useMemo(() => {
    if (
      expenseCurrencyCode === currency.defaultCurrency.code
    ) {
      return '';
    }
  
    const rate = getExchangeRate(expenseCurrencyCode);
  
    if (!rate) return '';
  
    const converted = Math.round(amountInCents / rate);
  
    return new Intl.NumberFormat(
      currency.defaultCurrency.locale,
      {
        style: 'currency',
        currency: currency.defaultCurrency.code,
      }
    ).format(converted / 100);
  }, [
    amountInCents,
    expenseCurrencyCode,
    currency.defaultCurrency.code,
    currency.defaultCurrency.locale,
  ]);
  
  

  // Initialize state from currency context
  useIonViewWillEnter(() => {
    // Priority 1: Account passed via route parameter (for editing/pre-selection)
    if(accId > 0) {
      setSelectedAccountId(accId)
    } 
    // Priority 2: The first account from the sorted list (sortOrder 0)
    else {
      // Use the memoized ID of the first account in the sorted list
      setSelectedAccountId(firstSortedAccountId); 
    }

    setSubcategoryId(0);
    setAmountInCents(0);
    setSelectedDate(today);
    setNote('');
    setSelectedCurrency(currency.actualCurrency);
    setExpenseLocale(currency.actualCurrency.locale);
    setExpenseCurrencyCode(currency.actualCurrency.code);
    setError(null);
    setResetTrigger(prev => prev + 1);
  });

  const isAlternativeCurrency =
    expenseCurrencyCode !== currency.defaultCurrency.code;

  // Fetch category 
  const category = useCategory(categoryId);
  const subcategory = useSubcategory(subcategoryId);

  const handleCategorySelect = ({ categoryId, subcategoryId }: { categoryId: number; subcategoryId: number }) => {  
    setCategoryId(categoryId); // Update the parent category ID
    setSubcategoryId(subcategoryId);
    setIsOpenCategoryModal(false); // Close the modal
  };


  // Get all active accounts
  const sortedAccounts = useMemo(() => {
    if (!accounts) return [];

    // Filter out inactive accounts
    const activeAccounts = accounts.filter(account => account.activeAccount);
    
    // 2. Sort the active accounts
    return activeAccounts;
  }, [accounts]);


  // New code block to find the ID of the first sorted account
  const firstSortedAccountId = useMemo(() => {
    if (!sortedAccounts) return 0;
    // sortedAccounts is already sorted by user.defaultAccount (if present) 
    // and then by sortOrder. The first element is the one we want.
    return sortedAccounts.length > 0 ? sortedAccounts[0].accountId : 0;
  }, [sortedAccounts]);


  const showToast = (message: string, type: 'info' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };

  // Function to check if form is valid
  const validateForm = (amount: number, error: string | null) => {
    return amount > 0 && error === null;
  };

  // Handle selected card id change from SliderComponent
  const handleAccountSelect = (accountId: number) => {
    setSelectedAccountId(accountId); // Update the state with the selected account id
  };

  // Handle Amount
  const handleAmountChange = (newAmount: number) => {
    setAmountInCents(newAmount);
    setIsFormValid(validateForm(newAmount, error));
  };



  // Handle Note Validation  
  const handleNoteChange = async (value: string) => {
    setNote(value); // Always update the input state first

    let newError: string | null = null;

    if (!value.trim()) { 
      newError = null; // Clear error when empty
    } else if (!validateName(value)) {
      newError = t('common.invalid_name');
    }

    setError(newError);
    setIsFormValid(validateForm(amountInCents, newError)); // Check form validity
  };

  // Handle Date
  const handleDateChange = async () => {
    const dateStr = await openDatePicker(new Date(selectedDate));
  
    if (dateStr) {
      setSelectedDate(new Date(dateStr));
    }
  };

  
  const selectExpenseCurrency = (currency: CurrencyData) => {
    setSelectedCurrency(currency);
    setExpenseCurrencyCode(currency.code);
    setExpenseLocale(currency.locale);
    setIsAlternativeModalOpen(false);
  };


  // Handle trip id
  const handleTripId = () => {
    if (!selectedTripId) return;
  
    if (tripId) {
      setTripId(0);
      showToast(t('expenses.save_as_regular_exp'), 'info');

    } else {
      setTripId(selectedTripId);
      showToast(t('expenses.save_as_trip_exp'), 'info'); // or 'Upload complete!'
    }
  };  

  // Success Modal
  const openInfoModal = () => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: t('expenses.new_exp_added'),
      actions: [
        {
          label: t('common.continue'),
          action: () => {
            setIsConfirmationModalOpen(false);
            setResetTrigger(prev => prev + 1);
            history.back(); // This works like <IonBackButton />
          },
        },
      ],
    });
    setIsConfirmationModalOpen(true);
  };
  

  // Failure Modal
  const openFailureModal = () => {
    setModalConfig({
      icon: 'failure',
      title: t('modal.failure_modal_title'),
      content: t('modal.failure_add_account_msg'),
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
    });
    setIsConfirmationModalOpen(true);
  };

  // Save notification data
  const handleSave = (data: NotificationData | undefined) => {
    setNotification(data);
    setShowNotifyModal(false);
  };
  

  // Create new expense record in database
  async function addNewExpense() {  
    let amountDefault = amountInCents; // case 1: regular expense in default currency
    let amountAlt = 0;
    let amountTrip = 0;

    // Trip expense
    if(tripId){ 
      checkTrip();
      amountTrip = amountInCents; // Case 3: trip expense in trip's currency
      // convert amount to default currency
      const rate = getExchangeRate(expenseCurrencyCode);
  
      if (rate) {
        amountDefault = Math.round(amountInCents / rate);
      }

      // Done in a different currency than trip's
      if(expenseCurrencyCode !== tripCurrencyCode) { // Case 4: trip expense in alternative currency
        amountAlt = amountInCents;
        const MIN_CONVERTED_VALUE = 0.01;

        // convert amount to trip's currency
        const convertedAmount = convertCurrency(amountInCents, expenseCurrencyCode, tripCurrencyCode);
        if(convertedAmount) {
          if (convertedAmount === null || (convertedAmount / 100) < MIN_CONVERTED_VALUE) {
            const amountInEuros = (convertedAmount / 100).toFixed(4);
            showToast(
              t('expenses.amount_too_small', {
                currency: tripCurrencyCode,
                amount: amountInEuros
              }),
              'error'
            );           
            return;
          }
  
          amountTrip = convertedAmount;
          
          // convert amount to default currency
          const rate = getExchangeRate(expenseCurrencyCode);
  
          if (rate) {
            amountDefault = Math.round(amountInCents / rate);
          }
        }
      } 
    } else if (expenseCurrencyCode !== currency.defaultCurrency.code) { // Case 2: regular expense in alternative currency
      amountAlt = amountInCents;
      const rate = getExchangeRate(expenseCurrencyCode);
  
      if (rate) {
        amountDefault = Math.round(amountInCents / rate);
      }
    }

    try {
      await addExpenseWithRecurrence({  
        userId: 1,
        expenseNote: note,
        accountId: selectedAccountId,
        categoryId,
        subcategoryId,
        expenseAmountDefault: amountDefault,
        expenseAmountTrip: amountTrip,
        expenseAmountAlt: amountAlt,
        expenseCurrencyCode,
        expenseLocale,
        tripId,
      }, selectedDate, recurrence);

      if(recurrence.isRecurring) await logAutoExpenses();
      openInfoModal();
    } catch (error) {
      // show error
      openFailureModal();
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

      <IonContent className="ion-padding-horizontal">
        {/* Screen Header */}
        <div className='centered-container mb-20'>
          <h2 className='screen-title'>{t('expenses.new_exp')}</h2>
        </div>

        <AccountSlider  
          key={`account-slider-${resetTrigger}`}
          accounts={sortedAccounts}
          editAccount={selectedAccountId}
          onAccountSelect={handleAccountSelect} // Pass the callback to SliderComponent
        />  

        {/* Amount input */}
        <div className='amount'>
          {selectedCurrency && 
            <AmountInput
              key={`amount-input-${resetTrigger}`}
              locale={selectedCurrency.locale}
              decimalSeparator={selectedCurrency.decimalSeparator}
              thousandSeparator={selectedCurrency.thousandSeparator}
              currencySymbol={selectedCurrency.symbol}
              currencyCode={selectedCurrency.code}
              onAmountChange={handleAmountChange} 
              showCurrencyCode={isAlternativeCurrency}
            />
          }

          {expenseCurrencyCode !== currency.defaultCurrency.code && (
            <div className="converted-amount">
              ≈ <span className='converted-amount-code'>{currency.defaultCurrency.code}</span>
              {convertedAmountText}
            </div>
          )}
        </div>
        

        {/* Additional configuration */}
        <div className='additional-config'>
          
          {/* Categories */}
          <div className='aditional-btn'>   
            <div>
              <IonIcon icon={gridOutline} className='small-icon-btn primary' />
            </div>
            <div 
              className='selected-info' 
              onClick={() => setIsOpenCategoryModal(true)}
            >
              {subcategoryId ? (
                <>
                  <span className="title">{t('expenses.config_subcat')}</span>
                  <span className='data'>{subcategory && subcategory.subcategoryName}</span>
                </>
              ) : (
                <>
                  <span className="title">{t('expenses.config_cat')}</span>
                  <span className='data'>{category && category.categoryName}</span>
                </>
              )}
            </div>
          </div>

          {/* Date */}
          <div className='aditional-btn'>
            <div>
              <IonIcon icon={calendarOutline} className='small-icon-btn primary' />
            </div>
            <div className='selected-info' onClick={() => handleDateChange()}>
              <span className="title">{t('expenses.config_date')}</span>
              <span className='data'><FormattedDate date={selectedDate} format="short" /></span>
            </div>
          </div>

          {/* Frecuency */}
          <div
            className={`aditional-btn ${isTravelMode && 'disabled'}`}
            onClick={isTravelMode ? undefined : () => setShowFrequencyModal(true)}
          >
            <div>
              <IonIcon icon={syncOutline} className='small-icon-btn primary' />
            </div>
            <div className='selected-info'>
              <span className="title">{t('expenses.config_freq')}</span>
              {!recurrence.isRecurring ? (
                <span className='data'>{t('expenses.config_only_once')}</span>
              ) : (
                <span className='data'>
                  {t('expenses.config_every')} {recurrence.interval > 1 ? recurrence.interval : ''} {t(`date.${recurrence.unit}`)}
                  {recurrence.interval > 1 ? 's' : ''}
                  {typeof recurrence.totalOccurrences === 'number' && ` x ${recurrence.totalOccurrences}`}
                  {recurrence.endDate && (
                    <>
                      {t('expenses.config_until')}{" "}
                      {new Date(recurrence.endDate).toLocaleDateString()}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Currency */}
          <div className='aditional-btn' onClick={() => setIsAlternativeModalOpen(true)}>
            <div>
              <IonIcon icon={cashOutline} className='small-icon-btn primary' />
            </div>
            <div className='selected-info'>
              <span className="title">{t('expenses.config_currency')}</span>
              <span className='data'>{selectedCurrency?.name}</span>  
            </div>
          </div>


          {/* Add notification if recurrence */}
          {recurrence.isRecurring === 1 && (
            <>
              {/* Notify */}
              <div className='aditional-btn' onClick={() => setShowNotifyModal(true)}>
                <div>
                  {notification ? (
                    <IonIcon icon={notificationsOutline} className='small-icon-btn primary'/>
                ) : (
                    <IonIcon icon={notificationsOffOutline} className='small-icon-btn primary' />
                  )}

                </div>
                <div className='selected-info'>
                  <span className="title">{t('common.notify')}</span>
                  {notification ? (
                    <span className='data'>{notification.amount} {notification.unit} at {notification.time}</span>
                  ) : (
                    <span className='data'>{t('common.no')}</span>
                  )}
                </div>
              </div>

              {/* Log expense automatically / manually */}
              <div 
                className='aditional-btn' 
                onClick={() =>
                  setRecurrence(prev => ({
                    ...prev,
                    logAutomatically: !prev.logAutomatically
                  }))
                }
              >
                <div>
                    <IonIcon icon={gitCompareOutline} className='small-icon-btn primary' />
                </div>
                <div className='selected-info'>
                  <span className="title">{t('expenses.log_exp')}</span>
                  <span className='data'>{recurrence.logAutomatically ? t('expenses.config_auto') : t('expenses.config_man')}</span>
                </div>
              </div>
            </>
          )}

          {/* Trip Expense */}
          {isTravelMode && (
            <div className='aditional-btn full-width disabled'>
              <div>
                <IonIcon icon={airplaneOutline} />
              </div>
              <div className='selected-info'>
                <span className="title">{t('expenses.config_trip_exp')}</span>
                <span className='data'>{tripId ? selectedTrip?.tripName : t('common.no')}</span>
              </div>
            </div>
          )}


        </div>

        {/* Add note */}
        <div className="form-item">
          <div className="parent-input">  
            <div className="input-container">
              <input
                type="text"
                value={note}
                maxLength={30}
                placeholder={t('expenses.config_note')}
                onChange={(e) => handleNoteChange(e.target.value) }
                className={`input ${error ? 'invalid' : ''}`}
                />
              {error && <p className="error-text">{error}</p>}
            </div>
            {isTravelMode && (
              <button 
                id="open-toast"
                onClick={handleTripId}
              >
                {tripId ? <IonIcon icon={airplane} /> : <IonIcon icon={airplaneOutline} />}
              </button>
            )}
          </div>
        </div>


        {/* Save changes button */}
        <IonButton
          className="block mb-60"
          onClick={() => {
            if (isFormValid) {
              addNewExpense();
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {t('expenses.add_new_exp')}
        </IonButton>


        {/* Category picker modal */}
        <IonModal isOpen={isOpenCategoryModal}>
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setIsOpenCategoryModal(false)}>
                  <IonIcon aria-hidden="true" icon={arrowBackOutline} className='close-modal'></IonIcon>
                </IonButton>  
              </IonButtons>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowFavourites(prevState => !prevState)}>
                  {showFavourites ? (
                      <IonChip>
                        {t('common.view_all')}
                      </IonChip>
                    ) : (
                      <IonChip>
                        {t('common.view_favs')}
                      </IonChip>
                  )}
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <CategoryPicker
              selectedCategory={categoryId}
              selectedSubcategory={subcategoryId}
              onCategorySelect={handleCategorySelect} // Updated to use the handler
              showFavourites={showFavourites}
            />
          </IonContent>
        </IonModal>


        {/* modal for default and alternative currency selection */}
        <IonModal isOpen={isAlternativeModalOpen} onDidDismiss={() => setIsAlternativeModalOpen(false)}>
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonTitle>{t('currency.select_currency')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsAlternativeModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {allSelectedCurrencies.length > 0 ? (
              allSelectedCurrencies.map((currencyItem) => (
                <IonItem
                  key={currencyItem.code}
                  button
                  onClick={() => selectExpenseCurrency(currencyItem)}
                  disabled={currencyItem.code === selectedCurrency.code}
                >
                  <IonLabel>{`${currencyItem.name} (${currencyItem.symbol})`}</IonLabel>
                </IonItem>
              ))
            ) : (
              <p>{t('currency.no_alt_curr_add')}</p>
            )}
          </IonContent>
        </IonModal>


        {/* Frequency modal */}
        <IonModal 
          isOpen={showFrequencyModal} 
          onDidDismiss={() => setShowFrequencyModal(false)}
          className="small-modal"
        >
          <div className="small-modal-content">
            <h3 className="mb-20 centered-container">{t('common.repeat')}</h3>

            <FrequencyForm  
              startDate={selectedDate.toISOString()}
              onDone={(settings: RecurrenceSettings) => {
                setRecurrence(settings);         // Save the recurrence data
                setShowFrequencyModal(false);    // Close modal
              }}
              initialSettings={recurrence}
            />
          </div>
        </IonModal>

        {/* Notify modal */}
        <IonModal 
          isOpen={showNotifyModal} 
          onDidDismiss={() => setShowNotifyModal(false)}
          className="small-modal"
        >
          <div className="small-modal-content">
            <h3 className="mb-30 centered-container">{t('expenses.config_notify')}</h3>

            <NotificationForm
              onSave={handleSave}
              onCancel={() => setShowNotifyModal(false)}
              initialValue={notification}
            />
          </div>
        </IonModal>


        {/* Confirmation Modal */}
        <Modal
          isOpen={isConfirmationModalOpen}
          icon={modalConfig.icon}
          title={modalConfig.title}
          content={modalConfig.content}
          closeModal={() => setIsConfirmationModalOpen(false)}
          actions={modalConfig.actions}
        />

        <CustomToast
          message={toastMessage}
          isOpen={toastOpen}
          onDismiss={() => setToastOpen(false)}
          type={toastType ?? undefined}
        />


      </IonContent>
    </IonPage>
  );
};

export default NewExpense;
