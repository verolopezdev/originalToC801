import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from "dayjs";


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook


// App components
import AccountTotalSlider from '../components/AccountTotalSlider';
import Footer from '../components/Footer';
import IntervalToolbar from '../components/IntervalToolbar';
import TransactionList from '../components/TransactionList';
import TransactionListByCategory from '../components/TransactionListByCategory';

// Utility functions
import { getDateRangeForInterval } from '../utils/getDateRangeForInterval';



// Ionic components
import { 
  IonContent, 
  IonHeader,
  IonIcon, 
  IonPage,
  IonToolbar 
} from '@ionic/react';


// Icons
import { 
  add,
  layersOutline, 
  listOutline,
  gridOutline,
  homeOutline,
  cash,
} from 'ionicons/icons';


// Styles
import '../Main.css';


// Define a strict type for interval options
type IntervalOption = "weekly" | "monthly" | "yearly";


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/accounts', icon: layersOutline },
  { title: 'Add', url: '/newexpense/0', icon: add },
  { title: 'activity', url: '/activity', icon: cash }
];


const Activity: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t, i18n } = useTranslation();
  const { user } = useUser();

  const { interval } = user; // Extract the subscribed property
  const weekStartDay = user.weekStartDay;

  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>(interval); // State managed at the top level
  const [currentDate, setCurrentDate] = useState<Dayjs>(() =>
      dayjs().locale(i18n.language)
    ); // Store selected date
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const allAccounts = useLiveQuery(() => db.accounts.toArray());
  const [selectedCardId, setSelectedCardId] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"date" | "category">("date");


  useEffect(() => {
    setCurrentDate(prev => prev.locale(i18n.language));
  }, [i18n.language]);


  // Calculate start and end date for the current period
  const { start, end } = useMemo(() => {
    // 1. Call the utility, which returns standard JavaScript Date objects
    const { start: dateStart, end: dateEnd } =
      getDateRangeForInterval(
        selectedInterval,
        currentDate,
        true,
        weekStartDay
      );
    
    // 2. Convert the standard Date objects into Dayjs objects
    return {
      // Use dayjs() constructor to convert the Date object
      start: dayjs(dateStart) as Dayjs, 
      end: dayjs(dateEnd) as Dayjs,
    };
  }, [selectedInterval, currentDate, weekStartDay]);


  // --- NEW: Query for ALL unique account IDs used in expenses for this period ---
  const usedAccountIdsInPeriod = useLiveQuery(async () => {
    const expensesInPeriod = await db.expenses
      .where("expenseDate")
      .between(start.toISOString(), end.toISOString(), true, true) // Inclusive range
      .and(exp => exp.isActive === 1) // Only count active expenses
      .toArray();

    // Use a Set to collect unique account IDs efficiently
    const accountIds = new Set<number>();
    expensesInPeriod.forEach(exp => {
      accountIds.add(exp.accountId);
    });

    return Array.from(accountIds);
  }, [start.valueOf(), end.valueOf()]); // Re-run when the date range changes


  // --- UPDATED: Combine allAccounts with usedAccountIdsInPeriod ---
  const accountsToShow = useMemo(() => {
    if (!allAccounts) return [];

    // Filter the full list of accounts to include:
    // 1. All Active accounts
    // 2. Any Disabled account that has an expense in the current period (i.e., its ID is in usedAccountIdsInPeriod)
    const activeAndUsedAccounts = allAccounts.filter(account => {
      const isUsed = usedAccountIdsInPeriod?.includes(account.accountId);
      // Include if: (Active) OR (Disabled AND used in this period)
      return account.activeAccount || isUsed;
    });
    
    // Now apply the sorting logic on this filtered list
    return activeAndUsedAccounts.sort((a, b) => {
      // Your existing sorting logic (Active > Default > sortOrder) is correct here
      // ... (existing sorting logic goes here)
      // --- 1. Primary Sort: Active Status ---
      if (a.activeAccount && !b.activeAccount) return -1;
      if (!a.activeAccount && b.activeAccount) return 1;
  
      // --- At this point, both are ACTIVE OR both are DISABLED (but used in period) ---
      
      // If both are DISABLED, sort by sortOrder (or just by accountId as a fallback)
      if (!a.activeAccount && !b.activeAccount) {
        return a.sortOrder - b.sortOrder;
      }
  
  
      // 3. Tertiary Sort: sortOrder
      return a.sortOrder - b.sortOrder;
    });
  }, [allAccounts, usedAccountIdsInPeriod, t]);

  // Load general interval state (weekly, monthly, yearly)
  useEffect(() => {
    if (interval) {
      setSelectedInterval(interval);  
    }
  }, [interval]);
  

  const sortedAccounts = useMemo(() => {
    if (!accounts) return [];
  
    // Sort all accounts based on three criteria:
    // 1. Active status (Active accounts first, Disabled accounts last)
    // 2. Default account status (Within active accounts, Default comes first)
    // 3. sortOrder (For accounts that share the same Active/Default status)
    return accounts.sort((a, b) => {
      // --- 1. Primary Sort: Active Status (a.activeAccount: true/false) ---
      // If 'a' is active and 'b' is disabled, 'a' comes first (-1)
      if (a.activeAccount && !b.activeAccount) return -1;
      // If 'a' is disabled and 'b' is active, 'b' comes first (1)
      if (!a.activeAccount && b.activeAccount) return 1;
  
      // --- At this point, both are ACTIVE OR both are DISABLED ---
      
      // If both are DISABLED, their relative order doesn't matter much 
      // for display at the end, but we can still sort them by sortOrder 
      // or keep them as is. Let's sort them by sortOrder for consistency.
      if (!a.activeAccount && !b.activeAccount) {
        return a.sortOrder - b.sortOrder;
      }
    
      // 3. Tertiary Sort: sortOrder
      return a.sortOrder - b.sortOrder;
    });
  }, [accounts]);   

  // Handle selected card id change from SliderComponent
  const handleAccountSelect = (accountId: number) => {
    setSelectedCardId(accountId); // Update the state with the selected account id
  };


  // Translate titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
    url: item.title === 'Add' ? `/newexpense/${selectedCardId}` : item.url,
  }));


  // Show expenses by date or category
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'date' ? 'category' : 'date'));
  };

  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
        </IonToolbar>
      </IonHeader>


      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        {/* Screen Header */}
        <div className='centered-container mb-20'>
          <h2 className='screen-title'>{t('common.activity')}</h2>
        </div>

        {selectedInterval && (
          <>
            {/* Card slider */}
            <AccountTotalSlider        
              accounts={accountsToShow}
              onAccountSelect={handleAccountSelect} // Pass the callback to SliderComponent
              currentDate={currentDate} 
              selectedInterval={selectedInterval} 
              setSelectedInterval={setSelectedInterval} 
              start={start}
              end={end}
            />  

            {/* Interval */}
            <IntervalToolbar    
              selectedInterval={selectedInterval}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate} // Update date from IntervalToolbar 
              weekStartDay={weekStartDay} 
            />

            {/* View mode */}
            <div className='section-header mt-10'>
              <div className='flex-space'>
                {/* Title */}
                <h6 className="section-title">
                  {viewMode === "date" ? t('activity.by_date') : t('activity.by_category')}
                </h6>

                {/* View mode icons */}
                <div className='icon-menu-bar mr-5'>
                  <IonIcon
                    icon={viewMode === 'category' ? listOutline : gridOutline}
                    onClick={toggleViewMode}
                    className='medium-icon-btn primary'
                  />
                </div>
              </div>
            </div>

            <div className='mb-60'>
            {viewMode === "date" ? (
              <TransactionList         
                selectedInterval={selectedInterval}   
                start={start}
                end={end}
                accountId={selectedCardId} 
              />
            ) : (
              <TransactionListByCategory  
                selectedInterval={selectedInterval}
                selectedDate={currentDate}
                start={start}
                end={end}
                accountId={selectedCardId} 
                upToToday={true}
              />
            )}
            </div>
          </>
        )}
        

      </IonContent>
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default Activity;
