import React, { useEffect, useState, useMemo } from 'react';
import Dexie from 'dexie';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ParsedExpense } from '../db'; 
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { RecurrenceSettings } from '../hooks/useRecurringExpense';
import dayjs from "dayjs";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useExpense } from '../context/ExpenseContext';
import { useDatePicker } from '../context/DatePickerContext'; 
import { useRecurringExpense } from '../hooks/useRecurringExpense';
import { useCurrency } from '../context/CurrencyContext';
import { useExchangeRates } from '../context/ExchangeRateContext';

// Utility functions
import { getDueInfo, getMostRecentExpenseForSeries, getOldestOverdueExpenseForSeries } from '../utils/recurrenceFunctions'; 
import { hasInactiveExpense } from '../utils/recurrenceStatus';

// App components
import FormattedDate from '../components/FormattedDate';
import FormatAmount from '../components/FormatAmount';
import Modal from '../components/Modal';
import CategoryPreview from '../components/CategoryPreview';
import ExpenseItem from '../components/ExpenseItem';

// Ionic components
import { 
  IonAlert,
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

import { 
  alertCircle, 
  warning, 
  checkmarkCircle, 
  createOutline, 
  ellipsisVertical,
  trashOutline, 
  stopCircleOutline,
  stopCircle
} from 'ionicons/icons';

// Styles
import '../Main.css';
import './Recurrences.css';
import '../components/ReccurrenceItem.css';

const defaultRecurrence: RecurrenceSettings = {
  isRecurring: 0,
  unit: 'month',
  interval: 1,
  endCondition: 'never',
  totalOccurrences: null,
  logAutomatically: false,
  lastLoggedDate: '',
  lastLoggedInstallmentIndex: 0,
  endDate: '',
  amountVaries: false
};

interface DueInfo {
  label: string;
  className: string;
}

const ViewRecurrence: React.FC = () => {
  const { t } = useTranslation();
  
  const contentRef = useScrollToTop(); 
  const router = useIonRouter();
  const { checkExpense, checkRecurrence } = useExpense();
  const { logExpenseForSeries, finalizeRemainingInstallments } = useRecurringExpense();
  const { currency } = useCurrency(); 
  const { getExchangeRate } = useExchangeRates();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);

  // Series variables
  const { seriesId } = useParams<{ seriesId: string }>(); 
  const series = useLiveQuery(() => db.recurringSeries.get(seriesId), [seriesId]); 
  const passedRecurrenceId = seriesId;
  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrence);
  const today = new Date();
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(today);
  const [note, setNote] = useState<string>('');
  const [categoryColor, setCategoryColor] = useState<string>('');
  const [categoryIcon, setCategoryIcon] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('');
  const [dueInfo, setDueInfo] = useState<DueInfo | null>(null);

  // Replaced manual pagination state with a reactive Dexie query for ALL expenses in the series
  const expenses = useLiveQuery(async () => {
    if (!passedRecurrenceId) return [];
    const results = await db.expenses
      .where('[seriesId+dueDate]')
      .between([passedRecurrenceId, Dexie.minKey], [passedRecurrenceId, Dexie.maxKey])  
      .reverse() // latest first
      .toArray();

    return results.map(exp => ({
      ...exp,
      expenseDate: new Date(exp.expenseDate),
    })) as ParsedExpense[];
  }, [passedRecurrenceId]);

  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const [accountId, setAccountId] = useState<string>('');
  const getCategory = (categoryId: string) => categories?.find(c => c.categoryId === categoryId);
  const getSubcategory = (subcategoryId: string) => subcategories?.find(sc => sc.subcategoryId === subcategoryId);
  const getAccountName = (accountId : string) => accounts?.find(ac => ac.accountId === accountId);
  const [showDeleteExpenseAlert, setShowDeleteExpenseAlert] = useState(false);
  const [showDeleteRecurrenceAlert, setShowDeleteRecurrenceAlert] = useState(false);
  const [recurrenceToDelete, setRecurrenceToDelete] = useState<string | null>(null);
  const [, setResetTrigger] = useState<number>(0);

  // Modal variables
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
  });

  const [showDueDate, setShowDueDate] = useState<string | null>('');
  const [showDueAmount, setShowDueAmount] = useState<number>(0);
  const [isEstimated, setIsEstimated] = useState<boolean>(false);
  
  // Alert variables for stopping recurrence
  const [showStopAlert, setShowStopAlert] = useState(false);
  const [showStopInstallmentRecAlert, setShowStopInstallmentRecAlert] = useState(false);
  const [unpaidCount, setUnpaidCount] = useState<number>(0);
  const { openDatePicker } = useDatePicker(); 
  const [, setStopDate] = useState<Date>(today);

  // Get recurrence data
  useEffect(() => {
    if(series) {
      setNote(series.note);
      
      const newIsEstimated =
        series.estimatedAmount > 0 &&
        series.amountDefault === 0 &&
        series.amountAlt === 0;

      setIsEstimated(newIsEstimated);      

      const amount =
        series.estimatedAmount > 0 && series.amountDefault === 0 && series.amountAlt === 0
          ? series.estimatedAmount
          : series.amountAlt > 0 
            ? series.amountAlt
            : series.amountDefault; 

      setShowDueAmount(amount);
      setCurrencyCode(series.currencyCode);
      setAccountId(series.accountId);

      const runShowDueDate = async () => {
        if (series.isActive === 2) {
          const result = await getOldestOverdueExpenseForSeries(series.seriesId);
          if(result?.dueDate) setShowDueDate(result?.dueDate);
        } else {
          setShowDueDate(series.nextDueDate);
        }
      };
      runShowDueDate();

      setRecurrenceStartDate(new Date(series.startDate));
      setRecurrence({
        isRecurring: series.isActive,
        unit: series.unit,
        interval: series.interval,
        endCondition:
          series.endDate
            ? 'onDate'
            : series.totalOccurrences !== null
            ? 'afterOccurrences'
            : 'never',
        totalOccurrences: series.totalOccurrences ?? null,
        logAutomatically: series.logAutomatically,
        lastLoggedDate: series.lastLoggedDate,
        lastLoggedInstallmentIndex: series.lastLoggedInstallmentIndex,
        endDate: series.endDate ?? null,
        amountVaries: series.estimatedAmount > 0
      });

      if(series.totalOccurrences !== null) {
        const totalUnpaid = series.totalOccurrences != null
          ? series.totalOccurrences - (series.lastLoggedInstallmentIndex ?? 0)
          : null;

        if (totalUnpaid !== null) {
          setUnpaidCount(totalUnpaid);
        } 
      }

      const category = getCategory(series.categoryId);  
      const subcategory = getSubcategory(series.subcategoryId);
      if(subcategory) {
        setCategoryColor(subcategory.subcategoryColor);
        setCategoryIcon(subcategory.subcategoryIcon);
      } else if(category) {
        setCategoryColor(category.categoryColor);
        setCategoryIcon(category.categoryIcon);
      }
    }
  }, [series, checkExpense, checkRecurrence]);

  const convertedAmountText = useMemo(() => {
    if (currencyCode === currency.defaultCurrency.code) {
      return '';
    }
  
    const rate = getExchangeRate(currencyCode);
    if (!rate) return '';
  
    const converted = Math.round(showDueAmount / rate);
  
    return new Intl.NumberFormat(
      currency.defaultCurrency.locale,
      {
        style: 'currency',
        currency: currency.defaultCurrency.code,
      }
    ).format(converted / 100);
  }, [
    showDueAmount,
    currencyCode,
    currency.defaultCurrency.code,
    currency.defaultCurrency.locale,
    getExchangeRate
  ]);

  const frequencyMap = {
    month: 'monthly',
    week: 'weekly',
    year: 'yearly'
  };
  
  const frequencyKey = frequencyMap[recurrence.unit as keyof typeof frequencyMap];
  const frequencyLabel = t(`date.${frequencyKey}`);

  // Get due date info
  useEffect(() => {
    async function fetchDueInfo() {
      const result = getDueInfo(showDueDate);
      setDueInfo(result);
    }

    fetchDueInfo();
  }, [showDueDate, checkRecurrence]);

  const getIcon = (status : string) => {
    switch (status) {
      case 'overdue':
        return alertCircle;
      case 'due-soon':
        return warning;
      case 'finalized':
        return stopCircle;
      default:
        return checkmarkCircle; 
    }
  };

  const showCategoryColor = recurrence.isRecurring ? categoryColor : 'neutral';

  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); 
    setIsPopoverOpen(true);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const openSuccessModal = (message: string) => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: message,
      actions: [
        {
          label: t('common.continue'),
          action: () => {
            setIsConfirmationModalOpen(false);
            setResetTrigger(prev => prev + 1);
            history.back(); 
          },
        },
      ],
    });
    setIsConfirmationModalOpen(true);
  };

  const openFailureModal = (message: string) => {
    setModalConfig({
      icon: 'failure',
      title: t('modal.failure_modal_title'),
      content: message,
      actions: [
        {
          label: t('common.try_again'),
          action: () => {
            setIsConfirmationModalOpen(false);
            setResetTrigger(prev => prev + 1);
          },
          style: 'fail-btn', 
        },
      ],
    });
    setIsConfirmationModalOpen(true);
  };

  const handleDeleteRecurrence = async (recurrenceId: string) => {
    try {
      await db.transaction(
        'rw', 
        db.expenses,
        db.recurringSeries,
        async (tx) => {
          await tx.expenses.where('seriesId').equals(recurrenceId).delete();
          await tx.recurringSeries.where('seriesId').equals(recurrenceId).delete();
        }
      );

      checkExpense(); 
      checkRecurrence();
      openSuccessModal(t('expenses.expense_deleted')); 
    } catch (error) {
      openFailureModal(t('expenses.error_deleting_recurrence'));
      console.error('Error updating recurrence:', error);
    }
  };

  const stopRecurringSeries = async (stopDate?: string) => {
    const effectiveStopDate = stopDate ?? today.toISOString();
    const hasUnpaid = await hasInactiveExpense(passedRecurrenceId);

    let isActive = 0;
    let updateDueDate = null;
    if (
      showDueDate &&
      (
        dayjs(showDueDate).isBefore(dayjs(effectiveStopDate)) ||
        dayjs(showDueDate).isSame(dayjs(effectiveStopDate), "day")
      )
    ) {
      isActive = 1;
      updateDueDate = showDueDate;
    } else if (hasUnpaid) {
      isActive = 2;
      updateDueDate = null;
    }

    await db.transaction(
      'rw', 
      db.recurringSeries,
      async (tx) => {
        await tx.recurringSeries.update(passedRecurrenceId, {
          isActive,
          endDate: effectiveStopDate,
          nextDueDate: updateDueDate,
        });
      }
    );

    setShowStopAlert(false);
    if(isActive !== 1) setShowDueDate('');
    checkRecurrence();
  };

  const handleStopDate = async () => {
    setShowStopAlert(false);
    
    try {
      const lastExpense = await getMostRecentExpenseForSeries(passedRecurrenceId);

      const minDateObj = lastExpense?.expenseDate
        ? new Date(lastExpense.expenseDate)
        : recurrenceStartDate;

      minDateObj.setDate(minDateObj.getDate() + 1);

      const pickedDateISO = await openDatePicker(new Date(), {minDate: minDateObj});
      
      if (!pickedDateISO) {
        return; 
      }

      setStopDate(new Date(pickedDateISO));
      await stopRecurringSeries(pickedDateISO); 

    } catch (err) {
      console.warn("Date picker was closed without selection");
    }
  };

  const stopRecurrenceWithoutPaying = async () => {
    setShowStopAlert(false);
    
    try {
      await finalizeRemainingInstallments(passedRecurrenceId, {
        payoff: false
      });
    } catch (err) {
      console.warn("Date picker was closed without selection");
    }
  };

  const handleDeleteExpense = async () => {
    setShowDeleteExpenseAlert(false);
    
    try {
      await logExpenseForSeries(passedRecurrenceId, undefined, true);
    } catch (err) {
      console.warn("Date picker was closed without selection");
    }
  };
  
  const showAccountName = getAccountName(accountId);
  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>

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
                  {recurrence && recurrence.isRecurring === 1 && (
                    <>
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover(); 
                          router.push(`/app/editrecurrence/${seriesId}`, 'forward');
                        }}
                      >
                        <IonIcon 
                          icon={createOutline} 
                          className="icon"
                          style={{ marginRight: "15px" }} 
                        />
                        {t('expenses.edit_recurrence')}
                      </li>

                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover(); 
                          if(recurrence.totalOccurrences !== null) {
                            setShowStopInstallmentRecAlert(true);
                          } else {
                            setShowStopAlert(true);
                          }
                        }}
                      >
                        <IonIcon 
                          icon={stopCircleOutline} 
                          className="icon"
                          style={{ marginRight: "15px" }} 
                        />
                        {t('expenses.end_recurrence')}
                      </li>
                    </>
                  )}

                  <li 
                    className="item" 
                    onClick={() => {
                      closePopover();
                      setTimeout(() => {
                        setRecurrenceToDelete(passedRecurrenceId);
                        setShowDeleteRecurrenceAlert(true);
                      }, 100);
                    }}
                  >
                    <IonIcon 
                      icon={trashOutline} 
                      className="icon"
                      style={{ marginRight: "15px" }} 
                    />
                    {t('expenses.delete_recurrence')}
                  </li>
                </ul>
              </IonContent>
            </IonPopover>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <section className='centered-container'>
        <h2 className='screen-title'>
          {note.length > 15 ? `${note.substring(0, 20)}...` : note}
        </h2>
          <div className="mt-20">
            <CategoryPreview
              categoryColor={showCategoryColor}
              categoryIcon={categoryIcon}
            />
          </div>

          <div className='recurrence-amount'>
            <div className="view-recurrence-amount">
              {isEstimated && <span className='note'>(est)</span>}
              <h1 className={isEstimated ? 'estimated-amount' : ''}>
                {typeof showDueAmount === 'number' && showDueAmount > 0 && currencyCode ? (
                  <FormatAmount amount={showDueAmount / 100} currencyCode={currencyCode} />
                ) : null}
              </h1>
            </div>

            {currencyCode !== currency.defaultCurrency.code && (
              <div className="converted-recurrence-amount">
                ≈ <span className='converted-amount-code'>{currency.defaultCurrency.code}</span>
                {convertedAmountText}
              </div>
            )}
          </div>
          
          <div className='recurrence-due-date'>
            {showDueDate && (<FormattedDate date={new Date(showDueDate)} format="long" />)}
            {dueInfo && (
              <div className={`status-label-no-wrap ${dueInfo.className}`}>
                <IonIcon icon={getIcon(dueInfo.className)} style={{ color: 'inherit' }} />
                {recurrence.isRecurring === 2 ? `Finalized with ${dueInfo.label}` : dueInfo.label}
              </div>
            )}
            <span className='log-type'>{recurrence.logAutomatically ? t('expenses.auto_logging') : t('expenses.man_logging')}</span>
          </div>

          <div className="info-container">
            <p>
              {t(`date.frequency.${recurrence.unit}`, { count: recurrence.interval })}
              {typeof recurrence.totalOccurrences === 'number' && ` x ${recurrence.totalOccurrences}`}
              {recurrence.endDate && (
                <>
                  {t('expenses.config_until')}{" "}
                  {new Date(recurrence.endDate).toLocaleDateString()}
                </>
              )}
            </p>
            {showAccountName && (
              <p>{showAccountName.accountName}</p>
            )}
          </div>

          {recurrence.isRecurring === 1 && (
            <div className='button-container mt-5'>
              <IonButton 
                className='medium success'
                onClick={() => {
                  router.push(`/app/logrecurrenceexpense/${seriesId}`, 'forward');
                }}
              >
                {t('expenses.log_exp')}
              </IonButton>
              <IonButton 
                className='medium danger'
                onClick={() => {
                  setShowDeleteExpenseAlert(true);
                }}
              >
                {t('expenses.delete_exp')}
              </IonButton>
            </div>
          )}
        </section>

        {/* Payment history section - Now rendering all records without pagination */}
        <section>
          <div className='section-header mt-20'>
            <div>
              <h6 className="section-title">{t('expenses.payment_history')}</h6>
            </div>
          </div>

          <div>
            {expenses && expenses.length > 0 ? (
              expenses.map((exp) => {
                const dateFromExp = exp.dueDate ? new Date(exp.dueDate) : null;
                const originalDueDate = dateFromExp && !isNaN(dateFromExp.getTime()) ? dateFromExp : new Date();

                const amount = 
                  exp.expenseAmountAlt > 0 ? exp.expenseAmountAlt :
                  exp.expenseAmountDefault;

                return (
                  <ExpenseItem        
                    key={exp.expenseId}
                    expenseId={exp.expenseId}
                    expenseAmount={amount}
                    expenseAmountDefault={
                      exp.expenseAmountAlt > 0
                        ? exp.expenseAmountDefault
                        : undefined
                    }
                    dueDate={originalDueDate}
                    deletionDate={exp.deletionDate ? new Date(exp.deletionDate) : null}
                    expenseDate={exp.expenseDate}
                    expenseCurrencyCode={exp.expenseCurrencyCode}
                    installmentIndex={exp.installmentIndex}
                    totalInstallments={exp.totalInstallments}
                    paymentStatus={exp.isActive}
                    seriesId={passedRecurrenceId}
                  />
                );
              })
            ) : (
              <div>{t('expenses.no_exp_found')}</div>
            )}
          </div>
        </section>

        {/* Alerts and Modals */}
        <IonAlert
          isOpen={showDeleteRecurrenceAlert}
          className='custom-alert'
          onDidDismiss={() => setShowDeleteRecurrenceAlert(false)}
          header={t('expenses.delete_recurrence_q')}
          message={t('expenses.delete_recurrence_a')}
          buttons={[
            {
              text: t('common.cancel'),
              role: 'cancel',
              handler: () => {
                setShowDeleteRecurrenceAlert(false);
                setRecurrenceToDelete(null);  
              }
            },
            {
              text: t('common.delete'),
              role: 'destructive',
              cssClass: 'alert-button-destructive',
              handler: () => {
                if (recurrenceToDelete !== null) {
                  handleDeleteRecurrence(recurrenceToDelete);
                }
                setShowDeleteRecurrenceAlert(false);
                setRecurrenceToDelete(null);
              }
            }
          ]}
        />

        <IonAlert
          isOpen={showStopAlert}
          className='custom-alert'
          onDidDismiss={() => setShowStopAlert(false)}
          header={t('expenses.stop_recurrence')}
          message={t('expenses.stop_recurrence_msg')}
          buttons={[
            { 
              text: t('common.cancel'), 
              role: "cancel", 
              handler: () => { setShowStopAlert(false) } 
            },
            {
              text: t('date.stop_today'),
              handler: async () => await stopRecurringSeries(),
            },
            {
              text: t('date.pick_date'),
              handler: handleStopDate,
            },
          ]}
        />

        <IonAlert
          isOpen={showStopInstallmentRecAlert}
          className='custom-alert'
          onDidDismiss={() => setShowStopInstallmentRecAlert(false)}
          header={t('expenses.stop_recurrence_q')}
          message={t("expenses.unpaid_installments_warning", { count: unpaidCount })}          
          buttons={[
            {
              text: t('expenses.pay_all_stop'),
              handler: () => {
                setShowStopInstallmentRecAlert(false);
                router.push(`/app/logrecurrenceexpense/${seriesId}?mode=remaining`, 'forward');
              },
            },
            {
              text: t('expenses.stop_without_paying'),
              role: "destructive",
              cssClass: 'alert-button-destructive',
              handler: () => {
                setShowStopInstallmentRecAlert(false);
                stopRecurrenceWithoutPaying();
              },
            },
            {
              text: t('common.cancel'),
              role: "cancel",
            },
          ]}
        />

        <IonAlert
          className='custom-alert'
          isOpen={showDeleteExpenseAlert}
          onDidDismiss={() => setShowDeleteExpenseAlert(false)}
          header={t('expenses.delete_exp')}
          message={t('expenses.delete_exp_msg')}
          buttons={[
            { 
              text: t('common.cancel'), 
              role: "cancel", 
              handler: () => { setShowDeleteExpenseAlert(false) } 
            },
            {
              text: t('common.delete'),
              role: "destructive",
              cssClass: 'alert-button-destructive',
              handler: handleDeleteExpense,
            },
          ]}
        />

        <Modal
          isOpen={isConfirmationModalOpen}
          icon={modalConfig.icon}
          title={modalConfig.title}
          content={modalConfig.content}
          closeModal={() => setIsConfirmationModalOpen(false)}
          actions={modalConfig.actions}
        />
      </IonContent>
    </IonPage>
  );
};

export default ViewRecurrence;