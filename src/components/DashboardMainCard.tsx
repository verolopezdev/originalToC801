import React, { useEffect, useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useExpense } from '../context/ExpenseContext';

import { useTranslation } from 'react-i18next';
import { Dayjs } from "dayjs";


// Utility functions
import { getTotalExpensesForPeriod } from '../utils/getTotalExpensesByInterval';


// App components
import CardFrecuencyPicker from './CardFrecuencyPicker';
import FormatAmount from './FormatAmount';


// Styles
import './DashboardMainCard.css'; 


interface DashboardMainCardProps {
  selectedInterval: "weekly" | "monthly" | "yearly";
  setSelectedInterval: (interval: "weekly" | "monthly" | "yearly") => void;
  currentDate: Dayjs;
  start: Dayjs; 
  end: Dayjs;   
}

const DashboardMainCard: React.FC<DashboardMainCardProps> = ({ selectedInterval, setSelectedInterval, currentDate, start, end }) => {

  const { currency } = useCurrency();
  const { t } = useTranslation();
  const { checkExpense } = useExpense(); // Access the addExpense function from the context
  

  const [totalAmount, setTotalAmount] = useState<number>(0);


  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const total = await getTotalExpensesForPeriod(start, end);  
        setTotalAmount(total);
      } catch (err) {
        console.error("Error loading total expenses:", err);
        setTotalAmount(0);
      }
    };

    fetchTotal();
  }, [selectedInterval, currentDate, checkExpense]); // Dependency array includes `currentDate` 


  return (
    <div className='dashboard-main-card'>
      <div className="card-bgk">
        <div className="bgk-icon-card">
          <i className="fa-solid fa-landmark"></i>    
        </div>
        <div className='top-bar'> 
          <div className='card-title'>{t('common.expenses')}</div>
          <div>
            <CardFrecuencyPicker  
              selectedInterval={selectedInterval} 
              setSelectedInterval={setSelectedInterval}
            />
          </div>
        </div>
        <div className='bottom-bar'>
          {currency.defaultCurrency?.code ? (
            <FormatAmount 
              amount={(totalAmount ?? 0) /100}
              currencyCode={currency.defaultCurrency.code}
            />
          ) : (
            <span>$0.00</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardMainCard;
