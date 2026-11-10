import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from "dayjs";

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext';

// App components
import AccountTotalSlider from '../components/AccountTotalSlider';
import Footer from '../components/Footer';
import IntervalToolbar from '../components/IntervalToolbar';
import TransactionList from '../components/TransactionList';
import TransactionListByCategory from '../components/TransactionListByCategory';

// Utility functions
import { getDateRangeForInterval } from '../utils/getDateRangeForInterval';
import { fetchAndSortAccounts } from '../utils/accountUtils';

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
  { title: 'dashboard', url: '/app/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/app/accounts', icon: layersOutline },
  { title: 'Add', url: '/app/newexpense/0', icon: add },   
  { title: 'activity', url: '/app/activity', icon: cash }
];


const Activity: React.FC = () => {
  const contentRef = useScrollToTop();
  const { t, i18n } = useTranslation();
  const { user } = useUser();

  const { interval } = user; 
  const weekStartDay = user.weekStartDay;

  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>(interval);
  const [currentDate, setCurrentDate] = useState<Dayjs>(() =>
    dayjs().locale(i18n.language)
  );
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [viewMode, setViewMode] = useState<"date" | "category">("date");

  useEffect(() => {
    setCurrentDate(prev => prev.locale(i18n.language));
  }, [i18n.language]);

  // Calculate start and end date for the current period
  const { start, end } = useMemo(() => {
    const { start: dateStart, end: dateEnd } =
      getDateRangeForInterval(
        selectedInterval,
        currentDate,
        true,
        weekStartDay
      );
    
    return {
      start: dayjs(dateStart) as Dayjs, 
      end: dayjs(dateEnd) as Dayjs,
    };
  }, [selectedInterval, currentDate, weekStartDay]);

  // Fetch sorted available/unavailable accounts using useLiveQuery
  const sortedAccountsData = useLiveQuery(async () => {
    if (!user) return { availableAccounts: [], notAvailableAccounts: [] };
    return await fetchAndSortAccounts(user);
  }, [user]);


  // --- NEW: Query for ALL unique account IDs used in expenses for this period ---
  const usedAccountIdsInPeriod = useLiveQuery(async () => {
    const expensesInPeriod = await db.expenses
      .where("expenseDate")
      .between(start.toISOString(), end.toISOString(), true, true) // Inclusive range
      .and(exp => exp.isActive === 1) // Only count active expenses
      .toArray();

    const accountIds = new Set<string>();
    expensesInPeriod.forEach(exp => {
      if (exp.accountId) {
        accountIds.add(exp.accountId);
      }
    });

    return Array.from(accountIds);
  }, [start.valueOf(), end.valueOf()]); // Re-run when the date range changes


  // --- UPDATED: Filter accounts to show inactive ones ONLY if used in the period ---
  const accountsToShow = useMemo(() => {
    if (!sortedAccountsData) return [];

    // Helper function to check if an account should be kept:
    // Keep it if it's active OR (it's inactive but has expenses in this period)
    const isValidAccount = (account: any) => {
      const isActive = account.activeAccount ?? true; // fallback if property is named differently
      if (isActive) return true;
      
      const accountId = account.accountId;
      return usedAccountIdsInPeriod?.includes(accountId);
    };

    let filteredAvailable = sortedAccountsData.availableAccounts.filter(isValidAccount);
    let filteredNotAvailable = sortedAccountsData.notAvailableAccounts.filter(isValidAccount);

    // Extract inactive accounts to push them to the very end
    const inactiveAvailable = filteredAvailable.filter(account => !account.activeAccount);
    const inactiveNotAvailable = filteredNotAvailable.filter(account => !account.activeAccount);

    // Keep only active ones in their primary slots
    filteredAvailable = filteredAvailable.filter(account => account.activeAccount);
    filteredNotAvailable = filteredNotAvailable.filter(account => account.activeAccount);

    // Combine inactive accounts at the tail end
    filteredNotAvailable = [...filteredNotAvailable, ...inactiveNotAvailable, ...inactiveAvailable];
    
    return [
      ...filteredAvailable,
      ...filteredNotAvailable
    ];
  }, [sortedAccountsData, usedAccountIdsInPeriod]);



  // Load general interval state (weekly, monthly, yearly)
  useEffect(() => {
    if (interval) {
      setSelectedInterval(interval);  
    }
  }, [interval]);

  // Handle selected card id change from SliderComponent
  const handleAccountSelect = (accountId: string) => {
    setSelectedCardId(accountId);
  };

  // Translate footer menu item titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
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
          <div className='centered-container mb-20'>
            <h2 className='screen-title'>{t('common.activity')}</h2>
          </div>

          {selectedInterval && (
            <>
              {/* Card slider */}
              <AccountTotalSlider        
                accounts={accountsToShow} 
                onAccountSelect={handleAccountSelect}
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
                setCurrentDate={setCurrentDate} 
                weekStartDay={weekStartDay} 
              />

              {/* View mode */}
              <div className='section-header mt-10'>
                <div className='flex-space'>
                  <h6 className="section-title">
                    {viewMode === "date" ? t('activity.by_date') : t('activity.by_category')}
                  </h6>

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