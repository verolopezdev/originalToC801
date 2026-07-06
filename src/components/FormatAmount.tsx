import React, { useEffect, useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import '../Main.css';

interface FormatAmountProps {
  amount: number;
  currencyCode: string;
  rate?: boolean;
}

const getSymbolPosition = (locale: string, currencyCode: string): 'before' | 'after' => {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol' 
  }).formatToParts(1);

  const symbolIndex = parts.findIndex(p => p.type === 'currency');
  const firstNumberIndex = parts.findIndex(p => p.type === 'integer' || p.type === 'decimal' || p.type === 'fraction');

  return symbolIndex < firstNumberIndex ? 'before' : 'after';
};

const FormatAmount: React.FC<FormatAmountProps> = ({ amount, currencyCode, rate }) => {
  const { currency } = useCurrency();
  const [formattedAmount, setFormattedAmount] = useState<string>(''); // Formatted display value
  const [symbolFirst, setSymbolFirst] = useState(true);
  const [locale, setLocale] = useState<string>('en-US');
  const [decimalSeparator, setDecimalSeparator] = useState<string>('.');
  const [thousandSeparator, setThousandSeparator] = useState<string>(',');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  
  const appCurrencyCode = currency?.defaultCurrency.code || '';
  const showCurrencyCodePrefix = currencyCode !== appCurrencyCode;

  // Set locale, decimal, thousand separator, and currency symbol when currency or currencyCode changes
  useEffect(() => {
    const alt = currency.alternativeCurrencies || [];
    const all = [currency.defaultCurrency, ...alt];
    const found = all.find(c => c.code === currencyCode);

    if (found) {
      setLocale(found.locale);
      setDecimalSeparator(found.decimalSeparator);
      setThousandSeparator(found.thousandSeparator);
      setCurrencySymbol(found.symbol);
    }
  }, [currency, currencyCode]);

  // Update symbolFirst based on the locale and currencyCode
  useEffect(() => {
    const position = getSymbolPosition(locale, currencyCode);
    setSymbolFirst(position === 'before');
  }, [locale, currencyCode]);

  // Format amount when any relevant state changes
  useEffect(() => {
    if (rate) {
      let formatted;

      if(amount < 1) {
        // Rate-specific formatting: fixed 5 decimal places, no grouping, keep symbol & code
        formatted = amount.toLocaleString(locale, {
          style: 'decimal',
          minimumFractionDigits: 5,
          maximumFractionDigits: 5,
          useGrouping: false,
        });
      } else {
        // Rate-specific formatting: fixed 5 decimal places, no grouping, keep symbol & code
        formatted = amount.toLocaleString(locale, {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: true,
        });
      }
  
      const display = symbolFirst
        ? `${currencySymbol} ${formatted}`
        : `${formatted} ${currencySymbol}`;
  
      setFormattedAmount(display);
      return;
    }
    
    // Normal amount formatting with grouping and locale-specific separators
    let formattedRaw = amount.toString();

    // Ensure the amount has at least two decimal places
    const [integerPart, decimalPart] = formattedRaw.split('.');

    // Default to '00' if no decimal part exists
    let formattedDecimalPart = decimalPart ? decimalPart : '00';
  
    // If only one decimal place, append another 0
    if (formattedDecimalPart.length === 1) {
      formattedDecimalPart += '0';
    }

    // Ensure that the formatted value always has exactly two decimal places
    let formattedAmount = `${integerPart}.${formattedDecimalPart}`;

    // Apply thousand separator and decimal separator
    formattedAmount = formattedAmount.replace('.', decimalSeparator); // Replace dot with the selected decimal separator
    formattedAmount = formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator); // Apply thousand separator

    // Display the currency symbol in the correct position
    const display = symbolFirst
      ? `${currencySymbol} ${formattedAmount}`
      : `${formattedAmount} ${currencySymbol}`;
  
    setFormattedAmount(display);
  
  }, [amount, decimalSeparator, thousandSeparator, symbolFirst, currencySymbol]);
  
  


  return (
    <>
      {showCurrencyCodePrefix && <span className='exchange-currency'>{currencyCode}</span>}
      {formattedAmount || `${symbolFirst ? currencySymbol + ' ' : ''}0${symbolFirst ? '' : ' ' + currencySymbol}`}
    </>
  );
};

export default FormatAmount;
