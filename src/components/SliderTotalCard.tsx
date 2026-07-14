import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dayjs } from "dayjs";


// Custom hooks
import { useCurrency } from '../context/CurrencyContext';
import { useExpense } from '../context/ExpenseContext';


// App components
import CardFrecuencyPicker from './CardFrecuencyPicker';
import FormatAmount from './FormatAmount';


// Utility functions
import { getTotalExpensesForPeriod } from '../utils/getTotalExpensesByInterval';

// Styles
import './SliderCard.css';

interface SliderTotalCardProps {
  color: string;
  title: string;
  identifier: string;
  logo: string;
  selectedInterval: "weekly" | "monthly" | "yearly";
  setSelectedInterval: (interval: "weekly" | "monthly" | "yearly") => void;
  currentDate: Dayjs;
  accountId?: string;
  start: Dayjs; 
  end: Dayjs;   
}


const SliderTotalCard: React.FC<SliderTotalCardProps> = ({ 
  color, 
  title, 
  identifier, 
  logo, 
  selectedInterval, 
  setSelectedInterval,
  currentDate,
  accountId,
  start,
  end  
}) => {
  const { currency } = useCurrency();
  const { t } = useTranslation();
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const { checkExpense } = useExpense(); // Access the addExpense function from the context

  useEffect(() => {
    const fetchTotal = async () => {
      try {
        let total = 0;  
        
        if(accountId) {
          total = await getTotalExpensesForPeriod(start, end, accountId);   
        } else {
          total = await getTotalExpensesForPeriod(start, end);
        }
        
        setTotalAmount(total);
      } catch (err) {
        console.error("Error loading total expenses:", err);
        setTotalAmount(0);
      }
    };

    fetchTotal(); 
  }, [selectedInterval, start, end, checkExpense, title]); // Dependency array includes `currentDate`


  return (
    <div className="card-container">
      <div className={`slider-card ${color}`}> 
        <div className="card-bgk">
          {/* Account icon */}
          <div className="bgk-icon-default-card">
            <i className={`fa-solid ${logo}`}></i>    
          </div>

          {/* Top bar */}
          <div className='top-bar'>
            <div className='card-data'> 
              {/* Account name */}
              <div className="card-title">
                {(title === "Cash" ? t('accounts.default_account_name') : title) || t('accounts.card_name')}
              </div>

              {/* Account identifier */}
              <div className="card-identifier">
                {identifier}
              </div>
            </div> 

            <div>
             <CardFrecuencyPicker
                selectedInterval={selectedInterval}
                setSelectedInterval={setSelectedInterval}
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div className='bottom-bar'>
            <div className='card-amount'>
             {currency.defaultCurrency?.code ? (
                <FormatAmount
                  amount={(totalAmount ?? 0) /100}
                  currencyCode={currency.defaultCurrency.code}
                />
              ) : (
                <span>$0.00*</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SliderTotalCard;
