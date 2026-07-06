import React, { useRef, useState, useEffect } from 'react';
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from 'react-i18next';
import { useExpense } from '../context/ExpenseContext';
import { useUser } from '../context/UserContext';

import ExpenseCalendar from '../components/ExpenseCalendar';
import IntervalToolbar from '../components/IntervalToolbar';
import PlannerList from '../components/PlannerList';

// Ionic's components
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader,
  IonIcon, 
  IonPage,
  IonToolbar 
} from '@ionic/react';

// Styles
import '../Main.css';
import './Calendar.css';

import { calendarOutline, listOutline } from 'ionicons/icons';
import PlannerEstimatedCard from '../components/PlannerEstimatedCard';

const Calendar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { checkExpense } = useExpense(); // Access the addExpense function from the context
  const { user } = useUser();
  const weekStartDay = user.weekStartDay; 
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [currentDate, setCurrentDate] = useState<Dayjs>(() =>
    dayjs().locale(i18n.language)
  ); // Store selected date

  const [viewMode, setViewMode] = useState<'calendar' | 'planner'>('calendar');
  const [shouldScroll, setShouldScroll] = useState(false);
  // Add a new state to manage the active highlight status
  const [highlightActive, setHighlightActive] = useState(false);
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  useEffect(() => {
    setCurrentDate(prev => prev.locale(i18n.language));
  }, [i18n.language]);

  const handleDateChange = (newDate: Dayjs) => {
    // 🚨 1. Reset the highlight state
    setHighlightActive(false); 
  
    // 2. Update the date
    setCurrentDate(newDate); 
  
    // 3. Ensure scroll is off (optional, but safe)
    setShouldScroll(false); 
    
    // 4. If the view is 'planner', switch back to 'calendar'
    // to force the user to select a date in the new interval, 
    // or stay on 'planner' but without a highlight. 
    // We'll assume the goal is just to clear the highlight and keep the view.
  };

  const handleTodayRendered = () => {
    // 1. Scroll logic remains tied to 'shouldScroll'
    if (shouldScroll) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setShouldScroll(false); // Clears the scroll flag immediately after scroll is initiated
        // 🚨 DO NOT reset highlightActive here—it stays TRUE until the date changes
      }, 100);
    }
  };

  const toggleViewMode = () => {
    // When toggling the view mode manually, DO NOT allow scrolling
    setViewMode((prev) => (prev === 'calendar' ? 'planner' : 'calendar'));
    setShouldScroll(false); 

    // 🚨 Set highlightActive to false when the view changes.
    setHighlightActive(false);
  };

  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'> 
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          
          <IonButtons slot="end">
            <IonIcon
              className="top-toolbar-icon-btn mr-10"  
              icon={viewMode === 'calendar' ? listOutline : calendarOutline}
              onClick={toggleViewMode}
            />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="calendar-page-content">
        {/* Screen Header */}
        <div className='centered-container mt--20'>
          <h2 className='screen-title-0'>{viewMode === 'calendar' ? t('calendar.calendar') : t('calendar.forecast')}</h2>
        </div>

        {viewMode === 'planner' && (
          <PlannerEstimatedCard
            totalSpent={estimatedTotal}
          />
        )}

        <IntervalToolbar  
          selectedInterval='monthly'
          currentDate={currentDate}
          setCurrentDate={handleDateChange} // Update date from IntervalToolbar 
          weekStartDay={weekStartDay}
        />

        
        {viewMode === 'calendar' ? (
          <ExpenseCalendar  
            currentDate={currentDate} 
            weekStartDay={weekStartDay}
            onDayClick={(day) => {
              setCurrentDate(day);     // 1. Set the specific date
              setViewMode('planner');  // 2. Switch to planner mode
              setShouldScroll(true);   // 3. 💡 Set the flag to TRUE
              setHighlightActive(true);
            }}
          />
        ) : (
          <div className='planner'>
            <PlannerList  
              selectedInterval='monthly'      
              currentDate={currentDate}   
              targetRef={targetRef}
              onTodayRendered={handleTodayRendered}
              scroll={shouldScroll}
              highlightActive={highlightActive}
              onEstimatedTotalChange={setEstimatedTotal}
            />
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Calendar;