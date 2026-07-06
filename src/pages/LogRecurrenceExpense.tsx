import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db'; 
import { useTranslation } from 'react-i18next';
import dayjs from "dayjs";


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { RecurrenceSettings } from '../hooks/useRecurringExpense';
import { useCurrency, CurrencyType } from '../context/CurrencyContext';
import { useExpense } from '../context/ExpenseContext';
import { useRecurringExpense } from '../hooks/useRecurringExpense';
import { useDatePicker } from '../context/DatePickerContext'; 


// Utility functions
import { validateName } from '../utils/validateName';
import { getOldestOverdueExpenseForSeries, isBeforeToday, isBeforeOrToday } from '../utils/recurrenceFunctions';
import { getRecurringSeriesById, getDateRange } from '../utils/recurrenceUtils';


// App component
import AccountSlider from '../components/AccountSlider';
import AmountInput from '../components/AmountInput';
import { NotificationData } from '../components/NotificationForm';
import FormattedDate from '../components/FormattedDate';
import CategoryPicker from '../components/CategoryPicker';
import FrequencyForm from '../components/FrequencyForm';
import Modal from '../components/Modal';


// Ionic components 
import { 
  IonAlert,
  IonBackButton, 
  IonButton,
  IonButtons,
  IonChip, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonModal,
  IonPage,
  IonToolbar,
  useIonViewWillEnter
} from '@ionic/react';


// Ionic icons
import { 
  arrowBackOutline,
  calendarOutline,
  cashOutline,
  gitCompareOutline,
  gridOutline,
  notificationsOffOutline,
  notificationsOutline,
  syncOutline,
} from 'ionicons/icons';

// Styles
import '../Main.css';


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


const defaultRecurrence: RecurrenceSettings = {
	isRecurring: 0,
	unit: 'month',          // Arbitrary; won't be used if isRecurring is false
	interval: 1,
	endCondition: 'never',
	totalOccurrences: null,
	logAutomatically: false,
	lastLoggedDate: '',
	lastLoggedInstallmentIndex: 0,
	endDate: ''
};


const defaultCurrency: CurrencyType = {
	name: 'United States Dollar',
	code: 'USD',
	symbol: '$',
	locale: 'en-US',
	thousandSeparator: ',',
	decimalSeparator: '.',
};


const LogRecurrenceExpense: React.FC = () => {
  const { t } = useTranslation();
  const { checkExpense, checkRecurrence } = useExpense();
  const { logExpenseForSeries, finalizeRemainingInstallments } = useRecurringExpense();
  const { openDatePicker } = useDatePicker(); // 👈 access the date picker
  
  const contentRef = useScrollToTop(); // use the custom hook 
  const { user } = useUser(); 
	const { allSelectedCurrencies } = useCurrency(); 
  const { seriesId } = useParams<{ seriesId: string }>(); // passed series id to fill the form, always a string
	const [passedRecurrenceId, setPassedRecurrenceId] = useState<number>(Number(seriesId));
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode") ?? "next"; // default to "next"
	const today = new Date();
	const [startDate, setStartDate] = useState<Date>(today); 
  const [originalDueDate, setOriginalDueDate] = useState<Date>(today);
  const [nextDueDate, setNextDueDate] = useState<Date>(today);
	const [categoryId, setCategoryId] = useState<number>(1);

  const [accountId, setAccountId] = useState<number>(0);
	const [subcategoryId, setSubcategoryId] = useState<number>(0);
  const [showFavourites, setShowFavourites] = useState(false); // State to toggle between favourites and all categories
  const [note, setNote] = useState<string>('');
  const [amountDefault, setAmountDefault] = useState<number>(0);
  const [amountAlt, setAmountAlt] = useState<number>(0);
  const [currencyCode, setCurrencyCode] = useState<string>('');
	const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(defaultCurrency);
	const [locale, setLocale] = useState<string>('');
	const [amountInCents, setAmountInCents] = useState(0);
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const [resetTrigger, setResetTrigger] = useState<number>(0);
	const [error, setError] = useState<string | null >(null);

	const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrence);
	const [isFormValid, setIsFormValid] = useState<boolean>(true); // Change to false when validating form
	
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
  const [showEndDateAlert, setShowEndDateAlert] = useState(false);

	// Frecuency modal variables
	const [showFrequencyModal, setShowFrequencyModal] = useState(false);
	const [notification, setNotification] = useState<NotificationData | undefined>(undefined);
	const [showNotifyModal, setShowNotifyModal] = useState<boolean>(false);
  
	

	// Initialize state from currency context
	useIonViewWillEnter(() => {
		setError(null);
		setResetTrigger(prev => prev + 1);
	});

	
	useEffect(() => {
		if (!seriesId) return;
	
		async function initializeRecurrenceFields(seriesId: string) {
			const series = await getRecurringSeriesById(Number(seriesId));
			if(!series) return;
			setPassedRecurrenceId(series.seriesId);
			const recurrenceStartDate = new Date(series.startDate);
      setStartDate(recurrenceStartDate);
      if(series.originalNextDueDate)
        setOriginalDueDate(new Date(series.originalNextDueDate));	
      //setNextDueDate(new Date(series.nextDueDate ?? new Date().toISOString()));
      setNextDueDate(today);
      setAccountId(series.accountId);
			setCategoryId(series.categoryId);
			setSubcategoryId(series.subcategoryId);
      setNote(series.note);
      setAmountDefault(series.amountDefault);
      setAmountAlt(series.amountAlt);
			setCurrencyCode(series.currencyCode);

      setRecurrence({
        isRecurring: series.isActive,
        unit: series.unit,
        interval: series.interval,
        endCondition:
          series.endDate
            ? 'onDate'
            : series.totalOccurrences !== null
            ? 'afterOccurrences'
            : 'never',
        totalOccurrences: series.totalOccurrences ?? null,
        logAutomatically: series.logAutomatically,
        lastLoggedDate: series.lastLoggedDate,
        lastLoggedInstallmentIndex: series.lastLoggedInstallmentIndex,
        endDate: series.endDate ?? null
      });
	
			// ✅ Get expense currency and locale
			const foundCurrency = allSelectedCurrencies.find(
				(currency) => currency.code === series.currencyCode
			);
			if (foundCurrency) {
				setSelectedCurrency(foundCurrency);
				setLocale(series.locale);
			}
	
			// ✅ Get original amount
			const amount =
				series.amountAlt > 0 ? series.amountAlt :
				series.amountDefault;
	    
      setIsFormValid(validateForm(amount, error));

      // If paying remaining installments all together
      if (mode === "remaining") {
        const totalUnpaid = series.totalOccurrences != null
        ? series.totalOccurrences - (series.lastLoggedInstallmentIndex ?? 0)
        : null; // or undefined — meaning "can't calculate"

        if (totalUnpaid !== null) {
          setAmountInCents(amount * totalUnpaid);
        } 
      } else {
        setAmountInCents(amount);
      }
		}
	
		initializeRecurrenceFields(seriesId);

	}, [seriesId]);


	// Function to check if form is valid
	const validateForm = (amount: number, error: string | null) => {
		return amount > 0 && error === null;
	};


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
    
    return accounts
      .filter(account => account.activeAccount)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [accounts]);	

	// Handle selected card id change from SliderComponent
	const handleAccountSelect = (accountId: number) => {
	setAccountId(accountId); // Update the state with the selected account id
	};


	// Handle Amount
	const handleAmountChange = (newAmount: number) => {
		setAmountInCents(newAmount);
    
		setIsFormValid(validateForm(newAmount, error)); // Check form validity
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
    // Log expense deals with dates in the past or present, that's why
    // min date is one day after the previuos due date, and max is today
    const { min, max } = getDateRange(originalDueDate, recurrence.unit, 1);
    const pickedDateISO = await openDatePicker(new Date(), {
      minDate: min,
      maxDate: today,
    });
  
    if (!pickedDateISO) return; // user cancelled
  
    setNextDueDate(new Date(pickedDateISO));
  };
  

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
            setResetTrigger(prev => prev + 1);
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
            setResetTrigger(prev => prev + 1);
          },
          style: 'fail-btn', // Optional CSS class
        },
      ],
    });
    setIsConfirmationModalOpen(true);
  };


  async function handleLogExpense() {
    const isExpired =
        recurrence.endDate &&
        dayjs(recurrence.endDate).isBefore(dayjs(), "day");

    if (isExpired) {
      // show alert first
      setShowEndDateAlert(true);
    } else {
      // no alert needed, just update
      await logRecurrenceExpense(passedRecurrenceId, false);
    }
  }

  // Update expense record in database
  async function logRecurrenceExpense(passedRecurrenceId: number, forceInactive: boolean) {
    // Check if recurrence exists
    const existingRecurrence = await db.recurringSeries.get(passedRecurrenceId);
    if (!existingRecurrence) {
      openFailureModal(t('expenses.recurrence_not_found')); 
      return;
    }
    
    try {
      let assignAmountAlt = 0;
      let assignAmountDef = 0;
      amountAlt > 0 ? assignAmountAlt = amountInCents :
      assignAmountDef = amountInCents;

      // Log payment of remaining installments in recurrence AND FINALIZE IT
      if(mode === "remaining") {
        await finalizeRemainingInstallments(passedRecurrenceId, {
          payoff: true,
          baseOverride: {
          userId: 1,
          expenseNote: note,
          accountId: accountId,
          categoryId,
          subcategoryId,
          expenseAmountDefault: assignAmountDef,  
          expenseAmountTrip: 0,
          expenseAmountAlt: assignAmountAlt,
          expenseCurrencyCode: currencyCode,
          expenseLocale: locale,
          tripId: null,
          installmentIndex: existingRecurrence.lastLoggedInstallmentIndex + 1,
          }
        });

      } else {
        // Log next due expense
        if(isBeforeOrToday(nextDueDate.toISOString())) {
          console.log("is before or today");
          await logExpenseForSeries(passedRecurrenceId, {
            userId: 1,
            expenseNote: note,
            accountId: accountId,
            categoryId,
            subcategoryId,
            expenseAmountDefault: assignAmountDef,
            expenseAmountTrip: 0,
            expenseAmountAlt: assignAmountAlt,
            expenseCurrencyCode: currencyCode,
            expenseLocale: locale,
            tripId: null,
            installmentIndex: existingRecurrence.lastLoggedInstallmentIndex + 1,
          });    
          await db.transaction(
            'rw', 
            db.recurringSeries,
            async (tx) => {
              await tx.recurringSeries.update(passedRecurrenceId, { 
                estimatedAmount: existingRecurrence.estimatedAmount > 0 ? amountInCents : 0,
                lastLoggedDate: nextDueDate.toISOString(),
                lastLoggedInstallmentIndex: recurrence.lastLoggedInstallmentIndex + 1,
              });
            }
          );

          

        } else {
          const updateData: any = {
            totalOccurrences: recurrence.totalOccurrences,
            endDate: recurrence.endDate,
            logAutomatically: recurrence.logAutomatically,
            accountId: accountId,
            categoryId,
            subcategoryId,
            note: note,
            estimatedAmount: existingRecurrence.estimatedAmount > 0 ? amountInCents : 0, // Resets amount to last entered for next expense
            amountDefault: existingRecurrence.estimatedAmount > 0 ? 0 : assignAmountDef, // Sets to 0 if estimated amount is operable
            amountAlt: existingRecurrence.estimatedAmount > 0 ? 0 : assignAmountAlt,
            nextDueDate: nextDueDate.toISOString(),
          };
        
          if (isBeforeToday(recurrence.endDate)) {
            const hasOverdue = (await getOldestOverdueExpenseForSeries(passedRecurrenceId)) !== null;
            if(hasOverdue) {
              updateData.isActive = 2; // ended with overdue
            } else {
              updateData.isActive = 0; // ended
            }
            updateData.originalNextDueDate = null;
            updateData.nextDueDate = null;  
          } else if (forceInactive) {
            updateData.isActive = 0;
            updateData.nextDueDate = null;
            updateData.originalNextDueDate = null;
          }

          await db.transaction(
            'rw', 
            db.accounts,
            async (tx) => {
              await tx.recurringSeries.update(passedRecurrenceId, updateData);
            }
          );
    
        }
      }

      checkExpense(); // Notify totalizers like SliderTotalCard to re-fetch the total
      checkRecurrence();
      setNextDueDate(today);
      openSuccessModal(t('expenses.expense_logged'));
    } catch (error) {
      // show error
      openFailureModal(t('expenses.error_logging'));
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

      <IonContent className="ion-padding-horizontal"  ref={contentRef}>
        {/* Screen Header */}
        <div className='centered-container mb-10'>
          <h2 className="screen-title">
            {t(mode === 'remaining' 
              ? 'expenses.log_and_end_recurrence_title' 
              : 'expenses.log_title'
            )}
          </h2>        
        </div>

        <AccountSlider
          editAccount={accountId}
          key={`account-slider-${resetTrigger}`}
          accounts={sortedAccounts}
          onAccountSelect={handleAccountSelect} // Pass the callback to SliderComponent
        />

				{selectedCurrency && 
          <AmountInput
            key={`amount-input-${resetTrigger}`}
            locale={selectedCurrency.locale}
            decimalSeparator={selectedCurrency.decimalSeparator}
            thousandSeparator={selectedCurrency.thousandSeparator}
            currencySymbol={selectedCurrency.symbol}
            currencyCode={selectedCurrency.code}
            passedAmount={amountInCents}
            onAmountChange={handleAmountChange} 
            readOnly={mode === 'remaining' ? true : false}
          />
        }

				{/* Additional configuration */}
				<div className='additional-config'>
          
          {/* Categories */}
          <div className='aditional-btn'>
            <div>
              <IonIcon icon={gridOutline} className='small-icon-btn primary'></IonIcon>
            </div>
            <div 
              className='selected-info'
              onClick={() => setIsOpenCategoryModal(true)}
            >
              {subcategoryId ? (
                <>
                  <span className="title">{t('categories.subcategory')}</span>
                  <span className='data'>{subcategory && subcategory.subcategoryName}</span>
                </>
              ) : (
                <>
                  <span className="title">{t('categories.category')}</span>
                  <span className='data'>{category && category.categoryName}</span>
                </>
              )}
            </div>
          </div>

          {/* Date */}
          <div 
            className='aditional-btn'
            onClick={() => handleDateChange()}
          >
            <div>
              <IonIcon icon={calendarOutline} className='small-icon-btn primary'></IonIcon>
            </div>
            <div className='selected-info'>
              <span className="title">{t('expenses.config_date')}</span>
              <span className='data'><FormattedDate date={nextDueDate} format="short" /></span> 
            </div>
          </div>

          {/* Frecuency */}
          <div
            className="aditional-btn disabled"
            onClick={recurrence.totalOccurrences === null ? () => setShowFrequencyModal(true) : undefined}
          >
            <div>
              <IonIcon icon={syncOutline} className='small-icon-btn primary'></IonIcon>
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
          <div 
            className={`aditional-btn ${recurrence.isRecurring && 'disabled'}`}
            onClick={recurrence.isRecurring ? undefined : () => setIsAlternativeModalOpen(true)}          
          >
            <div>
              <IonIcon icon={cashOutline} className='small-icon-btn primary' />
            </div>
            
            <div className='selected-info'>
              <span className="title">{t('expenses.config_currency')}</span>
              <span className='data'>{selectedCurrency?.name}</span>
            </div>
          </div>

          {/* Add notification and Log expense */}
          {recurrence.isRecurring === 1 && (
            <>
              {/* Notify */}
              <div 
                className='aditional-btn disabled'
                onClick={() => setShowNotifyModal(true)}
              >
                <div>
                  {notification ? (
                    <IonIcon icon={notificationsOutline}  className='small-icon-btn primary'/>
                ) : (
                    <IonIcon icon={notificationsOffOutline}  className='small-icon-btn primary'/>
                  )}

                </div>
                <div className='selected-info'>
                  <span className="title">{t('expenses.notify')}</span>
                  {notification ? (
                    <span className='data'>{notification.amount} {notification.unit} at {notification.time}</span>
                  ) : (
                    <span className='data'>{t('common.no')}</span>
                  )}
                </div>
              </div>

              {/* Log expense automatically / manually */}
              <div 
                className='aditional-btn disabled' 
                onClick={() =>
                  setRecurrence(prev => ({
                    ...prev,
                    logAutomatically: !prev.logAutomatically
                  }))
                }
              >
                <div>
                    <IonIcon icon={gitCompareOutline}  className='small-icon-btn primary'/>
                </div>
                <div className='selected-info'>
                  <span className="title">{t('expenses.log_exp')}</span>
                  <span className='data'>{recurrence.logAutomatically ? t('expenses.config_auto') : t('expenses.config_man')}</span>
                </div>
              </div>
            </>
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
                placeholder="Note"
                onChange={(e) => handleNoteChange(e.target.value) }
                className={`input ${error ? 'invalid' : ''}`}
                />
              {error && <p className="error-text">{error}</p>}
            </div>
          </div>
        </div>
        

        {/* Save changes button */}
        <IonButton
          className="block mb-60"
          onClick={() => {
            if (isFormValid) {
              handleLogExpense();
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {t('expenses.log_exp')} {mode === 'remaining' ? ' and End Recurrence' : null}
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


        {/* Frequency modal */}
        <IonModal 
          isOpen={showFrequencyModal} 
          onDidDismiss={() => setShowFrequencyModal(false)}
          className="small-modal"
        >
          <div className="small-modal-content">
            <h3 className="mb-20 centered-container">{t('common.repeat')}</h3>

            <FrequencyForm  
              startDate={startDate.toISOString()}
              onDone={(settings: RecurrenceSettings) => {
                setRecurrence(settings);         // Save the recurrence data
                setShowFrequencyModal(false);    // Close modal 
              }}
              initialSettings={recurrence}
              editRecurrence={true}
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


        {/* Alert when selected ends date is earlier than today */}
        <IonAlert
          isOpen={showEndDateAlert}
          className='custom-alert'
          header={t('expenses.recurrence_ended')}
          message={t('expenses.recurrence_ended_message', {
            date: dayjs(recurrence.endDate).format('LL')
          })}
          buttons={[
            {
              text: t('common.cancel'),
              role: "cancel",
              handler: () => setShowEndDateAlert(false),
            },
            {
              text: t('common.proceed'),
              handler: async () => {
                setShowEndDateAlert(false);
                await logRecurrenceExpense(passedRecurrenceId, true);; // mark isActive = 0
              },
            },
          ]}
        />


      </IonContent>
    </IonPage>
  );
};

export default LogRecurrenceExpense;