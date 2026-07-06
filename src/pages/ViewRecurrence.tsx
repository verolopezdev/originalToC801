import React, { useEffect, useRef, useState, useMemo } from 'react';
import Dexie from 'dexie';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Expense, ParsedExpense } from '../db'; 
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { RecurrenceSettings } from '../hooks/useRecurringExpense';
import dayjs from "dayjs";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useExpense } from '../context/ExpenseContext';
import { useDatePicker } from '../context/DatePickerContext'; 
import { useRecurringExpense } from '../hooks/useRecurringExpense';
import { useCurrency } from '../context/CurrencyContext';
import { useExchangeRates } from '../context/ExchangeRateContext';


// Utility functions
import { getDueInfo, getMostRecentExpenseForSeries, getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions';	
import { hasInactiveExpense } from '../utils/recurrenceStatus';


// App components
import FormattedDate from '../components/FormattedDate';
import FormatAmount from '../components/FormatAmount';
import Modal from '../components/Modal';
import CategoryPreview from '../components/CategoryPreview';
import ExpenseItem from '../components/ExpenseItem';



// Ionic's components
import { 
	IonAlert,
  IonBackButton,
	IonButton,
  IonButtons, 
  IonContent, 
  IonHeader,
	IonIcon, 
	IonInfiniteScroll,
	IonInfiniteScrollContent,
  IonModal,
  IonPage, 
	IonPopover,
  IonTitle,
  IonToolbar 
} from '@ionic/react';

import { 
	alertCircle, 
	warning, 
	checkmarkCircle, 
	createOutline, 
	ellipsisVertical,
	receiptOutline, 
	trashBinOutline, 
	trashOutline, 
	stopCircle,
	stopCircleOutline
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './Recurrences.css';
import '../components/ReccurrenceItem.css';

const defaultRecurrence: RecurrenceSettings = {
	isRecurring: 0,
	unit: 'month',          // Arbitrary; won't be used if isRecurring is false
	interval: 1,
	endCondition: 'never',
	totalOccurrences: null,
	logAutomatically: false,
	lastLoggedDate: '',
	lastLoggedInstallmentIndex: 0,
	endDate: '',
  amountVaries: false
};

interface DueInfo {
  label: string;
  className: string;
}


const ViewRecurrence: React.FC = () => {
	const { t } = useTranslation();
	
  const contentRef = useScrollToTop(); // use the custom hook 
	const router = useIonRouter();
	const { checkExpense, checkRecurrence } = useExpense();
  const { logExpenseForSeries, finalizeRemainingInstallments } = useRecurringExpense();
  const { currency } = useCurrency(); 
  const { convertCurrency, getExchangeRate } = useExchangeRates();
  
  

	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
	

	// Series variables
  const { seriesId } = useParams<{ seriesId: string }>(); // passed series id to fill the form, always a string
  const series = useLiveQuery(() => db.recurringSeries.get(Number(seriesId)), [seriesId]); // get it from Dexie
	const passedRecurrenceId = Number(seriesId);
	const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrence);
  const today = new Date();
	const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(today);
	const [note, setNote] = useState<string>('');
	const [categoryColor, setCategoryColor] = useState<string>('');
	const [categoryIcon, setCategoryIcon] = useState<string>('');
	const [currencyCode, setCurrencyCode] = useState<string>('');
	const [dueInfo, setDueInfo] = useState<DueInfo | null>(null);
	// Pagination variables
	const PAGE_SIZE = 10;
	// use the same loadingRef variable for both loadInitial() and loadMore() to prevent overlapping or concurrent loads.
  // Both functions fetch expenses and update shared state (expenses, offset, etc.), so they must not run simultaneously.
  // A shared guard like loadingRef ensures:
  // Only one load runs at a time. Prevents issues like duplicates, overwrites, race conditions.
	const loadingRef = useRef(false);
	const [offset, setOffset] = useState(0); // how many have been loaded so far.
	const [hasMore, setHasMore] = useState(true); // for infinite scroll (if false, disables it).
	
	// Expenses for this series variables
	const [expenses, setExpenses] = useState<ParsedExpense[]>([]); // list of currently loaded expenses
	const categories = useLiveQuery(() => db.categories.toArray());
	const subcategories = useLiveQuery(() => db.subcategories.toArray());
	const accounts = useLiveQuery(() => db.accounts.toArray());
	const [accountId, setAccountId] = useState<number>(0);
	const getCategory = (categoryId: number) => categories?.find(c => c.categoryId === categoryId);
	const getSubcategory = (subcategoryId: number) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
	const getAccountName = (accountId : number) => accounts?.find(ac => ac.accountId === accountId);
	const [showDeleteExpenseAlert, setShowDeleteExpenseAlert] = useState(false);
	const [showDeleteRecurrenceAlert, setShowDeleteRecurrenceAlert] = useState(false);
	const [recurrenceToDelete, setRecurrenceToDelete] = useState<number | null>(null);
	const [resetTrigger, setResetTrigger] = useState<number>(0);

	// Modal variables
	const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
	const [modalConfig, setModalConfig] = useState({
		icon: '',
		title: '',
		content: '',
		actions: [] as { label: string; action: () => void; style?: string }[],
	});

	const [showDueDate, setShowDueDate] = useState<string | null>('');
	const [showDueAmount, setShowDueAmount] = useState<number>(0);
  const [isEstimated, setIsEstimated] = useState<boolean>(false);
  
  // Alert variables for stopping recurrence
  const [showStopAlert, setShowStopAlert] = useState(false);
  const [showStopInstallmentRecAlert, setShowStopInstallmentRecAlert] = useState(false);
  const [unpaidCount, setUnpaidCount] = useState<number>(0);
  const { openDatePicker } = useDatePicker(); // 👈 access the date picker
  const [stopDate, setStopDate] = useState<Date>(today);




	// Get recurrence data
	useEffect(() => {
		if(series) {
			setNote(series.note);
      
      // Compute isEstimated dynamically
      const newIsEstimated =
      series.estimatedAmount > 0 &&
      series.amountDefault === 0 &&
      series.amountAlt === 0;

      setIsEstimated(newIsEstimated);      

      const amount =
        series.estimatedAmount > 0 && series.amountDefault === 0 && series.amountAlt === 0// If series.estimatedAmount is greater than 0 → use it.
          ? series.estimatedAmount
          : series.amountAlt > 0 // Else if series.amountAlt is greater than 0 → use that.
            ? series.amountAlt
            : series.amountDefault;	// Otherwise → fallback to series.amountDefault	
      setShowDueAmount(amount);
			setCurrencyCode(series.currencyCode);
			setAccountId(series.accountId);

      // Establish showDueDate
      const runShowDueDate = async () => {
        if (series.isActive === 2) {
          const result = await getOldestOverdueExpenseForSeries(series.seriesId);
          if(result?.dueDate) setShowDueDate(result?.dueDate);
        } else {
          setShowDueDate(series.nextDueDate);
        }
      };
      runShowDueDate();

      setRecurrenceStartDate(new Date(series.startDate));
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
        endDate: series.endDate ?? null,
        amountVaries: series.estimatedAmount > 0
      });

      // Get total of unpaid installments to show in alert
      if(series.totalOccurrences !== null) {
        const totalUnpaid = series.totalOccurrences != null
        ? series.totalOccurrences - (series.lastLoggedInstallmentIndex ?? 0)
        : null; // or undefined — meaning "can't calculate"

        if (totalUnpaid !== null) {
          setUnpaidCount(totalUnpaid);
        } 
      }


			const category = getCategory(series.categoryId);	
			const subcategory = getSubcategory(series.subcategoryId);
			if(subcategory) {
				setCategoryColor(subcategory.subcategoryColor);
				setCategoryIcon(subcategory.subcategoryIcon);
			} else if(category) {
				setCategoryColor(category.categoryColor);
				setCategoryIcon(category.categoryIcon);
			}
		}
	}, [series, checkExpense, checkRecurrence]);


  const convertedAmountText = useMemo(() => {
    if (
      currencyCode === currency.defaultCurrency.code
    ) {
      return '';
    }
  
    const rate = getExchangeRate(currencyCode);
  
    if (!rate) return '';
  
    const converted = Math.round(showDueAmount / rate);
  
    return new Intl.NumberFormat(
      currency.defaultCurrency.locale,
      {
        style: 'currency',
        currency: currency.defaultCurrency.code,
      }
    ).format(converted / 100);
  }, [
    showDueAmount,
    currencyCode,
    currency.defaultCurrency.code,
    currency.defaultCurrency.locale,
  ]);
  

  const frequencyMap = {
    month: 'monthly',
    week: 'weekly',
    year: 'yearly'
  };
  
  const frequencyKey = frequencyMap[recurrence.unit as keyof typeof frequencyMap];
  const frequencyLabel = t(`date.${frequencyKey}`);



	// Get overdue items if available, prepare pagination for regular expenses
	useEffect(() => {
		loadingRef.current = false;
		setExpenses([]); // Reset expenses when the dependencies change
		setOffset(0);
		setHasMore(true);

		loadInitial();
	}, [checkExpense]); // checkExpense called in case a new expense is added from Activity. It reloads the list to include it


	// Loads the first page of expenses
	const loadInitial = async () => {
		if (loadingRef.current) return; // meaning loadMore is running
		loadingRef.current = true; // Start loading

		const result = await fetchExpenses(0, passedRecurrenceId); // Get firsts 10 records
		setExpenses(result); // Initially load the expenses
		setOffset(result.length);
		setHasMore(result.length === PAGE_SIZE);

		loadingRef.current = false; // Done loading
	};


	// loadMore function: Used for infinite scroll
	// Skips if fixedLimit is set.
	// Fetches the next page of expenses.
	// Appends them to existing list.
	// Delays rendering to simulate loading UX (setTimeout 1s).
	// Updates pagination states.
	const loadMore = async (e: CustomEvent<void>) => {
		// If fixedLimit is set and we've already reached or exceeded the limit, do nothing
		if (loadingRef.current) {
			setHasMore(false);  // Disable infinite scroll if no more records should be loaded
			(e.target as HTMLIonInfiniteScrollElement).complete();
			return; // Skip further processing
		}

		loadingRef.current = true;
		// This calls async function fetchExpenses(offset) and waits for it to finish.
		// It fetches the next "page" of expenses, starting at the given offset.
		// result will be an array of ParsedExpense.
		const result = await fetchExpenses(offset, passedRecurrenceId);

		// Optional: delay the UI update by 1 second (1000ms)
		await new Promise(resolve => setTimeout(resolve, 1000));

		// this is a defensive way to append items to a list while avoiding duplicates, and it’s especially useful in pagination or infinite scroll scenarios
		setExpenses(prev => { // prev => { ... } ensures you always get the latest state, which is important when you're updating state based on the previous one (e.g. appending items).
			// This extracts the list of expenseIds from the current state (prev) and stores them in a Set:
			// prev.map(e => e.expenseId) gives an array of all existing IDs.
			// new Set(...) turns it into a Set, which allows fast O(1) lookup.
			const ids = new Set(prev.map(e => e.expenseId)); // So now ids contains all the IDs you've already loaded.
			
			// This filters the newly fetched result array and keeps only the items whose ID is not already in ids.
			// So if result = [ {id: 2}, {id: 3} ] and ids = Set(1,2) → only {id: 3} is new.
			const newOnes = result.filter(e => !ids.has(e.expenseId)); // This avoids adding duplicate expenses to your state.

			// Finally, it returns a new array combining:
			// All previous expenses (prev)
			// Only the new, non-duplicate ones (newOnes)
			return [...prev, ...newOnes]; // This becomes the new state of expenses.
		});

		setOffset(prev => prev + result.length);
		// If the number of results fetched in the current page is exactly equal to PAGE_SIZE, it assumes there may be more data, so it sets hasMore to true.
		setHasMore(result.length === PAGE_SIZE);

		(e.target as HTMLIonInfiniteScrollElement).complete(); // Disable infinite scroll as no more records should be loaded
		loadingRef.current = false; // Done loading
	};
	
		
	// skip: This is the offset—how many items to skip (used for pagination)
	// Returns a promise that resolves to an array of Expense objects
	const fetchExpenses = async (
		skip: number,
		seriesId: number
	): Promise<ParsedExpense[]> => {
		const allResults = await db.expenses
		.where('[seriesId+dueDate]')
		.between([seriesId, Dexie.minKey], [seriesId, Dexie.maxKey])  
		.reverse() // latest first
		.toArray();
		
		const paginated = allResults.slice(skip, skip + PAGE_SIZE);
	
		return paginated.map(exp => ({
			...exp,
			expenseDate: new Date(exp.expenseDate),
		}));
	};
		

	// Get due date info
 	useEffect(() => {
    async function fetchDueInfo() {
      const result = getDueInfo(showDueDate);
      setDueInfo(result);
    }

    fetchDueInfo();
  }, [showDueDate, checkRecurrence]);

	const getIcon = (status : string) => {
		switch (status) {
			case 'overdue':
				return alertCircle;
			case 'due-soon':
				return warning;
			case 'finalized':
				return stopCircle;
			default:
				return checkmarkCircle; // or return a default icon like checkmarkOutline
		}
	};


	// Color for active recurrence, gray for finalized recurrence
	const showCategoryColor = recurrence.isRecurring ? categoryColor : 'neutral';
	

	// Open secondary menu
	const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
		setPopoverEvent(event.nativeEvent); // Capture the click event
		setIsPopoverOpen(true);
	};


	// Close secondary menu
	const closePopover = () => {
		setIsPopoverOpen(false);
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


	// Delete recurrence
	const handleDeleteRecurrence = async (recurrenceId: number) => {
		try {
      await db.transaction(
        'rw', 
        db.expenses,
        db.recurringSeries,
        async (tx) => {
          await tx.expenses.where('seriesId').equals(recurrenceId).delete();
          await tx.recurringSeries.where('seriesId').equals(recurrenceId).delete();
        }
      );

			checkExpense(); // Notify totalizers like SliderTotalCard to re-fetch the total
			checkRecurrence();
			openSuccessModal(t('expenses.expense_deleted')); // Success feedback
		} catch (error) {
			openFailureModal(t('expenses.error_deleting_recurrence'));
			console.error('Error updating recurrence:', error);
		}
	};


  // Stop recurrence
  const stopRecurringSeries = async (stopDate?: string) => {
    const effectiveStopDate = stopDate ?? today.toISOString();
    const hasUnpaid = await hasInactiveExpense(passedRecurrenceId);

    let isActive = 0;
    let updateDueDate = null;
    if (
      showDueDate &&
      (
        dayjs(showDueDate).isBefore(dayjs(effectiveStopDate)) ||
        dayjs(showDueDate).isSame(dayjs(effectiveStopDate), "day")
      )
    ) {
          isActive = 1;
      updateDueDate = showDueDate;
    } else if (hasUnpaid) {
      isActive = 2;
      updateDueDate = null;
    }

    await db.transaction(
      'rw', 
      db.recurringSeries,
      async (tx) => {
        await tx.recurringSeries.update(passedRecurrenceId, {
          isActive,
          endDate: effectiveStopDate,
          nextDueDate: updateDueDate,
        });
      }
    );

  
    setShowStopAlert(false);
    if(isActive !== 1) setShowDueDate('');
    checkRecurrence();
  };


  // Handle Stop Date for recurrences that never ends or those that have an end date
  const handleStopDate = async () => {
    setShowStopAlert(false);
    
    try {
      const lastExpense = await getMostRecentExpenseForSeries(passedRecurrenceId);

      const minDateObj = lastExpense?.expenseDate
      ? new Date(lastExpense.expenseDate)
      : recurrenceStartDate;

      minDateObj.setDate(minDateObj.getDate() + 1);

      const pickedDateISO = await openDatePicker(new Date(), {minDate: minDateObj}); // 👈 opens modal & waits
      
      if (!pickedDateISO) {
        return; // User cancelled
      }

      setStopDate(new Date(pickedDateISO));
      await stopRecurringSeries(pickedDateISO); // use the selected date

    } catch (err) {
      console.warn("Date picker was closed without selection");
    }
  };


  // Handle Stop Date for recurrences that never ends or those that have an end date
  const stopRecurrenceWithoutPaying = async () => {
    setShowStopAlert(false);
    
    try {
      await finalizeRemainingInstallments(passedRecurrenceId, {
        payoff: false
      });

    } catch (err) {
      console.warn("Date picker was closed without selection");
    }
  };
  

  // Handle Delete Expense
  const handleDeleteExpense = async () => {
    setShowDeleteExpenseAlert(false);
    
    try {
      await logExpenseForSeries(passedRecurrenceId, undefined, true);
    } catch (err) {
      console.warn("Date picker was closed without selection");
    }
  };
	
	const showAccountName = getAccountName(accountId);
  
	return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>

					{/* Secondary menu */}
					<IonButtons slot="end">
						{/* Button to open the popover */}
						<IonButton  onClick={openPopover}>
							<IonIcon icon={ellipsisVertical} />
						</IonButton>

						{/* Popover positioned at the button's bottom-right */}
						<IonPopover 
							isOpen={isPopoverOpen} 
							event={popoverEvent} // Position it based on the button click
							onDidDismiss={closePopover} 
							side="bottom" // Align popover below the button
							alignment="end" // Align popover to the right of the button
							className='secondary-menu'
						>
							<IonContent class="ion-no-padding">
								<ul className='list'>
									{/* Edit recurrence */}
									{recurrence && recurrence.isRecurring === 1 && (
										<>
										<li 
											className="item" 
											onClick={() => {
												closePopover(); // First, close the popover
												router.push(`/editrecurrence/${seriesId}`, 'forward');
											}}
										>
											<IonIcon 
												icon={createOutline} 
												className="icon"
												style={{ marginRight: "15px" }} // Optional spacing
											/>
											{t('expenses.edit_recurrence')}
										</li>

										<li 
										className="item" 
										onClick={() => {
											closePopover(); // First, close the popover
                      if(recurrence.totalOccurrences !== null) {
                        setShowStopInstallmentRecAlert(true);
                      } else {
                        setShowStopAlert(true);
                      }
										}}
										>
											<IonIcon 
												icon={stopCircleOutline} 
												className="icon"
												style={{ marginRight: "15px" }} // Optional spacing
											/>
											{t('expenses.end_recurrence')}
										</li>
										</>
									)}

									{/* Delete recurrence */}
									<li 
										className="item" 
										onClick={() => {
											closePopover();
											setTimeout(() => {
												setRecurrenceToDelete(passedRecurrenceId);
												setShowDeleteRecurrenceAlert(true);
											}, 100);
										}}
									>
										<IonIcon 
											icon={trashOutline} 
											className="icon"
											style={{ marginRight: "15px" }} // Optional spacing
										/>
										{t('expenses.delete_recurrence')}
									</li>
								</ul>
							</IonContent>
						</IonPopover>
					</IonButtons>
				
				</IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal"  ref={contentRef}>
				{/* Screen Header */}
				<section className='centered-container'>
					{/* Recurrence name */}
          <h2 className='screen-title'>{note}</h2>

					{/* Category icon preview */}
          <div className="mt-20">
            <CategoryPreview
              categoryColor= {showCategoryColor}
              categoryIcon={categoryIcon}
            />
          </div>

					{/* Amount */}
          <div className='recurrence-amount'>
            <div className="view-recurrence-amount">
              {isEstimated && <span className='note'>(est)</span>}
              <h1 className={isEstimated ? 'estimated-amount' : ''}>
              {typeof showDueAmount === 'number' && showDueAmount > 0 && currencyCode ? (
                <FormatAmount amount={showDueAmount / 100} currencyCode={currencyCode} />
              ) : null}
              </h1>
            </div>

            {currencyCode !== currency.defaultCurrency.code && (
              <div className="converted-recurrence-amount">
                ≈ <span  className='converted-amount-code'>{currency.defaultCurrency.code}</span>
                {convertedAmountText}
              </div>
            )}
          </div>
					
					{/* Next overdue or due date and status */}
						<div className='recurrence-due-date'>
							{showDueDate && (<FormattedDate date={new Date(showDueDate)} format="long" />)}
              {dueInfo && (
							<div className={`status-label-no-wrap ${dueInfo.className}`}>
                <IonIcon icon={getIcon(dueInfo.className)} style={{ color: 'inherit' }} />
                {recurrence.isRecurring === 2 ? `Finalized with ${dueInfo.label}` : dueInfo.label}
              </div>
              )}
							<span className='log-type'>{recurrence.logAutomatically ? t('expenses.auto_logging') : t('expenses.man_logging')}</span>
						</div>


					{/* Frequency data "Every month" and Payment method */}
					<div className="info-container">
						<p>
              {frequencyLabel}	
              {recurrence.totalOccurrences && ` ${t('expenses.payments_count_short', { count: recurrence.totalOccurrences })}`}
							{series && series.endDate && (
                <>
                  {t('date.until_mid')} 
                  <FormattedDate date={new Date(series.endDate)} format="compact" />
                </>
              )}
						</p>
						{showAccountName && (
							<p>{showAccountName.accountName}</p>
						)}
					</div>

          {/* Log and Delete buttons */}
          {recurrence.isRecurring === 1 ? (
            <div className='button-container mt-5'>
              <IonButton 
                className='medium success'
                onClick={() => {
                  router.push(`/logrecurrenceexpense/${seriesId}`, 'forward');
                }}
              >
                {t('expenses.log_exp')}
              </IonButton>
              <IonButton 
                className='medium danger'
                onClick={() => {
                  setShowDeleteExpenseAlert(true);
                }}
              >
                {t('expenses.delete_exp')}
              </IonButton>
            </div>
          ) : (
            null
          )}
      	</section>

				{/* Payment history */}
				<section>
					<div className='section-header mt-20'>
            <div>
              <h6 className="section-title">{t('expenses.payment_history')}</h6>
            </div>
          </div>

					<div>
						{/* Show registered expenses */}
						{!loadingRef.current && (
							expenses.length > 0 ? (
								
							expenses.map((exp) => {
								const dateFromExp = exp.dueDate ? new Date(exp.dueDate) : null;
								const originalDueDate = dateFromExp && !isNaN(dateFromExp.getTime()) ? dateFromExp : new Date();

								const amount = 
									exp.expenseAmountAlt > 0 ? exp.expenseAmountAlt :
									exp.expenseAmountDefault;
                 

									return (
										<ExpenseItem	      
											key={exp.expenseId}
											expenseId={exp.expenseId}
											expenseAmount={amount}
                      expenseAmountDefault={
                        exp.expenseAmountAlt > 0
                          ? exp.expenseAmountDefault
                          : undefined
                      }
											dueDate={originalDueDate}
											deletionDate={exp.deletionDate ? new Date(exp.deletionDate) : null}
											expenseDate={exp.expenseDate}
											expenseCurrencyCode={exp.expenseCurrencyCode}
											installmentIndex={exp.installmentIndex}
											totalInstallments={exp.totalInstallments}
											paymentStatus={exp.isActive}
                      seriesId={passedRecurrenceId}
										/>
									);
							})
						) : (
							<div>{t('expenses.no_exp_found')}</div>
						))}

						<IonInfiniteScroll
							threshold="100px" 
							onIonInfinite={loadMore}
							disabled={!hasMore}
						>
							<IonInfiniteScrollContent loadingText={t('common.loading_more')}></IonInfiniteScrollContent>
						</IonInfiniteScroll>
					</div>

					</section>

        {/* Alert before deleting recurrence and associated expenses */}
        <IonAlert
          isOpen={showDeleteRecurrenceAlert}
          className='custom-alert'
          onDidDismiss={() => setShowDeleteRecurrenceAlert(false)}
          header={t('expenses.delete_recurrence_q')}
          message={t('expenses.delete_recurrence_a')}
          buttons={[
            {
              text: t('common.cancel'),
              role: 'cancel',
              handler: () => {
                setShowDeleteRecurrenceAlert(false);
                setRecurrenceToDelete(null);  
              }
            },
            {
              text: t('common.delete'),
              role: 'destructive',
              cssClass: 'alert-button-destructive',
              handler: () => {
                if (recurrenceToDelete !== null) {
                  handleDeleteRecurrence(recurrenceToDelete);
                }
                setShowDeleteRecurrenceAlert(false);
                setRecurrenceToDelete(null);
              }
            }
          ]}
        />


        {/* Alert before stopping a recurrence */}
        <IonAlert
          isOpen={showStopAlert}
          className='custom-alert'
          onDidDismiss={() => setShowStopAlert(false)}
          header={t('expenses.stop_recurrence')}
          message={t('expenses.stop_recurrence_msg')}
          buttons={[
            { 
              text: t('common.cancel'), 
              role: "cancel", 
              handler: () => { setShowStopAlert(false) } 
            },
            {
              text: t('date.stop_today'),
              handler: async () => await stopRecurringSeries(),
            },
            {
              text: t('date.pick_date'),
              handler: handleStopDate,
            },
          ]}
        />


        {/* Alert before stopping a recurrence with INSTALLMENTS */}
        <IonAlert
          isOpen={showStopInstallmentRecAlert}
          className='custom-alert'
          onDidDismiss={() => setShowStopInstallmentRecAlert(false)}
          header={t('expenses.stop_recurrence_q')}
          message={t("expenses.unpaid_installments_warning", { count: unpaidCount })}          
          buttons={[
            {
              text: t('expenses.pay_all_stop'),
              handler: () => {
                setShowStopInstallmentRecAlert(false);
                router.push(`/logrecurrenceexpense/${seriesId}?mode=remaining`, 'forward');
              },
            },
            {
              text: t('expenses.stop_without_paying'),
              role: "destructive",
              cssClass: 'alert-button-destructive',
              handler: () => {
                setShowStopInstallmentRecAlert(false);
                stopRecurrenceWithoutPaying();
              },
            },
            {
              text: t('common.cancel'),
              role: "cancel",
            },
          ]}
        />



        {/* Alert before deleting next expense from recurrence (red button DELETE EXPENSE) */}
        <IonAlert
          className='custom-alert'
          isOpen={showDeleteExpenseAlert}
          onDidDismiss={() => setShowDeleteExpenseAlert(false)}
          header={t('expenses.delete_exp')}
          message={t('expenses.delete_exp_msg')}
          buttons={[
            { 
              text: t('common.cancel'), 
              role: "cancel", 
              handler: () => { setShowDeleteExpenseAlert(false) } 
            },
            {
              text: t('common.delete'),
              role: "destructive",
              cssClass: 'alert-button-destructive',
              handler: handleDeleteExpense,
            },
          ]}
        />
        

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

export default ViewRecurrence;