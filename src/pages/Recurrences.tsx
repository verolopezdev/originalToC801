import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, Expense, RecurringSeries } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

// App components
import Footer from '../components/Footer';
import ReccurrenceItem from '../components/ReccurrenceItem';

// Utility functions
import { getActiveRecurringSeries, getInactiveRecurringSeries } from '../utils/recurrenceFunctions';  
import { getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions';    

// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader,
  IonIcon,
  IonPage,
  IonPopover, 
  IonToolbar 
} from '@ionic/react';

// Icons
import { 
  add,
  calendarOutline, 
  cashOutline, 
  ellipsisVertical,
  eyeOffOutline,
  eyeOutline,
  homeOutline,
  layersOutline,
} from 'ionicons/icons';
  
// Styles
import '../Main.css';
import './Recurrences.css';

// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/app/accounts', icon: layersOutline },
  { title: 'Add', url: '/app/newexpense/0', icon: add },
  { title: 'activity', url: '/app/activity', icon: cashOutline }
];

const Reccurrences: React.FC = () => {
  const contentRef = useRef<HTMLIonContentElement>(null);
  const { t } = useTranslation();
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  const [showInactiveRecurrences, setShowInactiveRecurrences] = useState<boolean>(false);
  const firstInactiveRef = useRef<HTMLDivElement | null>(null);

  // Lookups
  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  
  const getCategory = (categoryId: string) => categories?.find(c => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: string) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
  const getAccountName = (accountId : string) => accounts?.find(ac => ac.accountId === accountId);

  // 1. Fetch and sort active recurrences reactively using useLiveQuery
  const activeData = useLiveQuery(async () => {
    const allActiveRecurrencies = await getActiveRecurringSeries();

    const results = await Promise.all(
      allActiveRecurrencies.map(rec => getOldestOverdueExpenseForSeries(rec.seriesId))
    );

    const map: Record<string, Expense | null> = {};
    allActiveRecurrencies.forEach((rec, idx) => {
      map[rec.seriesId] = results[idx];
    });

    const sortedRecurrences = [...allActiveRecurrencies].sort((a, b) => {
      const overdueA = map[a.seriesId];
      const dateA = (overdueA ? overdueA.dueDate : a.nextDueDate) ?? '1970-01-01';

      const overdueB = map[b.seriesId];
      const dateB = (overdueB ? overdueB.dueDate : b.nextDueDate) ?? '1970-01-01';

      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();

      return timeA - timeB;
    });

    return { sortedRecurrences, map };
  }, []);

  // 2. Fetch inactive recurrences conditionally and reactively
  const inactiveRecurrences = useLiveQuery(async () => {
    if (!showInactiveRecurrences) return [];
    return await getInactiveRecurringSeries();
  }, [showInactiveRecurrences]) || [];

  // Derived loading state & data variables
  const isLoading = activeData === undefined;
  const activeRecurrences = activeData?.sortedRecurrences ?? [];
  const overdueExpenses = activeData?.map ?? {};

  // Check if inactive recurrences exist for the menu icon toggle
  const hasInactiveRecurrences = useLiveQuery(
    async () => {
      const firstInactive = await db.recurringSeries
        .where('isActive')
        .equals(0)
        .first();
      return !!firstInactive;
    },
    [],
    false
  );

  // Scroll to first inactive element of the list
  useEffect(() => {
    if (showInactiveRecurrences && inactiveRecurrences.length > 0 && contentRef.current && firstInactiveRef.current) {
      contentRef.current.getScrollElement().then((scrollEl) => {
        requestAnimationFrame(() => {
          const targetOffset = firstInactiveRef.current!.offsetTop;
          scrollEl.scrollTo({
            top: targetOffset - 16,
            behavior: "smooth",
          });
        });
      });
    }
  }, [showInactiveRecurrences, inactiveRecurrences]);

  // Scroll back to the top when hiding inactive elements
  useEffect(() => {
    if (!showInactiveRecurrences && contentRef.current) {
      contentRef.current.scrollToTop(300);
    }
  }, [showInactiveRecurrences]);

  // Open secondary menu
  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent);
    setIsPopoverOpen(true);
  };

  // Close secondary menu
  const closePopover = () => {
    setIsPopoverOpen(false);
  };
  
  // Translate footer menu item titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>

          {hasInactiveRecurrences && (
            <IonButtons slot="end">
              <IonButton onClick={openPopover}>
                <IonIcon icon={ellipsisVertical} />
              </IonButton>

              <IonPopover 
                  isOpen={isPopoverOpen} 
                  event={popoverEvent}
                  onDidDismiss={closePopover} 
                  side="bottom"
                  alignment="end"
                  className='secondary-menu'
              >
                <IonContent class="ion-no-padding">
                  <ul className='list'>
                    {showInactiveRecurrences ? (
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover();
                          setTimeout(() => setShowInactiveRecurrences(false), 100);
                        }}
                      >
                        <IonIcon icon={eyeOffOutline} /> {t('common.hide_inactive')}
                      </li>
                    ) : (
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover();
                          setTimeout(() => setShowInactiveRecurrences(true), 100);
                        }}
                      >
                        <IonIcon icon={eyeOutline} /> {t('common.show_inactive')}
                      </li>
                    )}
                  </ul>
                </IonContent>
              </IonPopover>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <div className="page-container">
          <div className='centered-container'>
            <h2 className='screen-title'>{t('expenses.recurrent_exp')}</h2>
          </div>

          {!isLoading && activeRecurrences.length === 0 && inactiveRecurrences.length === 0 && (
            <section className='centered-container'>
              <IonIcon icon={calendarOutline} className="no-favourites-screen" />
              <h4 className="screen-title">{t('expenses.no_recurrences')}</h4>
              <p className="screen-prompt">
                {t('expenses.no_recurrences_msg')}
              </p>
            </section>
          )}

          <div className='mt-20'>
            {activeRecurrences.map((rec) => {
              const category = getCategory(rec.categoryId);
              const subcategory = getSubcategory(rec.subcategoryId);
              const accountName = getAccountName(rec.accountId)?.accountName || '';
              const overdueExpense = overdueExpenses[rec.seriesId];
              
              const newIsEstimated =
                rec.estimatedAmount > 0 &&
                rec.amountDefault === 0 &&
                rec.amountAlt === 0;

              const expenseAmount =
                rec.estimatedAmount > 0 && (rec.amountDefault === 0 && rec.amountAlt === 0)
                  ? rec.estimatedAmount
                  : [
                      overdueExpense?.expenseAmountAlt,
                      overdueExpense?.expenseAmountDefault,
                      rec.amountAlt,
                      rec.amountDefault,
                    ].find(v => v !== undefined && v !== 0) ?? 0;

              const dueDate = overdueExpense?.dueDate ?? rec.nextDueDate;

              const categoryDisplayName = category
                ? category.systemCategory
                  ? t(`categories.${category.categoryName}`)
                  : category.categoryName
                : "";

              return (
                <ReccurrenceItem      
                  key={rec.seriesId}
                  seriesId={rec.seriesId}
                  categoryIcon={subcategory?.subcategoryIcon || category?.categoryIcon || ""}
                  categoryColor={subcategory?.subcategoryColor || category?.categoryColor || ""}
                  categoryName={subcategory?.subcategoryName || categoryDisplayName || t('common.unkonwn')}
                  accountName={accountName}
                  expenseNote={rec.note}
                  expenseAmount={expenseAmount}
                  startDate={new Date(rec.startDate)}
                  endDate={rec.endDate}
                  expenseCurrencyCode={rec.currencyCode}
                  interval={rec.interval}
                  unit={rec.unit}
                  totalInstallments={rec.totalOccurrences ?? undefined}
                  autoLogged={rec.logAutomatically}
                  nextDueDate={dueDate} 
                  isActive={rec.isActive}
                  lastLoggedDate={rec.lastLoggedDate} 
                  amountVaries={newIsEstimated}
                  owner={rec.owner}
                />
              );
            })}

            {showInactiveRecurrences && inactiveRecurrences.map((rec, idx) => {
              const category = getCategory(rec.categoryId);
              const subcategory = getSubcategory(rec.subcategoryId);
              const accountName = getAccountName(rec.accountId)?.accountName || '';
              const amount =
                rec.amountAlt > 0 ? rec.amountAlt :
                rec.amountDefault;

              return (
                <div key={rec.seriesId} ref={idx === 0 ? firstInactiveRef : null}>
                  <ReccurrenceItem
                    seriesId={rec.seriesId}
                    categoryIcon={subcategory?.subcategoryIcon || category?.categoryIcon || ""}
                    categoryColor={subcategory?.subcategoryColor || category?.categoryColor || ""}
                    categoryName={subcategory?.subcategoryName || category?.categoryName || t('common.unkonwn')}
                    accountName={accountName}
                    expenseNote={rec.note}
                    expenseAmount={amount}
                    startDate={new Date(rec.startDate)}
                    endDate={rec.endDate}
                    expenseCurrencyCode={rec.currencyCode}
                    interval={rec.interval}
                    unit={rec.unit}
                    totalInstallments={rec.totalOccurrences ?? undefined}
                    autoLogged={rec.logAutomatically}
                    nextDueDate={rec.nextDueDate}
                    isActive={rec.isActive}
                    lastLoggedDate={rec.lastLoggedDate}
                    amountVaries={rec.estimatedAmount > 0}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </IonContent>
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default Reccurrences;