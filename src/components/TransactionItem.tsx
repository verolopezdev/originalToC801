import React from 'react';
import { useTranslation } from 'react-i18next';


// App components
import CategoryIcon from './CategoryIcon';
import FormatAmount from './FormatAmount';
import FormattedDate from './FormattedDate';


// Ionic components
import { 
  IonNote, 
  IonRouterLink 
} from '@ionic/react';


// Styles
import '../Main.css';
import './TransactionItem.css';


interface TransactionItemProps {  
  categoryIcon: string;
  categoryColor: string; 
  categoryName: string;
  accountName: string;
  expenseNote: string; 
  expenseId: string;
  expenseAmount: number; 
  expenseDate: Date; 
  expenseCurrencyCode: string;
  tripId?: string | null;
  installmentIndex?: number;
  totalInstallments?: number;
  planner?: boolean;
  autoLogged?: boolean;
  isActive?: number; 
  seriesId?: string; 
  estimatedAmount?: number;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  categoryIcon,
  categoryColor,
  categoryName,
  accountName,
  expenseNote,
  expenseId,
  expenseAmount,
  expenseDate,
  expenseCurrencyCode,
  tripId,
  installmentIndex,
  totalInstallments,
  planner,
  autoLogged,
  isActive,
  seriesId,
  estimatedAmount
}) => {  
  const { t } = useTranslation();

  let color = 'neutral';
  const expense = new Date(expenseDate);
  const today = new Date();

  // Zero out time to compare dates only
  expense.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (expense > today) {
    color = 'neutral';
  } else if (isActive === 1) {
    color = categoryColor;
  } else {
    color = 'neutral';
  }  


  return (
    <IonRouterLink
      routerLink={
        expenseId === '-1' // is a projected expense, navigate to edit recurrence
            ? `/viewrecurrence/${seriesId}`
            : `/editexpense/${expenseId}` // is an actual expense
      }
      routerDirection="forward"
    >      
      <div className='transaction'> 
        <div className='left-col'>
          <CategoryIcon iconName={categoryIcon} categoryColor={color} tripId={tripId} autoLogged={autoLogged} isTransaction={true} />
        </div>
        <div className='center-col'>
          <div className="center-col-wrapper category-wrapper">
            {categoryName}
            <span className="card-label">{accountName}</span>
          </div>  
          <div className="flex-ellipsis">    
            {expenseNote ? (
              <div className="transaction-note">
                {expenseNote}
              </div>
            ) : (
              <IonNote className="transaction-note">{t('common.no_description')}</IonNote>    
            )}

            {/* Append (1/6) if both values are present */}
            {installmentIndex && totalInstallments && (
              <span className="installment-label"> ({installmentIndex}/{totalInstallments})</span>
            )}
          </div>
        </div>
        <div className='right-col'>
          <div className='expense-data'>
            {estimatedAmount && estimatedAmount > 0 && expenseId === '-1' ? (
              <div className='disabled'>
                <span className='projected'>(est)</span>
                <FormatAmount amount={estimatedAmount/100} currencyCode={expenseCurrencyCode} />  
              </div>
            ) : (
              <FormatAmount amount={expenseAmount/100} currencyCode={expenseCurrencyCode} />    
            )}
          </div>

          {!planner && (
            <div className='expense-data'>
              <FormattedDate date={expenseDate} format="compact" />
            </div> 
          )}
        </div>
      </div>
    </IonRouterLink>
  );
  }

export default TransactionItem;