import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Expense, Account } from '../db';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import { useCurrency, CurrencyType } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useExpense } from '../context/ExpenseContext';
import { useTrip } from '../context/TripContext';
import { useExchangeRates } from '../context/ExchangeRateContext';
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';
import { RecurrenceSettings, useRecurringExpense, ExpenseBase } from '../hooks/useRecurringExpense';
import { useDatePicker } from '../context/DatePickerContext';



// Utils
import { validateName } from '../utils/validateName';

// App components
import AccountSlider from '../components/AccountSlider';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import Modal from '../components/Modal';
import FormattedDate from '../components/FormattedDate';
import CustomToast from '../components/CustomToast';
import NotificationForm, { NotificationData } from '../components/NotificationForm';
import FrequencyForm from '../components/FrequencyForm';
import DeleteScopeModal from '../components/Modals/DeleteScopeModal';


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
  trashOutline 
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './NewExpense.css';
import { getRecurringSeriesById, getDateRange } from '../utils/recurrenceUtils';
import { getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions';


function useCategory(categoryId?: string) {
  return useLiveQuery(async () => {
    if (!categoryId) return undefined;
    return db.categories.get(categoryId); // Fetch parent category by its ID
  }, [categoryId]);
}


function useSubcategory(subcategoryId?: string | null) {
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



const EditExpense: React.FC = () => {
  const { t } = useTranslation();
  const { user, userId } = useUser(); 
  const { currency, allSelectedCurrencies } = useCurrency(); 
  const { convertCurrency, getExchangeRate } = useExchangeRates();
  const { updateExpenseWithRecurrence } = useRecurringExpense();
  const { travelMode, checkTrip, trips, selectedTripId } = useTrip();
  const { openDatePicker } = useDatePicker();
  
  const [tripId, setTripId] = useState<string | null>(null);
  const [toggledTripId, setToggledTripId] = useState<string | null>(null);  
  const [tripName, setTripName] = useState<string>('');
  const [tripCurrencyCode, setTripCurrencyCode] = useState<string>('');
  const [isTravelMode, setIsTravelMode] = useState<boolean>(false);
  
  const { checkExpense, checkRecurrence } = useExpense();
  const { expenseId } = useParams<{ expenseId: string }>(); // passed expense id to fill the form, always a string
  const expense = useLiveQuery(() => db.expenses.get(expenseId), [expenseId]); // get it from Dexie 
  const [passedExpenseId, setPassedExpenseId] = useState<string>(expenseId);

  const accounts: Account[] | undefined = useLiveQuery(
    () => db.accounts.orderBy('sortOrder').toArray()
  );

  const today = new Date();

  const [selectedCardId, setSelectedCardId] = useState<string>('');
  // 🏆 NEW STATE: Holds the original account ID from the expense
  const [initialExpenseAccountId, setInitialExpenseAccountId] = useState<string>('');
  const [amountInCents, setAmountInCents] = useState(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(today);  
  const [expenseCurrencyCode, setExpenseCurrencyCode] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [expenseLocale, setExpenseLocale] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'error' | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  
  const [error, setError] = useState<string | null >(null);
  const [isFormValid, setIsFormValid] = useState<boolean>(true); // Change to false when validating form
  const [showFavourites, setShowFavourites] = useState(false); // State to toggle between favourites and all categories
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Modal variables
  const [dateIsOpen, setDateIsOpen] = useState(false); // controls date modal open/close
  const [isOpenCategoryModal, setIsOpenCategoryModal] = useState(false);
  const [isAlternativeModalOpen, setIsAlternativeModalOpen] = useState<boolean>(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
  });

  // Frecuency modal variables
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrence);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<string>('');
  const [notification, setNotification] = useState<NotificationData | undefined>(undefined);
  const [showNotifyModal, setShowNotifyModal] = useState<boolean>(false);
  // Alert variables for updating reccurring expense
  const [showScopeAlert, setShowScopeAlert] = useState(false);
  const [showDeleteScopeAlert, setShowDeleteScopeAlert] = useState(false); // for delete
  const scopeResolverRef = useRef<(value: 'this' | 'future' | 'all' | undefined) => void>();
  const deleteScopeResolverRef = useRef<(scope: 'this' | 'future' | 'all' | undefined) => void>();
  const dateRangeRef = useRef<number>(30);


  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(dateIsOpen, setDateIsOpen);
  useBackButtonModalReset(isOpenCategoryModal, setIsOpenCategoryModal);
  useBackButtonModalReset(isAlternativeModalOpen, setIsAlternativeModalOpen);
  useBackButtonModalReset(isConfirmationModalOpen, setIsConfirmationModalOpen);

  useKeyboardAutoClose();

  // Get trip info if in travel mode
  useEffect(() => {
    if(travelMode) {
      const foundTrip = trips.find(
        (trip) => trip.tripId === selectedTripId
      );

      if(foundTrip) {
        setTripName(foundTrip.tripName);
        setTripCurrencyCode(foundTrip.currencyCode);
      } 
    }
  }, []);

  // Load expense data
  useEffect(() => {
    if (!expense) return;
  
    async function initializeExpenseFields(definedExpense: Expense) {
      setDueDate(definedExpense.dueDate ? new Date(definedExpense.dueDate) : undefined);
      const expenseDate = new Date(definedExpense.expenseDate);
      setPassedExpenseId(definedExpense.expenseId);
      setCategoryId(definedExpense.categoryId);
      setSubcategoryId(definedExpense.subcategoryId);
      setSelectedCardId(definedExpense.accountId);
      // 🏆 SET STABLE INITIAL ID HERE:
      setInitialExpenseAccountId(definedExpense.accountId);
      if(expense?.isActive) {
        setSelectedDate(expenseDate);
      } else {
        setSelectedDate(today);
      }
      
      setNote(definedExpense.expenseNote);
      setExpenseCurrencyCode(definedExpense.expenseCurrencyCode);
      setTripId(definedExpense.tripId); // keeps original trip id
      setToggledTripId(definedExpense.tripId); // initializes trip id toggle
  
      // Get recurring series data
      if (definedExpense.seriesId) {
        const series = await getRecurringSeriesById(definedExpense.seriesId);
        if (series) {
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

          setRecurrenceStartDate(series.startDate);

          let selectedUnitDays = 0;
          switch (series.unit) {
            case 'month':
              selectedUnitDays = 30;
              break;
            case 'week':
              selectedUnitDays = 7;
              break;
            case 'year': 
              selectedUnitDays = 365;
              break;
          }

          dateRangeRef.current = series.interval * selectedUnitDays;
        }
      }
  
      // ✅ Get trip name
      if (definedExpense.tripId) {
        const foundTrip = trips.find(
          (trip) => trip.tripId === definedExpense.tripId
        );
        if (foundTrip) {
          setTripName(foundTrip.tripName);
          setTripCurrencyCode(foundTrip.currencyCode);
        }
      }
  
      // ✅ Get expense currency and locale
      const foundCurrency = allSelectedCurrencies.find(
        (currency) => currency.code === definedExpense.expenseCurrencyCode
      );

      if (foundCurrency) {
        setSelectedCurrency(foundCurrency);
        setExpenseLocale(definedExpense.expenseLocale);

        if (foundCurrency.code !== currency.defaultCurrency.code) {
          let rate = 1;
        
          if (definedExpense.expenseAmountAlt > 0) {
            rate =
              definedExpense.expenseAmountDefault /
              definedExpense.expenseAmountAlt;
          } else if (definedExpense.expenseAmountTrip > 0) {
            rate =
              definedExpense.expenseAmountDefault /
              definedExpense.expenseAmountTrip;
          }
        
          setExchangeRate(rate);
        }
      }

      // ✅ Get original amount
      const amount =
        definedExpense.expenseAmountAlt > 0 ? definedExpense.expenseAmountAlt :
        definedExpense.expenseAmountTrip > 0 ? definedExpense.expenseAmountTrip :
        definedExpense.expenseAmountDefault;
  
      setAmountInCents(amount);
    }
  
    initializeExpenseFields(expense);
  }, [expense]);


  const convertedAmountText = useMemo(() => {
    if (
      amountInCents <= 0 ||
      expenseCurrencyCode === currency.defaultCurrency.code
    ) {
      return '';
    }
  
    if (!exchangeRate) return '';
  
    const converted = Math.round(amountInCents * exchangeRate);
  
    return new Intl.NumberFormat(
      currency.defaultCurrency.locale,
      {
        style: 'currency',
        currency: currency.defaultCurrency.code,
      }
    ).format(converted / 100);
  }, [
    amountInCents,
    exchangeRate,
    expenseCurrencyCode,
    currency.defaultCurrency.code,
    currency.defaultCurrency.locale,
  ]);
  
  
 
  // Initialize state from currency context
  useIonViewWillEnter(() => {
    setError(null);
    setResetTrigger(prev => prev + 1);
  });

 
  // Fetch category 
  const category = useCategory(categoryId);
  const subcategory = useSubcategory(subcategoryId);

  const handleCategorySelect = ({ categoryId, subcategoryId }: { categoryId: string; subcategoryId: string }) => {
    setCategoryId(categoryId); // Update the parent category ID
    setSubcategoryId(subcategoryId);
    setIsOpenCategoryModal(false); // Close the modal
  };

  const showToast = (message: string, type: 'info' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };



  // Get all active accounts AND the currently selected inactive account (if applicable)
  const sortedAccounts = useMemo(() => {
    if (!accounts) return [];

    // 🏆 CHANGE: Use the stable initial ID, NOT the one that changes on swipe
    const expenseAccountId = initialExpenseAccountId;
    
    const filteredAccounts = accounts
      .filter(account => 
        account.activeAccount || 
        account.accountId === expenseAccountId
      )
      .sort((a, b) => {
        // Keep active accounts at the top, using the Unary Plus operator (+)
        // The expression (+b.activeAccount - +a.activeAccount) evaluates to:
        // (1 - 0) = 1 (b is active, a is inactive -> b comes first)
        // (0 - 1) = -1 (b is inactive, a is active -> a comes first)
        // (1 - 1) or (0 - 0) = 0 (order doesn't change)
        return (+b.activeAccount - +a.activeAccount);
      });

    return filteredAccounts;
  }, [accounts, initialExpenseAccountId]);



  // Function to check if form is valid
  const validateForm = (amount: number, error: string | null) => {
    return amount > 0 && error === null;
  };


  // Handle selected card id change from SliderComponent
  const handleAccountSelect = (accountId: string) => {
    setSelectedCardId(accountId); // Update the state with the selected account id
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
    let dateStr: string | null;
    let min: Date | undefined;
    let max: Date | undefined;
  
    if (recurrence.isRecurring) {
      // Compute a min/max date range based on recurrence
      if (recurrence.logAutomatically) {
        // destructure into temp vars, then assign to outer min/max
        const range = getDateRange(dueDate, recurrence.unit, 1);
        min = range.min;
        max = range.max;
      } else {
        min = new Date(recurrenceStartDate);
        max = new Date(); // "today"
      }
  
      dateStr = await openDatePicker(new Date(selectedDate), {    
        minDate: min,
        maxDate: max,
      });

    } else {
      // Use default min/max from DatePickerContext
      dateStr = await openDatePicker(selectedDate);
    }

    if (dateStr) {
      setSelectedDate(new Date(dateStr));
    }
  };
  
  // Handle trip id
  const handleTripId = () => {
    if(selectedTripId && toggledTripId === null) {  
      setToggledTripId(selectedTripId);
      showToast(t('expenses.save_as_trip_exp'), 'info'); // or 'Upload complete!'

    } else {
      setToggledTripId(prev => (prev === toggledTripId ? null : toggledTripId));
      showToast(t('expenses.save_as_regular_exp'), 'info');

    }
  }


  // Handle expense currency
  const selectExpenseCurrency = (currency: CurrencyType) => {
    setSelectedCurrency(currency);
    setExpenseCurrencyCode(currency.code);
    setExpenseLocale(currency.locale);
    setIsAlternativeModalOpen(false);
  };


  // Save notification data
  const handleSave = (data: NotificationData | undefined) => {
    setNotification(data);
    setShowNotifyModal(false);
  };


  // Function to open delete alert and get the user's choice via Promise
  const askDeleteScope = () => {
    return new Promise<'this' | 'future' | 'all' | undefined>(resolve => {
      deleteScopeResolverRef.current = resolve;
      setShowDeleteScopeAlert(true);
    });
  };


  // Call this when user wants to delete a recurring expense
  async function handleDeleteClick(passedExpenseId: string) {
    if (expense && !expense.seriesId) {
      // Not a recurring expense - just delete directly
      deleteExpense(passedExpenseId);
    } else if (expense && expense.seriesId) {
      // Recurring expense - ask the user how to delete
      const choice = await askDeleteScope();

      if (!choice) {
        // User cancelled deletion
        return;
      }

      if (choice === 'this') {
        // Delete only this instance
        await deactivateRecurrentExpense(passedExpenseId);
      } else if (choice === 'future') {
        // Delete this and future expenses in the series
        await deleteThisAndFutureExpenses(expense.expenseId, expense.seriesId);
      } else if (choice === 'all') {
        // Delete entire recurring series
        deleteEntireRecurringSeries(expense.seriesId);
      }
    }
  }


  // Delete only this instance in a recurrent series
  async function deactivateRecurrentExpense(expenseId: string) {
    try {
      await db.transaction(
        'rw', 
        db.expenses,
        async (tx) => {
          await tx.expenses.update(expenseId, { isActive: 2, deletionDate: today.toISOString() });
        }
      );

      checkExpense(); // Notify totalizers like SliderTotalCard to re-fetch the total
      openSuccessModal(t('expenses.expense_deleted')); // Success feedback
    } catch (error) {
      openFailureModal(t('expenses.error_deleting_exp'));
      console.error('Error deleting expense:', error);
    }
  }


  // Delete this and future instances in a recurrent series
  async function deleteThisAndFutureExpenses(expenseId: string, seriesId: string) {
    try {
      await db.transaction(
        'rw', 
        db.expenses,
        db.recurringSeries,
        async (tx) => {

          // 1. Get the recurring series for nextDueDate
          const series = await tx.recurringSeries.get(seriesId);
          if (!series) throw new Error(t('expenses.series_not_found'));

          const { nextDueDate } = series;

          // 2. Fetch expenses to deactivate
          const expensesToUpdate = await tx.expenses
            .where('seriesId')
            .equals(seriesId)
            .filter(exp => exp.expenseId >= expenseId && (!nextDueDate || exp.expenseDate <= nextDueDate))
            .toArray();

          // 3. Deactivate selected expenses
          await tx.expenses.bulkPut(expensesToUpdate.map(exp => ({
            ...exp,
            isActive: 2,
            deletionDate: today.toISOString()
          })));
  

          // 4. Find the last remaining ACTIVE expense in this series
          const lastActiveExpense = await tx.expenses
            .where('seriesId')
            .equals(seriesId)
            .filter(exp => exp.isActive === 1) // only active ones
            .sortBy('expenseDate') // sort by date
            .then(arr => arr.pop() || null); // take the last one (most recent active)

          // 5. Update series status
          await tx.recurringSeries.update(seriesId, {
            isActive: 0,
            nextDueDate: '',
            lastLoggedDate: lastActiveExpense ? lastActiveExpense.expenseDate : ''
          });
        }
      );
  

      checkExpense(); // Notify UI
      openSuccessModal(t('expenses.expenses_deleted'));
    } catch (error) {
      openFailureModal(t('expenses.error_deleting_exps'));
      console.error('Error updating expenses:', error);
    }
  }

  // Delete all expenses from this series 
  async function deleteEntireRecurringSeries(seriesId: string) {
    try {
      const count = await db.expenses.where('seriesId').equals(seriesId).count();
      await db.transaction(
        'rw', 
        db.expenses,
        async (tx) => {
          await tx.expenses.where('seriesId').equals(seriesId).delete();
          await tx.recurringSeries.where('seriesId').equals(seriesId).delete();
        }
      );

      checkExpense(); // Notify totalizers like SliderTotalCard to re-fetch the total
      openSuccessModal(t('expenses.expense_deleted')); // Success feedback
    } catch (error) {
      openFailureModal(t('expenses.error_deleting_exp'));
      console.error('Error deleting expense:', error);
    }
  }


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


  // Update expense record in database
  async function updateExpense(expenseId: string) {
    // Check if expense exists
    const existingExpense = await db.expenses.get(expenseId);
    if (!existingExpense) {
      openFailureModal(t('expenses.expense_not_found'));
      return;
    }

    let situation = 'Case 1: regular expense in default currency';
    let amountDefault = amountInCents; // case 1
    let amountTrip = 0;
    let amountAlt = 0;

    // Trip expense
    if(toggledTripId){
      checkTrip();
      situation = "Case 3: trip expense in trip's currency";
      amountTrip = amountInCents; // Case 3

      // convert amount to default currency
      //const rate = getExchangeRate(expenseCurrencyCode);

      if (exchangeRate) {
        amountDefault = Math.round(amountInCents * exchangeRate);
      }

      // Done in a different currency than trip's
      if(expenseCurrencyCode !== tripCurrencyCode) { // Case 4
        situation = 'Case 4: trip expense in alternative currency';
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
          //const rate = getExchangeRate(expenseCurrencyCode);

          if (exchangeRate) {
            amountDefault = Math.round(amountInCents * exchangeRate);
          }
        }
      } 
    } else if (expenseCurrencyCode !== currency.defaultCurrency.code) { // Case 2 - regular expense not in default currency
      situation = 'Case 2: regular expense in alternative currency';
      amountAlt = amountInCents;
      //const rate = getExchangeRate(expenseCurrencyCode);

      if (exchangeRate) {
        amountDefault = Math.round(amountInCents * exchangeRate);
      }
    }

    const base: ExpenseBase = {
      userId,
      expenseNote: note,
      accountId: selectedCardId,
      categoryId,
      subcategoryId,
      expenseAmountDefault: amountDefault,
      expenseAmountTrip: amountTrip,
      expenseAmountAlt: amountAlt,
      expenseCurrencyCode,
      expenseLocale,
      tripId: toggledTripId,
      installmentIndex: expense?.installmentIndex ?? undefined,
    };

    

    try {
      if(existingExpense.isActive === 0 || existingExpense.isActive === 2) {    // 0 = not paid, 2 = deleted
        await db.transaction(
          'rw', 
          db.expenses,
          db.recurringSeries,
          async (tx) => {
        
            await tx.expenses.update(expenseId, {
              isActive: 1,
              expenseNote: note,
              accountId: selectedCardId,
              expenseDate: selectedDate.toISOString(),
              categoryId,
              subcategoryId,
              expenseAmountDefault: amountDefault,
              expenseAmountTrip: amountTrip,
              expenseAmountAlt: amountAlt,    
            });

            existingExpense.seriesId &&
            await tx.recurringSeries.update(existingExpense.seriesId, { 
              estimatedAmount: amountInCents,
              lastLoggedDate: selectedDate.toISOString(),
            });

            if (recurrence.isRecurring === 2 && existingExpense.seriesId) {
              const hasOverdue = await getOldestOverdueExpenseForSeries(existingExpense.seriesId);
              if (hasOverdue === null) {
                await tx.recurringSeries.update(existingExpense.seriesId, { 
                  isActive: 0,
                  nextDueDate: null,
                });
              }
            }
          }
        );

        checkExpense();
        checkRecurrence();
      } else {
        await updateExpenseWithRecurrence(  
          passedExpenseId,
          base,
          selectedDate,
          expense?.seriesId ? expense?.seriesId : '', // only if it's recurring
        );
      }

      if(travelMode) checkTrip();
      
      openSuccessModal(t('expenses.expense_updated'));
    } catch (error) {
      // show error
      openFailureModal(t('expenses.error_updating'));
    }
  }


  // Delete regular expense
  async function deleteExpense(expenseId: string) {
    try {
      // Check if expense exists
      const existingExpense = await db.expenses.get(expenseId);
      if (!existingExpense) {
        openFailureModal(t('expenses.expense_not_found'));
        return;
      }

      await db.transaction(
        'rw', 
        db.expenses,
        async (tx) => {
          // Update the expense record
          await tx.expenses.delete(expenseId);
        }
      );
      
      checkExpense(); // Notify totalizers like SliderTotalCard to re-fetch the total
      checkTrip(); // Notify trip totalizers

      openSuccessModal(t('expenses.expense_deleted')); // Success feedback

    } catch (error) {
      console.error("Error deleting expense:", error);
      openFailureModal(t('expenses.error_deleting_exp'));
    }
  }

  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons> 

          {/* Secondary menu for this expense, show trash can only for active expenses */}
          {expense?.isActive ? (
            <IonButtons slot="end">
              <IonIcon 
                className='medium-icon-btn mr-15 danger'  
                icon={trashOutline} 
                onClick={() => {
                  setTimeout(() => handleDeleteClick(passedExpenseId), 100); // Delay state change
                }}
              />
            </IonButtons>
          ) : (
            null
          )}
          
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal">
        {/* Screen Header */}
        <div className='centered-container mb-10'>
          <h2 className='screen-title'>{expense?.isActive ? t('expenses.edit_exp') : t('expenses.log_exp')}</h2>  
        </div>

        <AccountSlider
          editAccount={selectedCardId}
          key={`account-slider-${resetTrigger}`}
          accounts={sortedAccounts}
          onAccountSelect={handleAccountSelect} // Pass the callback to SliderComponent
        />

        <div className='amount'>
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

          {/* Frecuency disabled in edit expense, only informational */}
          <div
            className='aditional-btn disabled'
            onClick={(isTravelMode || !recurrence.isRecurring) ? undefined : () => setShowFrequencyModal(true)}
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
          <div 
            className='aditional-btn disabled'
          >
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
              <div 
                className={`aditional-btn ${recurrence.isRecurring && 'disabled'}`}
                onClick={recurrence.isRecurring ? undefined : () => setShowNotifyModal(true)}
              >
                <div>
                  {notification ? (
                    <IonIcon icon={notificationsOutline} className='small-icon-btn primary' />
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
                className={`aditional-btn ${recurrence.isRecurring && 'disabled'}`}
                onClick={recurrence.isRecurring ? undefined : () => setShowFrequencyModal(true)}
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
          {(tripId || travelMode) && !recurrence.isRecurring && (
            <div className='aditional-btn full-width disabled'>
              <div>
                <IonIcon icon={airplaneOutline} />
              </div>
              <div className='selected-info'>
                <span className="title">{t('expenses.config_trip_exp')}</span>
                <span className='data'>{toggledTripId ? tripName : t('common.no')}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Add note */}
        <div className="form-item">
          <div className="parent-input">
            <div className="input-container">
              <textarea
                value={note}
                maxLength={120}
                placeholder={t('expenses.config_note')}
                onChange={(e) => handleNoteChange(e.target.value)}
                className={`textarea ${error ? 'invalid' : ''}`}
                rows={3} // Optional: Sets the initial visible height (defaults to 2)
              />
              {error && <p className="error-text">{error}</p>}
            </div>
            {(tripId || travelMode) && !recurrence.isRecurring && (
              <button 
                onClick={handleTripId}
              >
                {toggledTripId 
                  ? <IonIcon icon={airplane} /> 
                  : <IonIcon icon={airplaneOutline} />}
              </button>
            )}
          </div>
        </div>
        


        {/* Save changes button */}
        <IonButton
          className="block mb-60"
          onClick={() => {
            if (isFormValid) {
              updateExpense(passedExpenseId);
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {expense?.isActive ? t('expenses.update_exp') : t('expenses.log_exp')}
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


        {/* Currency selection modal */}
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
              editRecurrence={true}
            />
          </div>
        </IonModal>


        {/* Alert for updating reccurring expense */}
        <IonAlert
          isOpen={showScopeAlert}
          className='custom-alert'
          header={t('common.attention')}
          message={t('expenses.recurrent_alert_msg')}
          buttons={[
            {
              text: t('expenses.recurrent_option_this'),
              handler: () => scopeResolverRef.current?.('this'),
            },
            {
              text: t('expenses.recurrent_option_future'),
              handler: () => scopeResolverRef.current?.('future'),
            },
            {
              text: t('common.all'),
              handler: () => scopeResolverRef.current?.('all'),
            },
            {
              text: t('common.cancel'),
              role: 'cancel',
              handler: () => scopeResolverRef.current?.(undefined),
            },
          ]}
          onDidDismiss={() => setShowScopeAlert(false)}
        />


        {/* Delete modal */}
        <DeleteScopeModal
          isOpen={showDeleteScopeAlert}
          onClose={() => setShowDeleteScopeAlert(false)}
          onSelect={(scope: 'this' | 'future' | 'all' | undefined) => 
            deleteScopeResolverRef.current?.(scope)}
          endCondition={recurrence.endCondition}
        />


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

export default EditExpense;
