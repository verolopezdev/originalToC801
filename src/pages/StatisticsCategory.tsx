import React, { useEffect, useState } from 'react';
import { db, ParsedExpense } from "../db";
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';

import dayjs from "dayjs";

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useExpense } from "../context/ExpenseContext";
import { useCurrency } from "../context/CurrencyContext";


// App components
import FormatAmount from '../components/FormatAmount';
import FormattedDate from '../components/FormattedDate';


// Utility functions
import { formatDate } from '../utils/chartFunctions';


// Ionic's components
import { 
  IonAlert,
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader,
  IonIcon, 
  IonPage, 
  IonToolbar,
  useIonRouter
} from '@ionic/react';

interface SubcategoryGroup {
  subcategoryId: number;
  expenses: ParsedExpense[];
  total: number;  
}


// Styles
import '../Main.css';
import TransactionListBySubcategory from '../components/TransactionListBySubcategory';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import { informationCircleOutline } from 'ionicons/icons';


const StatisticsCategory: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const contentRef = useScrollToTop(); // use the custom hook 
  const { checkExpense } = useExpense();
  const { currency } = useCurrency();
  const router = useIonRouter();
  const [isLoading, setIsLoading] = useState(true);

  const { categoryId, year, month } = useParams<{
    categoryId: string;
    year: string;
    month: string;
  }>();

  const date = dayjs(`${year}-${month}-01`).toDate();
  const monthName = dayjs(date).format("MMMM");

  const category = useLiveQuery(() => db.categories.get(Number(categoryId)), [categoryId]);
  const categoryName = category?.categoryName ? category.categoryName : '';
  const categoryColor = category?.categoryColor ? category.categoryColor : 'categoryless';
  const categoryIcon = category?.categoryIcon ? category.categoryIcon : 'fa-bolt-lightning';
  const [categoryTotal, setCategoryTotal] = useState<number>(0);
  
  const [groupedExpenses, setGroupedExpenses] = useState<SubcategoryGroup[]>([]);

  const selectedYear = Number(year);
  const selectedMonth = Number(month) - 1; // dayjs months are 0-indexed


  const startOfMonth = dayjs()
    .year(selectedYear)
    .month(selectedMonth)
    .startOf("month")
    .toISOString();

  const endOfMonth = dayjs()
    .year(selectedYear)
    .month(selectedMonth)
    .endOf("month")
    .toISOString();

  const getAmount = (exp: ParsedExpense): number => exp.expenseAmountDefault;
  
  useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);

      const allResults = await db.expenses
        .where("expenseDate")
        .between(startOfMonth, endOfMonth, true, false)
        .and((exp) => exp.isActive === 1 && exp.categoryId === Number(categoryId))
        .sortBy("expenseDate");

      // Group by subcategoryId
      const subcategoryMap: Record<number, ParsedExpense[]> = {};
      allResults.forEach((exp) => {
        const subcatId = exp.subcategoryId || 0;
        if (!subcategoryMap[subcatId]) subcategoryMap[subcatId] = [];
        subcategoryMap[subcatId].push({
          ...exp,
          expenseDate: new Date(exp.expenseDate),
        });
      });

      const subcategoriesArray: SubcategoryGroup[] = Object.entries(subcategoryMap).map(
        ([subcategoryIdStr, expenses]) => {
          const subcategoryId = Number(subcategoryIdStr);
          const total = expenses.reduce((sum, exp) => sum + getAmount(exp), 0);
          return { subcategoryId, expenses, total };
        }
      );

      subcategoriesArray.sort((a, b) => b.total - a.total);
      setGroupedExpenses(subcategoriesArray);

      // ✅ Calculate total for entire category
      const totalForCategory = subcategoriesArray.reduce((sum, s) => sum + s.total, 0);

      // Use toFixed(2) to round to 2 decimal places and ensure the format.
      // We convert the result back to a Number since state often expects a number type.
      setCategoryTotal(Number((totalForCategory / 100).toFixed(2)));
      setIsLoading(false)
    };

    loadExpenses();
  }, [categoryId, month, year, checkExpense]);

  // Show helpfull tip
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;
  const chartTitle = t('date.this_month');
  const infoMsg = t("stats.stats_cat_msg", {
    category: category?.categoryName
  });  
  


  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>

        {!isLoading && (
          <>
            {/* Screen Header */}
            <div className='centered-container mb-20'>
              <h2 className='screen-title'>{category?.categoryName}</h2>
            </div>

            {/* Total for the period */}
            <h1 className='statistics-total'>
              <FormatAmount
                amount={categoryTotal}
                currencyCode={currency.defaultCurrency.code}
              />
            </h1> 

            {/* Period title and date range */}
            <div>
              <div className="flex">
                <h6 className='section-title'>
                  <FormattedDate date={date} format="monthYear" />  
                </h6> 
                <IonIcon 
                  icon={informationCircleOutline} 
                  className="info-icon"
                  onClick={() => setShowInfo(true)}
                />
              </div>
            </div>

            {/* Category chart */}
            <CategoryPieChart 
              groupedExpenses={groupedExpenses} 
              parentCategoryColor={categoryColor ? categoryColor : 'categoryless'}
            />

            <section>
              <div className='section-header'>
                  <h6 className="section-title">{t('common.details')}</h6>
              </div>
              
              {/* Accordion list of subcategories & expenses */}
              <TransactionListBySubcategory 
                groupedExpenses={groupedExpenses}
                parentCategoryColor={categoryColor}
                parentIcon={categoryIcon}
              />
            </section>
          </>
        )}       
        
        {/* Show title info */}
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

export default StatisticsCategory;