import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

import { useLiveQuery } from "dexie-react-hooks";
import { db, ParsedExpense } from "../db";
import { Dayjs } from "dayjs";
import { 
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  useIonRouter,
} from "@ionic/react";

// App components
import FormattedDate from './FormattedDate';
import FormatAmount from './FormatAmount';
import CategoryIcon from '../components/CategoryIcon';


// Hooks
import { useExpense } from "../context/ExpenseContext";
import { useCurrency } from '../context/CurrencyContext';


// Utils
import { formatPercentage } from "../utils/chartFunctions";


// Styles
import "../Main.css";
import "./TransactionItem.css";
import "../pages/Statistics.css";


interface SubcategoryGroup {
  subcategoryId: string;
  expenses: ParsedExpense[];
  total: number;
}


interface CategoryGroup {
  categoryId: string;
  expenses: ParsedExpense[];
  total: number;
  subcategories: SubcategoryGroup[]; // New structure
}


interface Props {
  selectedInterval: "weekly" | "monthly" | "yearly";
  start: Dayjs; 
  end: Dayjs;   
  selectedDate: Dayjs;
  accountId?: string;
  upToToday?: boolean;
}

// Set minimum loading time (in milliseconds)
const MIN_LOAD_TIME_MS = 400;

const TransactionListByCategory: React.FC<Props> = ({
  selectedInterval,
  start,
  end,
  selectedDate,
  accountId,
  upToToday,
}) => {
  const { t } = useTranslation();
  
  const { checkExpense } = useExpense();
  const { currency } = useCurrency();
  const router = useIonRouter();

  // Updated state type to include subcategories
  const [groupedExpenses, setGroupedExpenses] = useState<CategoryGroup[]>([]);

  // --- STATE FOR LOADING DELAY ---
  const [isLoading, setIsLoading] = useState(true);
  const [hasMinTimeElapsed, setHasMinTimeElapsed] = useState(false);
  // -------------------------------

  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const getCategory = (categoryId: string) => categories?.find((c) => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: string) => subcategories?.find((sc) => sc.subcategoryId === subcategoryId);
  const getAccountName = (accountId: string) => accounts?.find((ac) => ac.accountId === accountId)?.accountName || "";

  // Helper function to calculate the expense amount
  const getAmount = (exp: ParsedExpense): number => {
    return exp.expenseAmountAlt > 0
      ? exp.expenseAmountAlt
      : exp.expenseAmountTrip > 0
      ? exp.expenseAmountTrip
      : exp.expenseAmountDefault;
  };

  // Helper function to calculate the expense amount
  const getDefaultAmount = (exp: ParsedExpense): number => {
    return exp.expenseAmountDefault;
  };
  

  useEffect(() => {
    // 1. Reset states when dependencies change
    setIsLoading(true);
    setHasMinTimeElapsed(false);

    // 2. Start the minimum time timer
    const timer = setTimeout(() => {
      setHasMinTimeElapsed(true);
    }, MIN_LOAD_TIME_MS);

    // 3. Load data    
    const loadExpenses = async () => {
      const allResults = await db.expenses
        .where("expenseDate")
        .between(start.toISOString(), end.toISOString(), true, false)
        .and((exp) => exp.isActive === 1)
        .sortBy("expenseDate");

      const filtered = accountId
        ? allResults.filter((exp) => exp.accountId === accountId)
        : allResults;

      // Group by categoryId
      const groupedMap: Record<string, ParsedExpense[]> = {};
      filtered.forEach((exp) => {
        const catId = exp.categoryId;
        if (!groupedMap[catId]) groupedMap[catId] = [];
        groupedMap[catId].push({
          ...exp,
          expenseDate: new Date(exp.expenseDate),
        });
      });

      // Convert to array, calculate category totals, and group by subcategory
      const groupedArray: CategoryGroup[] = Object.entries(groupedMap).map(
        ([categoryIdStr, expenses]) => {
          const categoryId = categoryIdStr;
          
          // Calculate category total
          const categoryTotal = expenses.reduce((sum, exp) => sum + getDefaultAmount(exp), 0);
          
          // --- NEW LOGIC: Group by subcategory and calculate subcategory totals ---
          const subcategoryMap: Record<string, ParsedExpense[]> = {};
            expenses.forEach((exp) => {
            // Use 0 for expenses without a subcategory
              const subcatId = exp.subcategoryId || 0; 
              if (!subcategoryMap[subcatId]) subcategoryMap[subcatId] = [];
              subcategoryMap[subcatId].push(exp);
            });

            // Convert subcategory map to array and calculate totals
            const subcategoriesArray: SubcategoryGroup[] = Object.entries(subcategoryMap).map(
              ([subcategoryIdStr, subcategoryExpenses]) => {
                const subcategoryId = subcategoryIdStr;
                const subcategoryTotal = subcategoryExpenses.reduce((sum, exp) => sum + getDefaultAmount(exp), 0);

                return {
                  subcategoryId,
                  expenses: subcategoryExpenses,
                  total: subcategoryTotal,
                };
              }
            );

            // Sort subcategories by total spent (descending)
            subcategoriesArray.sort((a, b) => b.total - a.total);
            // --- END NEW LOGIC ---

            return {
              categoryId,
              expenses,
              total: categoryTotal,
              subcategories: subcategoriesArray, // Add subcategory data
            };
          }
        );

      // Sort categories by total spent (descending)
      groupedArray.sort((a, b) => b.total - a.total);

      setGroupedExpenses(groupedArray);

     // 4. Set loading to false once data is processed
     setIsLoading(false);
    };

    loadExpenses();

    // 5. Cleanup the timer when the component unmounts or dependencies change
    return () => clearTimeout(timer);
  }, [selectedInterval, selectedDate, accountId, checkExpense]);

  // Calculate grand total of all categories
  const grandTotal = groupedExpenses.reduce((sum, g) => sum + g.total, 0);

  // --- MODIFIED LOADING CHECK: Display spinner if data is loading OR min time hasn't passed ---
  if (isLoading || !hasMinTimeElapsed || !categories) {
    // This will keep the spinner on the screen until both the data is loaded 
    // AND at least MIN_LOAD_TIME_MS has passed.
    return (
      <div className="centered-container h-200">
        {/* <div className="mb-20">
          <IonSpinner name="lines-sharp" />
        </div>
        <div>Loading transactions...</div> */}
      </div>
    );
  }
  // --- MODIFIED: Check for no data only after loading is complete ---
  if (groupedExpenses.length === 0) {
    return <div>{t('expenses.no_exp_found')}</div>;
  }


  return (
    <IonAccordionGroup multiple={false}>
      {groupedExpenses.map(({ categoryId, expenses, total, subcategories }) => {
        const category = getCategory(categoryId);
        if (!category) return null;
        const percentage = formatPercentage(total, grandTotal);

        // Check if all expenses in this category lack a subcategory
        const isDefaultOnly = 
          subcategories.length === 1 && subcategories[0].subcategoryId === '0';

        // Function to render the individual expense rows (used for both paths)
        const renderExpenseRows = (expList: ParsedExpense[]) => (
            expList.map((exp) => {
              const accountName = getAccountName(exp.accountId);
              const amount = getAmount(exp);

              return (
                <div
                  className="transaction-category__row transaction-item"
                  key={exp.expenseId}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    router.push(`/app/editexpense/${exp.expenseId}`, "forward");
                  }}
                >
                  <div className="transaction-category__date">
                    <FormattedDate date={exp.expenseDate} format="monthDay" />
                  </div>
                  
                  <div className="transaction-category__note-group">
                    <span className="transaction-category__note">
                      {exp.expenseNote}
                      {exp.installmentIndex && exp.totalInstallments && (
                        <span className="installment-label">
                          {" "}
                          ({exp.installmentIndex}/{exp.totalInstallments})
                        </span>
                      )}
                    </span>
                    <span className="card-label">{accountName}</span>
                  </div>
                  
                  <div className="transaction-category__amount">
                    <FormatAmount
                      amount={amount / 100}
                      currencyCode={exp.expenseCurrencyCode}
                    />
                  </div>
                </div>
              );
            })
        );
        
        return (
          <IonAccordion 
            key={categoryId} 
            value={`cat-${categoryId}`} 
            
          >
            {/* Category Header */}
            <IonItem slot="header" className="transaction-category__item">
              <div className="transaction-category__icon">
                <div className="transaction-category__left-col">
                  <CategoryIcon
                    iconName={category?.categoryIcon || "help-circle"}
                    categoryColor={category?.categoryColor || "#ccc"}
                    isTransaction={true}
                  />
                </div>
                <div className="transaction-category__center-col">
                  <div className="transaction-category__wrapper">
                    {category.categoryId !== ''
                      ? category.categoryName
                      : t('categories.no_cat')}
                    <span className="transaction-category__percentage">({percentage})</span>
                  </div>
                  <div className="flex">
                    <FormatAmount
                      amount={total / 100}
                      currencyCode={currency.defaultCurrency.code}
                    />
                  </div>
                </div>
              </div>
            </IonItem>
  
            {/* Category Content (Conditional Rendering) */}
            <div slot="content" className="category-content-wrapper">
              {isDefaultOnly ? (
                // SCENARIO 1: Only "No subcategory" exists. Render expenses directly.
                renderExpenseRows(expenses)
              ) : (
                // SCENARIO 2: Multiple subcategories exist. Render the nested accordion group.
                <IonAccordionGroup  multiple={false}>
                  {subcategories.map(({ subcategoryId, expenses: subExpenses, total: subTotal }) => {
                    const subcategory = getSubcategory(subcategoryId);
                    const subcategoryName = subcategoryId !== '' && subcategory 
                      ? subcategory.subcategoryName
                      : t('categories.no_subcat');
                    
                    return (
                      <IonAccordion 
                        key={subcategoryId} 
                        value={`subcat-${subcategoryId}`}
                        toggle-icon-slot="start"
                        className="transaction-subcategory__item"
                      >
                        {/* Subcategory Header */}
                        <IonItem slot="header" className="transaction-subcategory__header">
                          <div className="transaction-category__note-group subcategory-name-group">
                            <span className="transaction-category__note">
                              {subcategoryName}
                            </span>
                          </div>
                          <div className="transaction-category__amount subcategory-amount">
                            <FormatAmount
                              amount={subTotal / 100}
                              currencyCode={currency.defaultCurrency.code}
                            />
                          </div>
                        </IonItem>
    
                        {/* Subcategory Content (Individual Expenses) */}
                        <div slot="content">
                          {renderExpenseRows(subExpenses)}
                        </div>
                      </IonAccordion>
                    );
                  })}
                </IonAccordionGroup>
              )}
            </div>
          </IonAccordion>
        );
      })}
    </IonAccordionGroup>
  );
  };

export default TransactionListByCategory;