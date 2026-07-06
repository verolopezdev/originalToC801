import React from 'react';
import { useCurrency } from '../context/CurrencyContext';

const getCurrencySymbol = (locale: string, currencyCode: string): string => {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(1);

  const currencyPart = parts.find(p => p.type === 'currency');
  return currencyPart?.value || currencyCode; // fallback to code
};

interface AmountDisplayProps {
  amount: number;
  locale: string;
  currencyCode: string;
}

const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  locale,         
  currencyCode,          
}) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return <div>-</div>; // or "Invalid amount"
  }

  if (!locale || !currencyCode) {
    return <div>-</div>;
  }

  const { currency } = useCurrency(); // Access user context
  const appCurrencyCode = currency?.defaultCurrency.code || '';


  const formattedPrice = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);

  const showCurrencyCodePrefix = currencyCode !== appCurrencyCode;

  return (
    <div>
      {showCurrencyCodePrefix && <span className='exchange-currency'>{currencyCode} </span>}
      {formattedPrice}
    </div>
  );
};

export default AmountDisplay;
