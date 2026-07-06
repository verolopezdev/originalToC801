import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Expense, Category, Subcategory, ParsedExpense, RecurringSeries } from '../db';
import dayjs, { Dayjs } from 'dayjs';
import FormattedDate from './FormattedDate';
import { getAllExpenses } from '../utils/getAllExpenses';


import {
  IonItemDivider
} from '@ionic/react';


// App components
import TransactionItem from './TransactionItem'; 


// Custom hooks
import { useExpense } from '../context/ExpenseContext';


// Utility functions
import { getDateRangeForInterval } from '../utils/getDateRangeForInterval';

// Styles
import '../Main.css';
import '../pages/Calendar.css';


interface Props {
  selectedInterval: "weekly" | "monthly" | "yearly";
  currentDate: Dayjs;
	targetRef: React.MutableRefObject<HTMLDivElement | null>; // mutable
	onTodayRendered?: () => void;
  scroll: boolean;
  highlightActive: boolean;
  onEstimatedTotalChange?: (total: number) => void;
}


const PlannerList: React.FC<Props> = ({ 
  selectedInterval, 
  currentDate,
	targetRef,  
	onTodayRendered,
  scroll,
  highlightActive,
  onEstimatedTotalChange
}) => {
  const { t } = useTranslation();
  
	const { checkExpense } = useExpense();
  const todayStart = dayjs().startOf('day');
  const { start, end } = getDateRangeForInterval(selectedInterval, currentDate); // Get start & end date for the selected period
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const getCategory = (categoryId: number) => categories?.find(c => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: number) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
  const getAccountName = (accountId : number) => accounts?.find(ac => ac.accountId === accountId);
	const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  // NEW: State to store recurring series data, keyed by seriesId
  const [recurringSeriesMap, setRecurringSeriesMap] = useState<Record<number, RecurringSeries>>({});
  // State to control when the "No transactions" message is allowed to show
  const [showFallback, setShowFallback] = useState(false);


	useEffect(() => {
		const loadCats = async () => {
			const [cats, subs] = await Promise.all([
				db.categories.toArray(),
				db.subcategories.toArray(),
			]);
	
			setCategories(cats);
			setSubcategories(subs);
		};
	
		loadCats();
	}, []);
	

  // 🔁 Load expenses AND recurring series data
  useEffect(() => {
    const loadData = async () => {
      const loadedExpenses = await getAllExpenses(start.toISOString(), end.toISOString());
      setExpenses(loadedExpenses); 

      // ⭐ ADD THIS HERE
      const estimatedTotal = loadedExpenses
      .filter(exp => exp.isActive !== 2)
      .reduce((sum, exp) => {
        const amount = exp.expenseAmountDefault ?? 0;

        return sum + amount;
      }, 0);

      onEstimatedTotalChange?.(estimatedTotal);

      // 1. Identify unique seriesIds from the loaded expenses
      const seriesIds = Array.from(new Set(
        loadedExpenses.map(exp => exp.seriesId).filter(id => id !== undefined && id !== null) as number[]
      ));

      // 2. Fetch the corresponding RecurringSeries data
      if (seriesIds.length > 0) {
        // Assuming you have a table 'recurringSeries' in your 'db' object
        const seriesData = await db.recurringSeries.where('seriesId').anyOf(seriesIds).toArray();
        
        // 3. Create a map for easy lookup
        const seriesMap = seriesData.reduce((acc, series) => {
          acc[series.seriesId] = series;
          return acc;
        }, {} as Record<number, RecurringSeries>);

        setRecurringSeriesMap(seriesMap);

      } else {
        setRecurringSeriesMap({});
      }
    };

    loadData();
  }, [currentDate, checkExpense]);


  // 💡 NEW useEffect for Fallback Delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const DELAY_MS = 300; // Adjust this value (e.g., 300ms) for the desired delay

    // If there are no expenses, schedule the fallback message to appear
    if (expenses.length === 0) {
      // Reset immediately to hide any previous fallback
      setShowFallback(false); 
      
      timer = setTimeout(() => {
        // Only set to true after the delay
        setShowFallback(true);
      }, DELAY_MS);
    } else {
      // If expenses are found, ensure the fallback is hidden
      setShowFallback(false);
    }

    // Cleanup: Clear the timeout if the component unmounts or expenses change quickly
    return () => {
      clearTimeout(timer);
    };
  }, [expenses]); // Dependency on expenses list


  
  
  return (
		<div className='mt-0'>
			{expenses.length > 0 ? (
					Object.entries(
						expenses
							.filter(exp => exp.isActive !== 2)   // 🚀 exclude inactive ones
							.reduce((acc, exp) => {
								const dateKey = dayjs(exp.expenseDate).startOf('day').format('YYYY-MM-DD');
								acc[dateKey] = acc[dateKey] || [];
								acc[dateKey].push({
									...exp,
									expenseDate: new Date(exp.expenseDate)
								});
								return acc;
							}, {} as Record<string, ParsedExpense[]>)
						).map(([dateStr, group]) => {
							const isSelectedDate = dayjs(dateStr).isSame(currentDate, 'day');

              // 🚨 The class calculation now depends on the new dedicated prop
              const finalHighlightClass = isSelectedDate && highlightActive 
              ? 'selectedDay-divider' 
              : '';

              return (
                <React.Fragment key={dateStr}>
                  <IonItemDivider 
                      // Apply the class directly to the divider
                      className={`planner-divider ${finalHighlightClass}`}  
                      
                      // The ref is still based on the SCROLL prop (which only triggers once)
                      ref={(el) => {
                        if (isSelectedDate && scroll && el) {
                          targetRef.current = el as unknown as HTMLDivElement; 
                          onTodayRendered?.(); 
                        }
                      }}
                  >
										<FormattedDate date={dayjs(dateStr, 'YYYY-MM-DD').toDate()} format="fullNoYear" />
									</IonItemDivider>
									{group.map((exp, idx) => {
										const category = getCategory(exp.categoryId);
										const subcategory = getSubcategory(exp.subcategoryId);
										const accountName = getAccountName(exp.accountId)?.accountName || '';
										const amount = 
											exp.expenseAmountAlt > 0 ? exp.expenseAmountAlt :
											exp.expenseAmountTrip > 0 ? exp.expenseAmountTrip :
											exp.expenseAmountDefault;

                    // ⭐️ NEW LOGIC: Check if the expense is projected (today or in the future)
                    const isProjected = dayjs(exp.expenseDate).startOf('day').isSameOrAfter(todayStart);

                    // Initialize estimatedAmount and autologged to default values (0 and false/undefined)
                    let estimatedAmount: number | undefined = undefined;
                    let autoLogged: boolean | undefined = undefined;

                    // Apply the fields ONLY if it is a projected item
                    if (isProjected && exp.seriesId && recurringSeriesMap[exp.seriesId]) {
                        const series = recurringSeriesMap[exp.seriesId];
                        estimatedAmount = series.estimatedAmount;
                        autoLogged = series.logAutomatically; 
                    }

										return (
											<TransactionItem		
												key={`${exp.expenseId}-${idx}`}
												categoryIcon={subcategory?.subcategoryIcon || category?.categoryIcon || ""}
												categoryColor={subcategory?.subcategoryColor || category?.categoryColor || ""}  
												categoryName={subcategory?.subcategoryName || category?.categoryName || "Unknown"}
												accountName={accountName}
												expenseNote={exp.expenseNote}
												expenseId={exp.expenseId}
												expenseAmount={amount}
												expenseDate={exp.expenseDate}
												expenseCurrencyCode={exp.expenseCurrencyCode}
												tripId={exp.tripId}
												installmentIndex={exp.installmentIndex}
												totalInstallments={exp.totalInstallments}
												planner={true}
												isActive={exp.isActive}
												seriesId={exp.seriesId}
                        // ⭐️ CONDITIONAL PROPS: Only pass values if they are defined (i.e., only for projected items)
                        {...(estimatedAmount !== undefined ? { estimatedAmount } : {})}
                        {...(autoLogged !== undefined ? { autoLogged } : {})}
											/>
										);
									})}
								</React.Fragment>
						)})
			) : (
				showFallback && (
          <div>{t('expenses.no_exp_found')}</div>
        )
			)}

		</div>
  );
};

export default PlannerList;
