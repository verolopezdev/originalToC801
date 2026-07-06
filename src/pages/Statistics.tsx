import React, { useEffect, useState } from 'react';
import { db, Expense, Category } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useIonViewDidEnter, useIonViewWillLeave } from '@ionic/react';
import { useTranslation } from 'react-i18next';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useCurrency } from "../context/CurrencyContext";

// Utilities
import { getExpensesWithCategories } from '../utils/chartFunctions';


// Components
import MonthlyChart from '../components/charts/MonthlyChart';
import TwoMonthsChart from '../components/charts/TwoMonthsChart';
import TwelveMonthChart from '../components/charts/TwelveMonthChart';
import YearlyChart from '../components/charts/YearlyChart';
import FormatAmount from '../components/FormatAmount';
import CategoryMenu from "../components/CategoryMenu";

// Ionic components
import { 
  IonAlert,
  IonBackButton, 
  IonButton, 
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonMenuButton,
  IonPage,
  IonPopover, 
  IonSelect,
  IonSelectOption,
  IonToolbar,
  useIonRouter 
} from '@ionic/react';

// Icons
import { 
  calendarNumberOutline,
  ellipsisVertical, 
  informationCircleOutline, 
  layersOutline, 
  receiptOutline
} from 'ionicons/icons';

// Styles
import '../Main.css';
import './Statistics.css';

const ranges = ["1M", "2M", "YTD", "12M"];

const statistics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const contentRef = useScrollToTop(); 
  const router = useIonRouter();

  /*
    This tells your component when the page is actually visible on screen.
    Then you used isVisible to conditionally render your Recharts components.
    The isVisible check prevents Recharts from trying to render while the page is off-screen, stopping those “width(0)/height(0)” warnings.
  */
  const [isVisible, setIsVisible] = useState(false);
  useIonViewDidEnter(() => setIsVisible(true));
  useIonViewWillLeave(() => setIsVisible(false));
  
  const [isLoading, setIsLoading] = useState(true);
  const [showTotal, setShowTotal] = useState<number>(0);
    
  const { currency } = useCurrency();

  const [selectedRange, setSelectedRange] = useState<string>("1M");
  const [expenses, setExpenses] = useState<(Expense & { category: Category | null })[]>([]);
  const [chartTitle, setChartTitle] = useState<string>(t('date.this_month'));
  const [dateRangeTitle, setDateRangeTitle] = useState<string>("");

  const [sortOption, setSortOption] = useState<"thisMonth" | "change" | "alphabetical">(
    "thisMonth"
  );  

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  
  const categories = useLiveQuery(() => db.categories.toArray());

  // Show helpfull tip
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [infoMsg, setInfoMsg] = useState<string>('');

  const [visibleCategories, setVisibleCategories] = useState<number[]>([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0 = January


  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonthIndex);

  const getMonthName = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(date);

  // Utility: format date
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  
    if (date.getFullYear() !== new Date().getFullYear()) {
      options.year = "numeric";
    }
  
    return new Intl.DateTimeFormat(i18n.language, options).format(date);
  };

  // Pure function: get start/end dates and titles
  const computeDateRange = (range: string) => {
    const now = new Date();
    let start: Date, end: Date, title: string, dateTitle: string, comparison: string;

    switch (range) {
      case "1M":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        title = t('date.this_month');
        dateTitle = `${formatDate(start)} - ${formatDate(end)}`;
        setInfoMsg(t('stats.this_month_msg'));
        break;

      case "2M":
        // --- 1. Define Query Dates (current + previous month range) ---    
        // Start of current month
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        thisMonthStart.setHours(0, 0, 0, 0);
    
        // End of current month (today)
        const today = new Date(now);
        today.setHours(23, 59, 59, 999);
    
        // Start of previous month
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevMonthStart.setHours(0, 0, 0, 0);
    
        // End of previous month (last day of previous month)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // day 0 of this month = last day of previous month
        prevMonthEnd.setHours(23, 59, 59, 999);
    
        // --- 2. Define Query Range ---
        start = prevMonthStart; // start from previous month
        end = today;            // up to current day
    
        // --- 3. Define Display Dates ---
        // These two ranges can be used for charting or comparisons
        const prevMonthRangeStart = prevMonthStart;
    
        // --- 4. Define Titles ---
        const thisMonthName = getMonthName(thisMonthStart);
        const prevMonthName = getMonthName(prevMonthStart);

        title = t('stats.this_month_vs');
        dateTitle = `${formatDate(prevMonthRangeStart)} - ${formatDate(today)}`;        
        setInfoMsg(
          t("statistics.compare_months", {
            thisMonth: thisMonthName,
            prevMonth: prevMonthName
          })
        );
        break;
      
      case "12M":
        end = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
        start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
        title = t('stats.last_twelve');
        dateTitle = `${formatDate(start)} - ${formatDate(end)}`;
        setInfoMsg(t('stats.last_twelve_msg'));
        break;

      case "YTD":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        title = t('stats.ytd');
        dateTitle = `${formatDate(start)} - ${formatDate(end)}`;
        setInfoMsg(t('stats.ytd_msg'));
        break;

      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        title = "";
        dateTitle = `${formatDate(start)} - ${formatDate(end)}`;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end, title, dateTitle };
  };


  useEffect(() => {
    let isCancelled = false;
  
    const loadExpenses = async () => {
      setIsLoading(true);
  
      const { start, end, title, dateTitle } = computeDateRange(selectedRange);
      setChartTitle(title);
      setDateRangeTitle(dateTitle);
  
      try {
        const data = await getExpensesWithCategories(start, end);
        if (isCancelled) return;
  
        setExpenses(data);
  
        let total = 0;
  
        if (selectedRange === "2M") {
          // ✅ Only count expenses from *this calendar month*
          const now = new Date();
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthEnd = new Date(now);
          thisMonthEnd.setHours(23, 59, 59, 999);
  
          const thisMonthExpenses = data.filter((e) => {
            const d = new Date(e.expenseDate);
            return d >= thisMonthStart && d <= thisMonthEnd;
          });
  
          total = thisMonthExpenses.reduce(
            (sum, e) => sum + e.expenseAmountDefault / 100,
            0
          );
        } else {
          // Default behavior for other ranges (e.g. 7D, 30D, etc.)
          total = data.reduce((sum, e) => sum + e.expenseAmountDefault / 100, 0);
        }
  
        setShowTotal(Number(total.toFixed(2)));
      } catch (err) {
        console.error("Error loading expenses", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
  
    loadExpenses();
    return () => {
      isCancelled = true;
    };
  }, [selectedRange, i18n.language]);

  useEffect(() => {
    if (!expenses?.length) return;
  
    const totals: Record<number, number> = {};
  
    for (const exp of expenses) {
      totals[exp.categoryId] =
        (totals[exp.categoryId] || 0) + exp.expenseAmountDefault / 100;
    }
  
    const sorted = Object.entries(totals)
      .map(([categoryId, total]) => ({
        categoryId: Number(categoryId),
        total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(item => item.categoryId);
  
    setVisibleCategories(sorted);
  
  }, [expenses]);


  const handleToggleCategory = (categoryId: number) => {
    setVisibleCategories((prev) => {
      if (prev.includes(categoryId)) {
        if (prev.length > 1) return prev.filter((id) => id !== categoryId);
        return prev;
      }
      return [...prev, categoryId];
    });
  };
        
  const hasExpenses = expenses.length;


  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };


  const closePopover = () => {
    setIsPopoverOpen(false);
  };



  

  return (
    <IonPage className="statistics-page">
      <CategoryMenu
        categories={(categories ?? []).filter(cat =>
          expenses.some(exp => exp.categoryId === cat.categoryId)
        )}
        visibleCategories={visibleCategories}
        onToggleCategory={handleToggleCategory}
      />

      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          {/* Back button */}
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          
          {/* Secondary menu for this category */}
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
                  <li 
                    className='item' 
                    onClick={() => {
                      closePopover(); // First, close the popover
                      router.push('/otherperiods');
                    }}
                  >
                    <IonIcon icon={calendarNumberOutline} />
                    {t('date.other_periods')}
                  </li>
                  
                  {/* Export to PDF or CSV */}
                  <li 
                    className='item' 
                    onClick={() => {
                      closePopover(); // First, close the popover
                      router.push('/exportdata');
                    }}
                  >
                    <IonIcon icon={receiptOutline} />
                    {t('stats.export_data')}
                  </li>
                </ul>
              </IonContent>
            </IonPopover>
          </IonButtons>         
        </IonToolbar>
      </IonHeader>

      <IonContent id="statistics-content" className="ion-padding-horizontal" ref={contentRef}>
        {!isLoading && (
          <div className='mb-10'>
            {/* Page title */}
            <div className="centered-container mb-20">
              <h2 className='screen-title'>{t('stats.stats_title')}</h2>
            </div>

            {/* Total for the period */}
            <h1 className='statistics-total'>
              <FormatAmount
                amount={showTotal}
                currencyCode={currency.defaultCurrency.code}
              />
            </h1>

            {/* Period title, info and date range */}
            <div>
              <div className="flex">
                <h6 className='section-title'>{chartTitle}</h6> 
                <IonIcon 
                  icon={informationCircleOutline} 
                  className="info-icon"
                  onClick={() => setShowInfo(true)}
                />
              </div>
              <span className='date-range-title'>{dateRangeTitle}</span>
            </div>
            
            {/* Chart bar */}
            <div className='chart-bar'>
              {/* Left content */}
              <div className="left-content">
                {selectedRange === "12M" ? (
                  <IonMenuButton
                    menu="categoryMenu" // this links to your custom menu
                    autoHide={false} // optional, prevents it from hiding automatically
                  >
                    <IonIcon icon={layersOutline} />
                  </IonMenuButton>
                ) : (selectedRange === '1M' || selectedRange === '2M') && (
                  <IonSelect
                    value={sortOption}
                    onIonChange={(e) => setSortOption(e.detail.value)}
                    interface='popover'
                    mode="ios"
                  >
                    <IonSelectOption value="thisMonth">{t('stats.sort_amount')}</IonSelectOption>
                    {selectedRange === '2M' && (
                      <IonSelectOption value="change">{t('stats.sort_change')}</IonSelectOption>
                    )}
                    <IonSelectOption value="alphabetical">{t('stats.sort_name')}</IonSelectOption>
                  </IonSelect>
                )}
              </div>

              {/* Right content: Time range buttons */}
              <div className='report-time-btns'>        
                {ranges.map(range => (
                  <span
                    key={range}
                    className={selectedRange === range ? "selected" : ""}
                    onClick={() => setSelectedRange(range)}
                  >
                    {range}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Show chart only when fully loaded */}
        {!isLoading && hasExpenses === 0 ? (
          <p style={{ textAlign: "center", padding: 20 }}>
            {t('expenses.none_to_display')}
          </p>
        ) : !isLoading && hasExpenses > 0 && isVisible && (
          <div id="expenses-chart">
            {/* Charts */}
            {selectedRange === "1M" && (
              <MonthlyChart
                expenses={expenses}
                categories={categories}
                sortOption={sortOption}
                year={year}
                month={month} 
              />
            )}
            {selectedRange === "2M" && (
              <TwoMonthsChart expenses={expenses} sortOption={sortOption} />
            )}
            {selectedRange === "12M" && (
              <TwelveMonthChart 
              expenses={expenses} 
              categories={categories ?? []} 
              visibleCategoryIds={visibleCategories} // 👈 Change selectedCategories to visibleCategoryIds
            />
            )}
            {selectedRange === "YTD" && <YearlyChart expenses={expenses} year={currentYear} />}
          </div>
        )}

        <IonAlert
          isOpen={showInfo}
          className='custom-alert'
          onDidDismiss={() => setShowInfo(false)}
          header={chartTitle}
          message={infoMsg}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default statistics;
