import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ParsedExpense } from '../db';
import { Dayjs } from 'dayjs';

// App components
import TransactionItem from './TransactionItem';

// Styles
import '../Main.css';
import './TransactionItem.css';

interface Props {
  selectedInterval: "weekly" | "monthly" | "yearly";
  start: Dayjs; 
  end: Dayjs;   
  reverse?: boolean;
  accountId?: string;
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
  
  // Use the fixedLimit value, or null if loading all transactions
  const limit = fixedLimit || null;

  // 1. Fetch expenses reactively using useLiveQuery.
  // It automatically re-runs when db.expenses changes (including after a Dexie Cloud sync).
  const expenses = useLiveQuery(async () => {
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

    return limitedResults.map(exp => ({
      ...exp,
      expenseDate: new Date(exp.expenseDate), 
    }));
  }, [start, end, accountId, reverse, limit]); // Re-query when these dependencies change

  // Lookups (already using useLiveQuery)
  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const getCategory = (categoryId: string) => categories?.find(c => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: string) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
  const getAccountName = (accountId: string) => accounts?.find(ac => ac.accountId === accountId);

  // useLiveQuery returns `undefined` initially while loading data
  const hasLoaded = expenses !== undefined;

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

            const categoryDisplayName = category
              ? category.systemCategory
                ? t(`categories.${category.categoryName}`)
                : category.categoryName
              : "";

            return (
              <TransactionItem
                key={exp.expenseId}
                isActive={exp.isActive}
                categoryIcon={subcategory?.subcategoryIcon || category?.categoryIcon || ""}
                categoryColor={subcategory?.subcategoryColor || category?.categoryColor || ""}
                categoryName={subcategory?.subcategoryName || categoryDisplayName || "Unknown"}
                accountName={accountName}
                expenseNote={exp.expenseNote}
                expenseId={exp.expenseId}
                expenseAmount={amount}
                expenseDate={exp.expenseDate}
                expenseCurrencyCode={exp.expenseCurrencyCode}
                tripId={exp.tripId}
                installmentIndex={exp.installmentIndex}
                totalInstallments={exp.totalInstallments}
                owner={exp.owner}
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