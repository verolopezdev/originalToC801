import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useIonRouter } from '@ionic/react';
import { db } from '../db'; 


// App components
import FormatAmount from './FormatAmount';
import FormattedDate from './FormattedDate';
import { useExpense } from '../context/ExpenseContext';
import { useCurrency } from '../context/CurrencyContext';


// Utility functions
import { getDueInfo, getOldestOverdueExpenseForSeries, hasRecurrenceEnded } from '../utils/recurrenceFunctions';	

// Ionic components
import { 
  IonAlert,
	IonIcon,
  IonRouterLink 
} from '@ionic/react';


// Styles
import '../Main.css';
import './TransactionItem.css';
import './ExpenseItem.css';
import { 
  alertCircle, 
  checkmarkCircle, 
  closeCircleOutline, 
  receiptOutline, 
  stopCircle,
  trash, 
  trashOutline,
  warning
} from 'ionicons/icons';



interface TransactionItemProps {
  expenseId: string;
  expenseAmount: number; 
  expenseAmountDefault?: number;
	dueDate: Date;
  deletionDate?: Date | null;
  expenseDate: Date | null; 
  expenseCurrencyCode: string;
  installmentIndex?: number;
  totalInstallments?: number;
	paymentStatus: number;
  seriesId: string;
}

const ExpenseItem: React.FC<TransactionItemProps> = ({
  expenseId,
  expenseAmount,
  expenseAmountDefault,
	dueDate,
  deletionDate,
  expenseDate,
  expenseCurrencyCode,
  installmentIndex,
  totalInstallments,
	paymentStatus,
  seriesId,
}) => {  
  const { t } = useTranslation();
  const { checkExpense, checkRecurrence } = useExpense();
  const { currency } = useCurrency(); 
  
  const router = useIonRouter();
  const today = new Date();
  const [showDeleteExpenseAlert, setShowDeleteExpenseAlert] = useState(false);
  
  const dueInfo = getDueInfo(dueDate.toISOString());  
  const getIcon = (status : string) => {
    switch (status) {
      case 'overdue':
        return alertCircle;
      case 'due-soon':
        return warning;
      case 'finalized':
        return stopCircle;
      default:
        return checkmarkCircle; // or return a default icon like checkmarkOutline
    }
  };

  // Handle Delete Expense
  
  const handleDeleteExpense = async () => {
    setShowDeleteExpenseAlert(false);
  
    try {
      await db.transaction(
        "rw",
        db.expenses,
        db.recurringSeries,
        async (tx) => {
          // Mark the expense as deleted
          await tx.expenses.update(expenseId, {
            isActive: 2,
            deletionDate: today.toISOString(),
          });
  
          const hasOverdue = await getOldestOverdueExpenseForSeries(seriesId);
          const recurrence = await tx.recurringSeries.get(seriesId);
  
          if (!recurrence) {
            return;
          }
  
          const hasEnded = hasRecurrenceEnded(recurrence);
  
          // Deactivate the recurrence only if:
          // 1. there are no remaining overdue expenses, and
          // 2. the recurrence has naturally ended.
          if (hasOverdue === null && hasEnded) {
            await tx.recurringSeries.update(seriesId, {
              isActive: 0,
              nextDueDate: null,
            });
          }
        }
      );
  
      checkRecurrence();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  }; 

  
  
    
	
  return (
    <>
      {/* Alert before deleting next expense from recurrence (red button DELETE EXPENSE) */}
      <IonAlert
        isOpen={showDeleteExpenseAlert}
        className='custom-alert'
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
      
      <IonRouterLink routerLink={paymentStatus === 1 ? `/app/editexpense/${expenseId}` : undefined} routerDirection="forward">
        <div className='expense-item'>
          <div className='center-col'>
            {/* Original due date */}
            <h6 className='original-due-date'><FormattedDate date={dueDate} format="long" /></h6>

            {/* Payment status */}
            <div className='expense-payment-status'>
            {paymentStatus === 1 && expenseDate !== null ? ( // Regular paid expense
              <>
                <div className='flex mr-5 text-success'>
                  <IonIcon icon={checkmarkCircle} className="mr-5" style={{ color: 'inherit', fontSize: '16px' }} /> 
                  <span>{t('common.paid')}</span>
                </div>
                <FormattedDate date={expenseDate} format="compact" />
                {/* Append (1/6) if both values are present */}
                {installmentIndex && totalInstallments && (
                  <span className="installment-label"> ({installmentIndex}/{totalInstallments})*</span>
                )}
              </>
            ) : paymentStatus === 2 && deletionDate !== null ? ( // deleted expense
              <>
                <div className='flex text-danger'>
                  <IonIcon icon={trash} className="mr-5" style={{ color: 'inherit'}} /> 
                  <span className='mr-5'>{t('common.deleted')}</span>
                </div>
                <FormattedDate date={deletionDate} format="compact" />
              </>
            ) : paymentStatus === 3 && deletionDate !== null ? ( // deleted expense
              <>
                <div className='flex text-danger'>
                  <IonIcon icon={closeCircleOutline} className="mr-5" style={{ color: 'inherit'}} /> 
                  <span className='mr-5'>{t('common.cancelled')}</span>
                </div>
                <FormattedDate date={deletionDate} format="compact" />
              </>
            ) : paymentStatus === 0 ? ( // Unpaid expense
              <div className='flex'>
                <div className={`status-label-no-wrap ${dueInfo.className}`}> 
                  <IonIcon icon={getIcon(dueInfo.className)} />
                  <span className='mr-5'>{dueInfo.label}</span>
                </div>
                <FormatAmount amount={expenseAmount/100} currencyCode={expenseCurrencyCode} />
              </div>
            ) : null}
            </div>
          </div>
          {/* Amount */}
          <div className='right-col'>
            {paymentStatus === 1 ? ( // Paid amount
              <>
                <div className='expense-item-amount'>
                  {expenseId === '-1' && (<span className='projected'>{t('common.estimated_short')}</span>)}
                  <FormatAmount amount={expenseAmount/100} currencyCode={expenseCurrencyCode} />  
                </div>
                {expenseAmountDefault !== undefined && (
                  <div className='expense-item-amount'>
                  <FormatAmount amount={expenseAmountDefault/100} currencyCode={currency.defaultCurrency.code} /> 
                </div>
                )}
              </>
            ) : paymentStatus === 0 ? (
              <div className='inner-right-col'>
                <IonIcon // Log expense icon
                  icon={receiptOutline}
                  className='icon-btn icon-btn-success mr-5' 
                  onClick={() => {
                    router.push(`/editexpense/${expenseId}`, 'forward');      
                  }} 
                />
                <IonIcon // Delete expense icon
                  icon={trashOutline}
                  className='icon-btn icon-btn-danger'
                  onClick={() => {
                    setShowDeleteExpenseAlert(true);
                  }}
                />           
              </div>
            ) : null}
          </div>
        </div>
      </IonRouterLink>
    </>
  );
  }

export default ExpenseItem;