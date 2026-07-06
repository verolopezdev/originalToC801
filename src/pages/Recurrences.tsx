import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { db, Expense, RecurringSeries } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';


// Custom hooks
import { useExpense } from '../context/ExpenseContext';


// App components
import Footer from '../components/Footer';
import ReccurrenceItem from '../components/ReccurrenceItem';


// Utility functions
import { getActiveRecurringSeries, getInactiveRecurringSeries } from '../utils/recurrenceFunctions';  
import { getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions';	  


// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader,
  IonIcon,
  IonPage,
  IonPopover, 
  IonTitle,
  IonToolbar 
} from '@ionic/react';


// Icons
import { 
  add,
  barChartOutline, 
  calendarOutline, 
  ellipsisVertical,
  eyeOffOutline,
  eyeOutline,
  home,
  homeOutline,
  layersOutline,
} from 'ionicons/icons';
  

// Styles
import '../Main.css';
import './Recurrences.css';


// Footer items
const appPages = [
  {
    title: 'home',
    url: '/dashboard',
    iosIcon: homeOutline,
    mdIcon: homeOutline
  },
  {
    title: 'accounts',
    url: '/accounts',
    iosIcon: layersOutline,
    mdIcon: layersOutline
  },
  {
    title: 'Add',
    url: '/newexpense/0',
    iosIcon: add,
    mdIcon: add
  },
  {
    title: 'activity',
    url: '/activity',
    iosIcon: barChartOutline,
    mdIcon: barChartOutline
  }
];


const Reccurrences: React.FC = () => {
  const contentRef = useRef<HTMLIonContentElement>(null);
	const { t } = useTranslation();
	const { checkExpense } = useExpense();
	const categories = useLiveQuery(() => db.categories.toArray());
	const subcategories = useLiveQuery(() => db.subcategories.toArray());
	const accounts = useLiveQuery(() => db.accounts.toArray());
	const getCategory = (categoryId: number) => categories?.find(c => c.categoryId === categoryId);
	const getSubcategory = (subcategoryId: number) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
	const getAccountName = (accountId : number) => accounts?.find(ac => ac.accountId === accountId);
  const [activeRecurrences, setActiveRecurrences] = useState<RecurringSeries[]>([]);
  const [inactiveRecurrences, setInactiveRecurrences] = useState<RecurringSeries[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  const [showInactiveRecurrences, setShowInactiveRecurrences] = useState<boolean>(false);
  const firstInactiveRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overdueExpenses, setOverdueExpenses] = useState<Record<number, Expense | null>>({});

  
  //This useEffect hook is responsible for fetching all active recurring expenses, determining if any of them are overdue, 
  // and then sorting them to display the most urgent ones first.
  useEffect(() => {
    let isMounted = true;
  
    const loadData = async () => {
      setIsLoading(true);
  
      // ✅ Step 1: Get active recurring series
      const allActiveRecurrencies = await getActiveRecurringSeries();
      if (!isMounted) return;

  
      // ✅ Step 2: Calculate oldest overdue for each series
      // await Promise.all(...): This is the key to speed. Instead of waiting for the database check for Series 1 to finish before starting Series 2, 
      // Promise.all allows all these database lookups (one for each series) to run at the same time (concurrently). The await then pauses execution 
      // until all of those individual database checks are complete.
      const results = await Promise.all(
        // allActiveRecurrencies.map(...): This iterates over the list of active recurrence series you fetched in Step 1. 
        // For every series (rec), it prepares a task: calling the function getOldestOverdueExpenseForSeries(rec.seriesId).
        allActiveRecurrencies.map(rec =>
          getOldestOverdueExpenseForSeries(rec.seriesId)
        )
      );
      if (!isMounted) return;
  
      // ✅ Step 3: Update state in one go
      // This initializes an empty object that will store our results. The key will be the seriesId (a number), and the value will be the overdue Expense object or null.
      const map: Record<number, Expense | null> = {};
      allActiveRecurrencies.forEach((rec, idx) => {
        map[rec.seriesId] = results[idx];
      });
  
      // 🚀 Step 4: Sort the recurrences based on the due date
    const sortedRecurrences = [...allActiveRecurrencies].sort((a, b) => {
      // Get the effective due date for series A
      const overdueA = map[a.seriesId];
      // The effective due date is the overdue date, or the next scheduled date.
      // We use '1970-01-01' as a safe default/fallback if both are somehow missing.
      // This ensures dateA is always a string that new Date() can process.
      const dateA = (overdueA ? overdueA.dueDate : a.nextDueDate) ?? '1970-01-01';

      // Get the effective due date for series B
      const overdueB = map[b.seriesId];
      const dateB = (overdueB ? overdueB.dueDate : b.nextDueDate) ?? '1970-01-01';

      // Convert to Date objects and then to numbers (milliseconds since epoch) for comparison.
      // This is crucial for correct chronological sorting.
      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();

      // For descending order of overdue date (most overdue/smallest date first):
      // If timeA is smaller (older), a should come before b, so return a negative number (timeA - timeB)
      // This achieves the desired: OLDER/MORE OVERDUE DATE AT THE TOP.
      return timeA - timeB;
    });

    setActiveRecurrences(sortedRecurrences); // Use the sorted list!
    setOverdueExpenses(map);
    setIsLoading(false);
    };
  
    loadData();
  
    // Cleanup (isMounted Flag): The isMounted flag and the return function (return () => { isMounted = false; };) 
    // are a crucial pattern for preventing memory leaks. If the component is unmounted (the user navigates away) while 
    // the loadData function is still awaiting a database result, checking if (!isMounted) return; ensures that the component 
    // doesn't try to call setState on an unmounted component, which would cause an error.
    return () => {
      isMounted = false;
    };
  }, [checkExpense]);   
  

  // Load inactive recurrences
  useEffect(() => {
    if (showInactiveRecurrences) {
      // Only fetch when the toggle is turned on
      (async () => {
        const result = await getInactiveRecurringSeries();
        setInactiveRecurrences(result);
      })();
    }
  }, [showInactiveRecurrences, checkExpense]);

  
  // scroll to first inactive element of the list
  useEffect(() => {
    if (showInactiveRecurrences && inactiveRecurrences.length > 0 && contentRef.current && firstInactiveRef.current) {
      contentRef.current.getScrollElement().then((scrollEl) => {
        // Use requestAnimationFrame to ensure DOM is painted
        requestAnimationFrame(() => {
          const targetOffset = firstInactiveRef.current!.offsetTop;
          scrollEl.scrollTo({
            top: targetOffset - 16,
            behavior: "smooth",
          });
        });
      });
    }
  }, [showInactiveRecurrences, inactiveRecurrences]);


  // scroll back to the top when hiding inactive elements
  useEffect(() => {
    if (!showInactiveRecurrences && contentRef.current) {
      contentRef.current.scrollToTop(300); // scroll with 300ms animation
    }
  }, [showInactiveRecurrences]);


  // Show menu icon only if there are inactive recurrences
  const hasInactiveRecurrences = useLiveQuery(
    async () => {
      const firstInactive = await db.recurringSeries
        .where('isActive')
        .equals(0)
        .first();
      return !!firstInactive;
    },
    [],
    false
  );

  // Open secondary menu
  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };

  // Close secondary menu
  const closePopover = () => {
    setIsPopoverOpen(false);
  };
  
	// Translate footer menu item titles
	const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
	}));
    

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>

          {/* Secondary menu to show or hide inactive recurrences */}
          {hasInactiveRecurrences && (
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
                    {showInactiveRecurrences ? (
                      <>
                        {/* Disable category */}
                        <li 
                          className="item" 
                          onClick={() => {
                            closePopover(); // First, close the popover
                            setTimeout(() => setShowInactiveRecurrences(false), 100); // Then update state after a brief delay
                          }}
                        >
                          <IonIcon icon={eyeOffOutline} /> {t('common.hide_inactive')}
                        </li>
                      </>
                    ) : (
                      // Enable category
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover(); // Close the popover first
                          setTimeout(() => setShowInactiveRecurrences(true), 100); // Delay state change
                        }}
                      >
                        <IonIcon icon={eyeOutline} /> {t('common.show_inactive')}
                      </li>
                    )}
                  </ul>
                </IonContent>
              </IonPopover>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal"  ref={contentRef}>
        {/* Screen Header */}
        <div className='centered-container'>
          <h2 className='screen-title'>{t('expenses.recurrent_exp')}</h2>
        </div>

        {!isLoading && activeRecurrences.length === 0 && inactiveRecurrences.length === 0 && (
          <section className='centered-container'>
            <IonIcon icon={calendarOutline} className="no-favourites-screen" />
            <h4 className="screen-title">{t('expenses.no_recurrences')}</h4>
            <p className="screen-prompt">
              {t('expenses.no_recurrences_msg')}
            </p>
          </section>
        )}

				<div className='mt-20'>
          {/* Show active recurrences */}
					{activeRecurrences.map((rec) => {
						const category = getCategory(rec.categoryId);
            const subcategory = getSubcategory(rec.subcategoryId);
            const accountName = getAccountName(rec.accountId)?.accountName || '';
            const overdueExpense = overdueExpenses[rec.seriesId];
            
            // Compute isEstimated dynamically
            const newIsEstimated =
              rec.estimatedAmount > 0 &&
              rec.amountDefault === 0 &&
              rec.amountAlt === 0;

            const expenseAmount =
              rec.estimatedAmount > 0 && (rec.amountDefault === 0 && rec.amountAlt === 0) // Checks if rec.estimatedAmount is greater than 0 → if yes, that’s used directly.
                ? rec.estimatedAmount
                : [ // Otherwise, it runs your existing fallback logic
                    overdueExpense?.expenseAmountAlt,
                    overdueExpense?.expenseAmountDefault,
                    rec.amountAlt,
                    rec.amountDefault,
                  ].find(v => v !== undefined && v !== 0) ?? 0;

            const dueDate = overdueExpense?.dueDate ?? rec.nextDueDate;

            return (
              <ReccurrenceItem      
                key={rec.seriesId}
                seriesId={rec.seriesId}
                categoryIcon={subcategory?.subcategoryIcon || category?.categoryIcon || ""}
                categoryColor={subcategory?.subcategoryColor || category?.categoryColor || ""}
                categoryName={subcategory?.subcategoryName || category?.categoryName || t('common.unkonwn')}
                accountName={accountName}
                expenseNote={rec.note}
                expenseAmount={expenseAmount}
                startDate={new Date(rec.startDate)}
                endDate={rec.endDate}
                expenseCurrencyCode={rec.currencyCode}
                interval={rec.interval}
                unit={rec.unit}
                totalInstallments={rec.totalOccurrences ?? undefined}
                autoLogged={rec.logAutomatically}
                nextDueDate={dueDate} 
                isActive={rec.isActive}
                lastLoggedDate={rec.lastLoggedDate} 
                amountVaries={newIsEstimated}
              />
						);
					})}

          {/* Show inactive recurrences if available and selected */}
          {showInactiveRecurrences && inactiveRecurrences.map((rec, idx) => {
						const category = getCategory(rec.categoryId);
						const subcategory = getSubcategory(rec.subcategoryId);
						const accountName = getAccountName(rec.accountId)?.accountName || '';
						const amount =
							rec.amountAlt > 0 ? rec.amountAlt :
							rec.amountDefault;

						return (
              <div
              key={rec.seriesId}
              ref={idx === 0 ? firstInactiveRef : null}
            >

							<ReccurrenceItem
								key={rec.seriesId}
								seriesId={rec.seriesId}
								categoryIcon={subcategory?.subcategoryIcon || category?.categoryIcon || ""}
								categoryColor={subcategory?.subcategoryColor || category?.categoryColor || ""}
								categoryName={subcategory?.subcategoryName || category?.categoryName || t('common.unkonwn')}
								accountName={accountName}
								expenseNote={rec.note}
								expenseAmount={amount}
								startDate={new Date(rec.startDate)}
                endDate={rec.endDate}
								expenseCurrencyCode={rec.currencyCode}
								interval={rec.interval}
								unit={rec.unit}
								totalInstallments={rec.totalOccurrences ?? undefined}
								autoLogged={rec.logAutomatically}
                nextDueDate={rec.nextDueDate}
                isActive={rec.isActive}
                lastLoggedDate={rec.lastLoggedDate}
                amountVaries={rec.estimatedAmount > 0}
							/>
              </div>
						);
					})}

				</div>
      </IonContent>
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default Reccurrences;