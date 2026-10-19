import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';


// App components
import CategoryIcon from './CategoryIcon';
import FormatAmount from './FormatAmount';
import FormattedDate from './FormattedDate';
import { getDueInfo } from '../utils/recurrenceFunctions';	


// Ionic components
import { 
  IonIcon,
  IonNote, 
  IonRouterLink 
} from '@ionic/react';

import { alertCircle, warning, checkmarkCircle, stopCircle } from 'ionicons/icons';


// Styles
import '../Main.css';
import './ReccurrenceItem.css'; 


interface ReccurrenceItemProps {
  seriesId: string;
  categoryIcon: string;
  categoryColor: string; 
  categoryName: string;
  accountName: string;
  expenseNote: string; 
  expenseAmount: number; 
  startDate: Date; 
  endDate?: string | null;
  expenseCurrencyCode: string;
  totalInstallments?: number;
  interval: number;
  unit: string;
  autoLogged?: boolean;
  nextDueDate: string |null;
  isActive: number;
  lastLoggedDate: string;
  amountVaries: boolean;
  owner?: string;
}

const ReccurrenceItem: React.FC<ReccurrenceItemProps> = ({
  seriesId,
  categoryIcon,
  categoryColor,
  categoryName,
  accountName,
  expenseNote,
  expenseAmount,
  startDate,
  endDate,
  expenseCurrencyCode,
  totalInstallments,
  interval,
  unit,
  autoLogged,
  nextDueDate,
  isActive,
  lastLoggedDate,
  amountVaries,
  owner
}) => {  
  const { t } = useTranslation();
  const { user } = useUser();

  const borderColor =
    user?.owner === owner
      ? 'var(--ion-color-primary)'
      : 'var(--ion-color-medium)';
  
  let color = isActive === 1 ? categoryColor : 'neutral';
  const frequencyMap = {
    month: 'monthly',
    week: 'weekly',
    year: 'yearly'
  };
  
  const frequencyKey = frequencyMap[unit as keyof typeof frequencyMap];
  const frequencyLabel = t(`date.${frequencyKey}`); 

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
  
  const dueInfo = getDueInfo(nextDueDate);  

  return (
     <IonRouterLink routerLink={`/app/viewrecurrence/${seriesId}`} routerDirection="forward">
      <div 
        className='transaction reccurrence'
        style={{ '--right-border-color': borderColor } as React.CSSProperties}
      > 
        <div className='left-col'>
          <CategoryIcon iconName={categoryIcon} categoryColor={color} autoLogged={autoLogged} isTransaction={true} />
        </div>
        <div className='center-col'>
					<div className='flex-ellipsis'>
						{/* Expense note */}
            {expenseNote ? (
              <div className='reccurrence-title'> 
                {expenseNote}
              </div>
            ) : (
              <IonNote>{t('common.no_description')}</IonNote>
            )}
          </div>


					<ul className='reccurrence-list-data'>  
						<li>{categoryName}</li>
						<li>{accountName === "Cash" ? t('accounts.default_account_name') : accountName}</li>  
            <li>
              {t(`date.frequency.${unit}`, { count: interval })}
              {typeof totalInstallments === 'number' && ` x ${totalInstallments}`}
              {endDate && (
                <>
                  {t('expenses.config_until')}{" "}
                  {new Date(endDate).toLocaleDateString()}
                </>
              )}
            </li>
					</ul>

        </div>
        <div className='right-col'>
          <div className={`expense-data ${amountVaries ? 'estimated-amount' : ''}`}>
            {isActive && amountVaries ? (
              <span className='note'>(est)</span>
            ) : (
              <span className='note'></span>
            ) }
            <FormatAmount amount={expenseAmount/100} currencyCode={expenseCurrencyCode} />  
          </div>
          {isActive && nextDueDate ? (
            <>
              <FormattedDate date={new Date(nextDueDate)} format="compact" />
              <div className='due-data'>
                <div className={`status-label ${dueInfo.className}`}>
                  <span className="status-text">
                    <IonIcon icon={getIcon(dueInfo.className)} />
                    {isActive === 2 ? `Finalized with ${dueInfo.label}` : dueInfo.label}  
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <FormattedDate date={new Date(lastLoggedDate)} format="compact" />
              <div className='due-data'>
                <div className={`status-label ${dueInfo.className}`}> 
                  <span className="status-text">
                    <IonIcon icon={getIcon(dueInfo.className)}/>
                    {dueInfo.label}
                  </span>
                </div>
              </div>
            </>
          )}
          
        </div>
      </div>
     </IonRouterLink>
  );
  }

export default ReccurrenceItem;