import React, { useState, useEffect } from 'react';
import { IonModal, IonButton } from '@ionic/react';
import { useCurrency } from '../context/CurrencyContext';

import './NumericKeypadModal.css';

interface NumericKeypadModalProps {
  isOpen: boolean;
  dotDisabled: boolean;
  decimalSeparator: string;
  initialValue: string;
  maxDigits?: number; // Optional maximum digit limit
  onClose: (value: string) => void;
  onInputChange: (value: string) => void;
}

const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  dotDisabled,
  decimalSeparator,
  initialValue,
  maxDigits,
  onClose,
  onInputChange,
}) => {
  const { currency } = useCurrency();
  const [value, setValue] = useState(initialValue);
  

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);


  const handleButtonClick = (digit: string) => {
    const [integerPart, decimalPart] = value.split('.');
  
    // Prevent multiple decimal separators
    if (digit === '.' && value.includes('.')) return;
  
    // Allow decimal separator only if there are up to 9 digits before it
    if (digit === '.' && integerPart.length > 9) return;
  
    // Limit integer part to 9 digits, but allow adding a decimal separator
    if (!value.includes('.') && integerPart.length >= 9 && digit !== '.') return;
  
    // Limit decimal part to 2 digits
    if (value.includes('.') && decimalPart?.length >= 2) return;
  
    const newValue = value + digit;
    setValue(newValue);
    onInputChange(newValue); // Notify parent of the updated value
  };
  
  

  const handleBackspace = () => {
    const newValue = value.slice(0, -1);
    setValue(newValue);
    onInputChange(newValue);
  };


  return (
    <IonModal
      isOpen={isOpen}
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      backdropDismiss={true}  
      className="sheet-modal key-pad"
      onIonModalDidDismiss={() => onClose(value)} // 👈 Handled safely by Ionic React wrapper
    >
      <div className="keypad-container">  
        <div className="keypad-grid">
          <IonButton fill="clear" onClick={() => handleButtonClick('1')}>1</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('2')}>2</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('3')}>3</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('4')}>4</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('5')}>5</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('6')}>6</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('7')}>7</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('8')}>8</IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('9')}>9</IonButton>
          <IonButton
            fill="clear"
            disabled={dotDisabled}
            onClick={() => handleButtonClick('.')}
          >
            {decimalSeparator}
          </IonButton>
          <IonButton fill="clear" onClick={() => handleButtonClick('0')}>0</IonButton>
          <IonButton fill="clear" onClick={handleBackspace}>⌫</IonButton>
          {/* <IonButton fill="clear" onClick={handleDone}>Done</IonButton> */}
        </div>
      </div>
    </IonModal>
  );
};

export default NumericKeypadModal;