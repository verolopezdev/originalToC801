import React, { useEffect, useState } from "react";
import { db, Expense, Category } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useIonViewDidEnter, useIonViewWillLeave } from '@ionic/react';
import { useTranslation } from 'react-i18next';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useCurrency } from "../context/CurrencyContext";


// App components
import FormatAmount from '../components/FormatAmount';
import MonthlyChart from "../components/charts/MonthlyChart";
import YearlyChart from '../components/charts/YearlyChart';


// Utilities
import { getExpensesWithCategories } from '../utils/chartFunctions';  


// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonCol,
  IonContent, 
  IonGrid,
  IonHeader,
  IonIcon, 
  IonItem,
  IonModal,
  IonPage,
  IonRow, 
  IonTitle,
  IonToolbar 
} from '@ionic/react';

// Styles
import '../Main.css';
import './Statistics.css';

import { caretDownOutline, closeOutline } from "ionicons/icons";

const OtherPeriods: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const contentRef = useScrollToTop(); // use the custom hook 
  const { currency } = useCurrency();
  /*
    This tells your component when the page is actually visible on screen.
    Then you used isVisible to conditionally render your Recharts components.
    The isVisible check prevents Recharts from trying to render while the page is off-screen, stopping those “width(0)/height(0)” warnings.
  */
  const [isVisible, setIsVisible] = useState(false);
  useIonViewDidEnter(() => setIsVisible(true));
  useIonViewWillLeave(() => setIsVisible(false));
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0 = January

  const months = [
    "all",
    ...Array.from({ length: 12 }, (_, i) => i) // 0–11
  ] as const;
  
  type Month = typeof months[number];

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<Month>(currentMonthIndex);  
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const categories = useLiveQuery(() => db.categories.toArray());
  const sortOption = "thisMonth";  
  const [showTotal, setShowTotal] = useState<number>(0);
  
  const [expenses, setExpenses] = useState<(Expense & { category: Category | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getMonthLabel = (m: Month) => {
    if (m === "all") return t("");

    return new Intl.DateTimeFormat(i18n.language, {
      month: "long"
    }).format(new Date(2024, m, 1));
  };

  // Load all years that have at least one expense
  useEffect(() => {
    const loadYears = async () => {
      const yearsSet = new Set<number>();

      await db.expenses
        .orderBy("expenseDate")
        .each((expense: Expense) => {
          const year = new Date(expense.expenseDate).getFullYear();
          if (!isNaN(year)) yearsSet.add(year);
        });

      const years = Array.from(yearsSet).sort((a, b) => b - a); // newest first

      if (years.length === 0) {
        setAvailableYears([currentYear]);
        setYear(currentYear);
      } else {
        setAvailableYears(years);
        setYear(years.includes(currentYear) ? currentYear : years[0]);
      }
    };

    loadYears();
  }, []);


  // Load expenses for selected period
  useEffect(() => {
    let isCancelled = false;

    const loadExpenses = async () => {
      setIsLoading(true);

      const { startDate, endDate } = getPeriodRange(year, month);

      try {
        const data = await getExpensesWithCategories(startDate, endDate);
        if (isCancelled) return;

        // 1. Set the loaded expenses
        setExpenses(data); 

        // 2. Calculate the total from the fetched data (keep in cents)
        const totalInCents = data.reduce((sum, exp) => 
          sum + exp.expenseAmountDefault,
        0);

        // Convert to currency and round once
        const total = Math.round(totalInCents) / 100;

        // 3. Set the calculated total
        setShowTotal(total);

      } catch (err) {
        console.error("Error loading expenses", err);
        // Clear expenses and total on error
        setExpenses([]);
        setShowTotal(0); 
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadExpenses();
    return () => {
      isCancelled = true;
    };
  }, [year, month]); // Dependencies remain the same
  

  // Get start and end date for the selected period
  const getPeriodRange = (year: number, month: Month) => {
    let startDate: Date;
    let endDate: Date;
  
    if (month === "all") {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }
  
    return { startDate, endDate };
  };

  const hasExpenses = expenses.length;


  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent id="statistics-content" className="ion-padding-horizontal"  ref={contentRef}>
        {/* Page title */}
        <div className="centered-container mb-20">
          <h2 className='screen-title'>{t('date.other_periods')}</h2>
        </div>

        {/* Period Section */}
        <div>
          <div className="flex-row-right">
            <IonItem onClick={() => setShowMonthPicker(true)}>
              <span>{year}</span>
              <span className="period-month-label">{getMonthLabel(month)}</span>
              <IonIcon icon={caretDownOutline} slot="end" className="caret-icon"></IonIcon>
            </IonItem>
          </div>
        </div>


        {/* Total for the period */}
        <h1 className='statistics-total'>
          <FormatAmount
            amount={showTotal}
            currencyCode={currency.defaultCurrency.code}
          />
        </h1>
        

        {/* Show chart only when fully loaded */}
        {!isLoading && hasExpenses === 0 ? (
          <p style={{ textAlign: "center", padding: 20 }}>
            {t('expenses.none_to_display')}
          </p>
        ) : !isLoading && hasExpenses > 0 && isVisible && (
          <div 
            id="expenses-chart"
            style={{
              width: "100%",
              minHeight: "250px",   // <= ESSENTIAL
              display: "block"
            }}
          >
          {month === "all" ? (
            <YearlyChart expenses={expenses} year={year} />
          ) : (
            <MonthlyChart
              expenses={expenses}
              categories={categories}
              sortOption={sortOption}
              year={year}
              month={months.indexOf(month) - 1}  // returns 0–11
            />
          )}
          </div>
        )}


        {/* Period selection modal */}
        <IonModal isOpen={showMonthPicker} onDidDismiss={() => setShowMonthPicker(false)}>
          <IonHeader className="ion-no-border">
            <IonToolbar className="transparent">
              <IonTitle>{t('date.select_period')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowMonthPicker(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className="close-modal"></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent>
            <div className="month-picker-modal ion-padding">

              {/* Year selection */}
              <h5 className="picker-section-title">{t('date.select_year')}</h5>
              <IonGrid className="year-picker-grid">
                <IonRow>
                  {availableYears.map((y) => (
                    <IonCol size="4" key={y}>
                      <div
                        className={`year-item ${year === y ? "selected" : ""}`}
                        onClick={() => setYear(y)}
                      >
                        {y}
                      </div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>

              {/* Month selection */}
              <h5 className="picker-section-title mt-20">{t('date.select_month')}</h5>

              <IonGrid className="month-picker-grid">
                <IonRow>
                  <IonCol size="12" className="month-col">
                  <div
                    className={`month-item all-option ${month === "all" ? "selected" : ""}`}
                    onClick={() => {
                      setMonth("all");
                      setShowMonthPicker(false);
                    }}
                  >
                    {t("date.all_year")}
                  </div>
                  </IonCol>
                </IonRow>

                <IonRow>
                  {Array.from({ length: 12 }, (_, i) => (
                    <IonCol size="4" key={i} className="month-col">
                      <div
                        className={`month-item ${month === i ? "selected" : ""}`}
                        onClick={() => {
                          setMonth(i);
                          setShowMonthPicker(false);
                        }}
                      >
                        {getMonthLabel(i)}
                      </div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>

            </div>
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default OtherPeriods;