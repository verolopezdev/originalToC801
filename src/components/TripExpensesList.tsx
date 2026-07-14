import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, ParsedExpense } from '../db'; 


import {
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';


// App components
import TransactionItem from './TransactionItem'; 


// Custom hooks
import { useExpense } from '../context/ExpenseContext';


interface Props {
  tripId: string;
  onTotalChange?: (total: number) => void;
}


const TripExpensesList: React.FC<Props> = ({ 
  tripId,
  onTotalChange   
}) => {
  const { t } = useTranslation();
  
  const PAGE_SIZE = 10;

  const [expenses, setExpenses] = useState<ParsedExpense[]>([]); // list of currently loaded expenses
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const { checkExpense } = useExpense();

  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const getCategory = (categoryId: string) => categories?.find(c => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: string) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);


  useEffect(() => {
    setExpenses([]); // Reset expenses when the dependencies change
    setOffset(0);
    setHasMore(true);
    loadInitial();
  }, [checkExpense]);

  // Calculate total expenses for this trip and pass it to parent
  useEffect(() => {
    const calculateTotal = async () => {
      if (!tripId) return;
  
      const allExpenses = await db.expenses.where("tripId").equals(tripId).toArray();
  
      const total = allExpenses.reduce((total, expense) => {
        return Math.round(total + (expense.expenseAmountTrip || 0)); 
      }, 0);
  
      if (onTotalChange) {
        onTotalChange(total);
      }
    };
  
    calculateTotal();
  }, [tripId, checkExpense]); // Run again if tripId changes

  // Load first 10 expenses
  const loadInitial = async () => {
    setLoading(true); // Start loading
    const result = await fetchExpenses(0);
    setExpenses(result); // Initially load the expenses
    setOffset(result.length);
    setHasMore(result.length === PAGE_SIZE);
    setLoading(false); // Done loading
  };

  // Load more until complete
  const loadMore = async (e: CustomEvent<void>) => {

    const result = await fetchExpenses(offset);

    // Optional: delay the UI update by 1 second (1000ms)
    await new Promise(resolve => setTimeout(resolve, 1000));

    setExpenses(prev => [...prev, ...result]);

    setOffset(prev => prev + result.length);
    setHasMore(result.length === PAGE_SIZE);
    (e.target as HTMLIonInfiniteScrollElement).complete();
  };

  
  // skip: This is the offset—how many items to skip (used for pagination)
  // Returns a promise that resolves to an array of Expense objects
  const fetchExpenses = async (skip: number): Promise<ParsedExpense[]> => {
    let query = db.expenses
      .where("tripId")
      .equals(tripId)

    const results = await query
      .reverse() // Gets the newest expenses first (since dates are stored ascending by default)
      .offset(skip) // Skips skip number of items. This is how paging is implemented
      .limit(PAGE_SIZE) // Limit to the fixedLimit or default PAGE_SIZE
      .toArray(); // Executes the query and returns the results as an array

    /*
    Dexie stores data in IndexedDB, which means the expenseDate is stored as a string (because IndexedDB doesn't support Date objects directly).
    When we retrieve it, we convert expenseDate back to a real JavaScript Date object so you can use it in rendering, comparisons, etc.
    The ...exp spreads the rest of the fields into the object, so nothing else is lost.
    */
    return results.map(exp => ({
      ...exp,
      expenseDate: new Date(exp.expenseDate),
    }));
  };


  return (
    <div>
      {!loading && (
        expenses.length > 0 ? (
        expenses.map((exp) => {
          const category = getCategory(exp.categoryId);
          const subcategory = getSubcategory(exp.subcategoryId);
        
          const amount = 
            exp.expenseAmountAlt > 0 ? exp.expenseAmountAlt :
            exp.expenseAmountTrip > 0 ? exp.expenseAmountTrip :
            exp.expenseAmountDefault;

          if (subcategory) {
            return (
              <TransactionItem
                key={exp.expenseId}
                accountName={subcategory.subcategoryName}
                categoryIcon={subcategory.subcategoryIcon}
                categoryColor={subcategory.subcategoryColor}
                categoryName={subcategory.subcategoryName}
                expenseNote={exp.expenseNote}
                expenseId={exp.expenseId}
                expenseAmount={amount}
                expenseDate={exp.expenseDate} 
                expenseCurrencyCode={exp.expenseCurrencyCode}
                isActive={exp.isActive}
                tripId={tripId}
              />
            );
          } else if (category) {
            return (
              <TransactionItem
                key={exp.expenseId}
                accountName={category.categoryName}
                categoryIcon={category.categoryIcon}
                categoryColor={category.categoryColor}
                categoryName={category.categoryName}
                expenseNote={exp.expenseNote}
                expenseId={exp.expenseId}
                expenseAmount={amount}
                expenseDate={exp.expenseDate}
                expenseCurrencyCode={exp.expenseCurrencyCode}
                isActive={exp.isActive}
                tripId={tripId}
              />
            );
          }
        })
      ) : (
        <div>{t('trip.no_exp_for_this_trip')}</div>
      ))}

      <IonInfiniteScroll
        threshold="100px" 
        onIonInfinite={loadMore}
        disabled={!hasMore}
      >
        <IonInfiniteScrollContent loadingText={t('common.loading_more')}></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </div>
  );
};

export default TripExpensesList;
