import React, { useEffect, useRef, useState} from 'react';


// App components
import NumericKeypadModal from '../components/NumericKeypadModal';

// Styles
import '../Main.css';
import './AmountInput.css';

interface AmountInputProps {
  locale: string;
  decimalSeparator: string;
  thousandSeparator: string;
  currencySymbol: string;
  currencyCode: string;
  showCurrencyCode?: boolean;
  passedAmount?: number;
  onAmountChange: (amountInCents: number) => void; // Callback to parent
  readOnly?: boolean;
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


const AmountInput: React.FC<AmountInputProps> = ({ locale, decimalSeparator, thousandSeparator, currencySymbol, currencyCode, showCurrencyCode, passedAmount, onAmountChange, readOnly }) => {
  const amountRef = useRef<HTMLParagraphElement>(null);
  const [amount, setAmount] = useState(""); // Raw amount (what the user types)
  const [formattedAmount, setFormattedAmount] = useState<string>(""); // Formatted display value
  const [modalOpen, setModalOpen] = useState(false);
  const [symbolFirst, setSymbolFirst] = useState(true); 

  useEffect(() => {
    if (passedAmount !== undefined && passedAmount !== null) {
      setAmount(String(passedAmount/100));
    }
  }, [passedAmount]);

  // Format amount if currency changes
  useEffect(() => {
    if (amount !== "") {
      const newFormatted = formatAmount(amount);
      setFormattedAmount(newFormatted);
    }
  }, [amount, decimalSeparator, thousandSeparator, currencySymbol, symbolFirst]);

  // Get locale every time it changes
  useEffect(() => {
    if (locale) {
      const position = getSymbolPosition(locale, currencyCode);
      setSymbolFirst(position === 'before');
    }
  }, [locale]);

  
  // Manage amount input font size
  useEffect(() => {
    const adjustFontSize = () => {
      if (amountRef.current) {
        const containerWidth = amountRef.current.parentElement?.offsetWidth || 0;
        let fontSize = 64; // Starting size in pixels (equivalent to 4em)
        
        amountRef.current.style.fontSize = `${fontSize}px`;
        
        // Reduce font size if the text overflows
        while (amountRef.current.scrollWidth > containerWidth && fontSize > 16) {
          fontSize -= 2;
          amountRef.current.style.fontSize = `${fontSize}px`;
        }
      }
    };
  
    adjustFontSize();
    window.addEventListener("resize", adjustFontSize);
    return () => window.removeEventListener("resize", adjustFontSize);
  }, [formattedAmount]);

  // Update value and format value
  const handleAmountChange = (rawValue: string) => {

    setAmount(rawValue);
  
    const [intPart = "0", decPart = "00"] = rawValue.split('.');
    const decimal = decPart.length === 1 ? decPart + "0" : decPart.padEnd(2, "0");
  
    const amountInCents = Number(`${intPart}${decimal}`);
    onAmountChange(amountInCents);
  
    const displayValue = formatAmount(rawValue);
    setFormattedAmount(displayValue);
  };

  const formatAmount = (raw: string): string => {
    // If raw is empty, set it to '0'
    if (!raw.trim()) {
      raw = "0";
    }

    let [integerPart, decimalPart] = raw.split('.');
    if (!integerPart) integerPart = "0";
    if (!decimalPart) decimalPart = "00";
    if (decimalPart.length === 1) decimalPart += "0";
  
    // Ensure "0.xxx" is still valid
    if (raw.startsWith('.')) raw = '0' + raw;
  
    // Apply thousand separator
    let formatted = raw.replace('.', decimalSeparator);
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
    const display = symbolFirst
      ? `${currencySymbol} ${formatted}`
      : `${formatted} ${currencySymbol}`;
  
    return display;
  };
  
  
  return (
    <>
      <div 
        className='amount-container' 
        onClick={() => !readOnly &&  setModalOpen(true)}
      > 
        {/* 
        <div className={`amount ${readOnly ? 'disabled' : ''}`} ref={amountRef}>
          {formattedAmount || `${symbolFirst ? currencySymbol + ' ' : ''}0${symbolFirst ? '' : ' ' + currencySymbol}`}
        </div>  
        */} 
        <div
          className={`amount-number ${readOnly ? 'disabled' : ''}`}
          ref={amountRef}
        >
          {showCurrencyCode && (
            <span className="currency-code">
              {currencyCode}
            </span>
          )}

          {formattedAmount ||
            `${symbolFirst ? currencySymbol + ' ' : ''}0${
              symbolFirst ? '' : ' ' + currencySymbol
            }`}
        </div>
      </div>
      <NumericKeypadModal 
        isOpen={modalOpen}
        decimalSeparator={decimalSeparator}
        dotDisabled={false}
        initialValue={amount}
        maxDigits={9}
        onClose={() => setModalOpen(false)}
        onInputChange={(value) => { handleAmountChange(value)}}   
      />
    </>
  );
}

export default AmountInput;