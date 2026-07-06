import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, ParsedExpense } from '../db';
import { Dayjs } from 'dayjs';


// App components
import TransactionItem from './TransactionItem';

// Custom hooks
import { useExpense } from '../context/ExpenseContext';


// Styles
import '../Main.css';
import './TransactionItem.css';


interface Props {
  selectedInterval: "weekly" | "monthly" | "yearly";
  start: Dayjs; 
  end: Dayjs;   
  reverse?: boolean;
  accountId?: number;
  fixedLimit?: number; // Optional: if set, loads only this many records (e.g., 10 for Dashboard)
}


const TransactionList: React.FC<Props> = ({
  selectedInterval,
  start,
  end,
  reverse = false,
  accountId,
  fixedLimit,
}) => {
  const { t } = useTranslation();
  
  const { checkExpense } = useExpense();
  // Use the fixedLimit value, or null if loading all transactions
  const limit = fixedLimit || null;

  const [expenses, setExpenses] = useState<ParsedExpense[]>([]); // list of currently loaded expenses
  const [isLoading, setIsLoading] = useState(true); // New state to track loading
  const [hasLoaded, setHasLoaded] = useState(false);

  const isFetchingRef = useRef(false);

  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const getCategory = (categoryId: number) => categories?.find(c => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: number) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
  const getAccountName = (accountId : number) => accounts?.find(ac => ac.accountId === accountId);

  // Effect to load all transactions when dependencies change
  useEffect(() => {
    // Reset state and trigger load when dependencies change
    isFetchingRef.current = false;
    setExpenses([]);
    loadTransactions();
    // The dependency array is correct: it reloads when the view (interval/date) changes or when a new expense is added/modified
  }, [selectedInterval, start, end, accountId, checkExpense]);  


  
  // Unified function to load transactions (limited or all)
  const loadTransactions = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true; // Start fetching

    try {
      // Pass the calculated 'limit' and 'reverse' to fetchExpenses
      const result = await fetchExpenses(limit, reverse);
      setExpenses(result);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      setExpenses([]);
    } finally {
      setHasLoaded(true);
      isFetchingRef.current = false;
    }
  };

  
  // Updated fetchExpenses function to handle the limit
  const fetchExpenses = async (
    limit: number | null,
    reverse: boolean = false
  ): Promise<ParsedExpense[]> => {
    const allResults = await db.expenses
      .where("expenseDate")
      .between(start.toISOString(), end.toISOString(), true, false) 
      .and(exp => exp.isActive === 1)
      .sortBy("expenseDate");

    const filtered = accountId
      ? allResults.filter(exp => exp.accountId === accountId)
      : allResults;

    const ordered = reverse ? filtered.reverse() : filtered;

    const limitedResults = limit 
      ? ordered.slice(0, limit) 
      : ordered;

    // 5. Final results and mapping.
    return limitedResults.map(exp => ({
      ...exp,
      expenseDate: new Date(exp.expenseDate), 
    }));
  };



  return (
    <div>
      {/* Conditionally show loading indicator or transactions */}
      {hasLoaded && (
        expenses.length > 0 ? (
          expenses.map((exp) => {
            const category = getCategory(exp.categoryId);
            const subcategory = getSubcategory(exp.subcategoryId);
            const accountName = getAccountName(exp.accountId)?.accountName || '';

            const amount =
              exp.expenseAmountAlt > 0 ? exp.expenseAmountAlt :
              exp.expenseAmountTrip > 0 ? exp.expenseAmountTrip :
              exp.expenseAmountDefault;

            return (
              <TransactionItem
                key={exp.expenseId}
                isActive={exp.isActive}
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
                {...(exp.seriesId ? { autoLogged: exp.autoLogged } : {})}
              />
            );
          })
        ) : (
          <div>{t('expenses.no_exp_found')}</div>
        )
      )}
    </div>
  );
};

export default TransactionList;