import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrency } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext'

import {
  IonButtons,
  IonButton,
  IonDatetime,
  IonModal
} from '@ionic/react';
import './DatePicker.css';  
import '../Main.css';

interface DatePickerInternalProps {
  isOpen: boolean;
  initialDate: Date;
  minDate: Date;
  maxDate: Date;
  onDismiss: () => void;
  onSelect: (date: Date) => void;
}

// Helper to format date as YYYY-MM-DD in local time (no UTC conversion)
const toLocalDateString = (date: Date): string => {
  return date.toLocaleDateString('en-CA'); // e.g. 2025-09-19
};

function parseDateLocal(dateString: string): Date {
  // Works with "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" etc.
  const [datePart] = dateString.split('T'); // ignore time if present
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day); // ✅ local midnight
}

const DatePickerModal: React.FC<DatePickerInternalProps> = ({
  isOpen,
  initialDate,
  minDate,
  maxDate,
  onDismiss,
  onSelect
}) => {
  const { t } = useTranslation();
  
  const datetime = useRef<HTMLIonDatetimeElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const { currency } = useCurrency();
  const { user } = useUser();

  const firstDayOfWeek = user.weekStartDay === 'monday' ? 1 : 0;

  const locale = currency.defaultCurrency?.locale ?? 'en-US';

  // Convert min/max to local YYYY-MM-DD strings
  const minDateStr = toLocalDateString(minDate);
  const maxDateStr = toLocalDateString(maxDate);

  // Reset selected date each time modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialDate);
    }
  }, [isOpen, initialDate]);

  const reset = () => {
    datetime.current?.reset();
    setSelectedDate(initialDate);
  };

  const cancel = () => {
    datetime.current?.cancel();
    onDismiss();
  };

  const confirm = async () => {
    await datetime.current?.confirm();
    const value = datetime.current?.value;

    if (value) {
      const dateObj = parseDateLocal(value as string);
      if (!isNaN(dateObj.getTime())) {
        setSelectedDate(dateObj);
        onSelect(dateObj);
      } else {
        console.error('Invalid date:', value);
      }
    }
  };


  
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="date-picker-modal">
      <div className="centered-modal-content">
        <IonDatetime
          locale={locale}
          presentation="date"
          ref={datetime}
          value={toLocalDateString(selectedDate)} // ✅ Local date, no UTC shift
          min={minDateStr}
          max={maxDateStr}
          firstDayOfWeek={firstDayOfWeek}
        >
          <IonButtons slot="buttons">
            <IonButton color="danger" onClick={reset}>{t('common.reset')}</IonButton> 
            <IonButton color="primary" onClick={cancel}>{t('common.cancel')}</IonButton>
            <IonButton color="primary" onClick={confirm}>OK</IonButton> 
          </IonButtons>
        </IonDatetime>
      </div>
    </IonModal>
  );
};

export default DatePickerModal;
