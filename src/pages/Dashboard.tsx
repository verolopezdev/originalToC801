import React, { useState, useEffect, useMemo } from 'react';
import { App } from "@capacitor/app";
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next'; 
import dayjs, { Dayjs } from "dayjs";


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useTrip } from '../context/TripContext';
import { useCurrency } from '../context/CurrencyContext';
import { useExpense } from '../context/ExpenseContext';


// Utility functions
//import { checkAutoBackup } from '../utils/backup';
import { getDateRangeForInterval } from '../utils/getDateRangeForInterval';


// App components
import DashboardMainCard from '../components/DashboardMainCard';
import DashboardMainTrip from '../components/DashboardMainTrip';
import TransactionList from '../components/TransactionList';
import Footer from '../components/Footer';


// Ionic components
import {
  IonButton, 
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';


// Icons
import { 
  add,
  calendarOutline, 
  cashOutline, 
  home,
  layersOutline,
  syncOutline,
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './Dashboard.css';


// Define a strict type for interval options
type IntervalOption = "weekly" | "monthly" | "yearly";


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: home },
  { title: 'accounts', url: '/app/accounts', icon: layersOutline },
  { title: 'Add', url: '/app/newexpense/0', icon: add },
  { title: 'activity', url: '/app/activity', icon: cashOutline }
];


const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const contentRef = useScrollToTop(); // use the custom hook 
  const { travelMode, checkTrip, selectedTripId } = useTrip();
  const { overallSeverity } = useExpense();

  const trip = useLiveQuery(async () => {
    if (!selectedTripId) return undefined;
    return await db.trips.get(selectedTripId);
  }, [selectedTripId]);

  const [tripId, setTripId] = useState<string>('');
  const [tripIcon, setTripIcon] = useState<string>("fa-plane-departure");
  const [tripName, setTripName] = useState<string>('');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [tripCurrencyCode, setTripCurrencyCode] = useState<string>('USD');
  const [tripTotal, setTripTotal] = useState<number | null>(null); // null means "not ready"
  const { allSelectedCurrencies, defaultLocaleRef } = useCurrency();

  const { user } = useUser(); // Access user context
  const { lastName, avatar, interval } = user; // Extract the subscribed property
  const weekStartDay = user.weekStartDay;

  const name = user.name || t('common.default_user_name');
  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>("monthly"); // State managed at the top level
  const router = useIonRouter();
  const currentDate = dayjs();

  // Load general interval state (weekly, monthly, yearly)
  useEffect(() => {
    if (interval) {
      setSelectedInterval(interval);
    }
  }, [interval]);


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
  
  


  // Handle back button on dashboard to exit app
  useEffect(() => {
    const registerBackButton = async () => {
      const backButtonHandler = await App.addListener("backButton", ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp(); // Exit if no navigation history
        }
      });

      return () => backButtonHandler.remove(); // Remove listener properly
    }; 
    const unregister = registerBackButton(); // Call the function

    return () => {
      unregister.then(removeListener => removeListener()); // Ensure cleanup
    };
  }, [router]);


  // Calculate total for trip expenses in travel mode
  const calculateTotal = async () => {
    if (!selectedTripId) return 0;

    const allExpenses = await db.expenses.where("tripId").equals(selectedTripId).toArray();
  
    const total = allExpenses.reduce((total, expense) => {
      return Math.round(total + (expense.expenseAmountTrip || 0)); 
    }, 0);
  
    return total;
  };

  
  // Get trip data
  useEffect(() => {
    if (selectedTripId && trip) {
      setTripId(trip.tripId);
      setTripIcon(trip.tripIcon);
      setTripName(trip.tripName);
      setFromDate(new Date(trip.fromDate));
      setToDate(new Date(trip.toDate));
  
      const fetchTotal = async () => {
        const total = await calculateTotal();
        setTripTotal(total);
      };
  
      fetchTotal();
    }
  }, [selectedTripId, trip, checkTrip]);  


  // Get trip currency
  useEffect(() => {
    if (trip && allSelectedCurrencies.length > 0) {
      const matchedCurrency = allSelectedCurrencies.find(
        (currency) => currency.code === trip.currencyCode
      );
  
      if (matchedCurrency) {
        setTripCurrencyCode(matchedCurrency.code); 
      }
    }
  }, [trip, allSelectedCurrencies]);


  // Translate footer menu item titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));

  
  
  // Navigate to the profile page
  const handleNavigation = () => {
    router.push('/app/profile');  
  };

  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <div className='dashboard-top-bar'>
            <div className='dashboard-avatar-bar' onClick={handleNavigation}>
              {avatar ? (
                // Display the avatar image if it exists
                <img
                  src={avatar}
                  alt={`${name}'s Avatar`}
                  className="avatar-dashboard-image"
                />
              ) : (
                // Display initials if no avatar is set
                <div className="avatar-dashboard">
                  {name.charAt(0)}
                  {lastName.charAt(0)}
                </div>
              )}
              <div className='dashboard-greeting'>
                <h5>{t('common.hello')},</h5>
                <h2>{name}</h2>
              </div>
            </div>
          </div>
          
          <IonButtons slot="end"> 
            <IonButton routerLink="/app/reccurrences" routerDirection="forward" >
              <div className="status-button-wrapper">
                <IonIcon icon={syncOutline} className="top-toolbar-icon-btn" />
                <span className={`status-dot ${overallSeverity}-dot`} />
              </div>
            </IonButton>

            <IonButton routerLink="/app/calendar" routerDirection="forward">  
              <IonIcon icon={calendarOutline} className='top-toolbar-icon-btn mr-15'/>
            </IonButton>
             
            {/* Secondary menu for testing page */}
            {/* 
              <IonButton routerLink="/app/testpage">
              <IonIcon 
                className='medium-icon-btn danger mr-10'
                icon={buildOutline} 
              />
            </IonButton>
             */}
             
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding-horizontal" ref={contentRef}>

        {/* Cards */}
        <div className='mt-30'>
        {selectedInterval && (
          <DashboardMainCard 
            selectedInterval={selectedInterval} 
            setSelectedInterval={setSelectedInterval} 
            currentDate={currentDate}   
            start={start}
            end={end}
          />
        )}
        </div>

        {travelMode && (
          <DashboardMainTrip
            tripId={tripId}
            tripIcon={tripIcon}
            tripName={tripName}
            fromDate={fromDate}
            toDate={toDate}
            currencyCode={tripCurrencyCode}
            totalSpent={tripTotal ?? 0} // if tripTotal is null or undefined, use 0 instead to avoid flicker (shows icon for a split second)
          />
        )}

        
        <section>
          <div className='mb-20'>
            <h6 className="section-title">{t('dashboard.recent_expenses')}</h6>
          </div>
          {selectedInterval && (
            <TransactionList 
              selectedInterval={selectedInterval} 
              start={start}
              end={end}
              reverse={true}
              fixedLimit={10} 
            />
          )}
        </section>

      </IonContent>
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default Dashboard;