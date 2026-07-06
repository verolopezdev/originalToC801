import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IonButtons, IonButton, IonDatetime } from '@ionic/react';
import './DatePicker.css';
import '../Main.css';
import { useCurrency } from '../context/CurrencyContext';

interface DatePickerProps {
  prevDate: Date;
  onDateChange: (date: Date) => void;
  disableUpTo?: Date;
  minDate?: Date; 
  maxDate?: Date;
}

function DatePicker({ prevDate, onDateChange, disableUpTo, minDate, maxDate }: DatePickerProps) {
  const { t } = useTranslation();
  const { currency } = useCurrency();

  const datetime = useRef<HTMLIonDatetimeElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(prevDate);
  const locale = currency.defaultCurrency?.locale ?? 'en-US';

  // ✅ Convert Date -> "YYYY-MM-DD" (date-only, no time zone shifts)
  const toDateOnlyISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ✅ Initial value for IonDatetime
  const localISOString = toDateOnlyISO(prevDate);


  const disableDatesUntil = disableUpTo ? toDateOnlyISO(disableUpTo) : undefined;

  // ✅ Reset to initial date
  const reset = () => {
    datetime.current?.reset();
    setSelectedDate(prevDate);
  };

  // ✅ Cancel and revert
  const cancel = () => {
    datetime.current?.cancel();
    onDateChange(prevDate);
  };

  // ✅ Confirm selection (normalize to local midnight)
  const confirm = async () => {
    await datetime.current?.confirm();
    const value = datetime.current?.value as string; // "YYYY-MM-DD"

    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day); // Local midnight
      setSelectedDate(dateObj);
      onDateChange(dateObj);
    } else {
      setSelectedDate(prevDate);
      onDateChange(prevDate);
    }
  };

  return (
    <IonDatetime
      locale={locale}
      presentation="date"
      ref={datetime}
      value={localISOString}
      min={minDate?.toISOString()} // Priority: disableUpTo > calculated min
      max={maxDate?.toISOString()} // Max from dueDate + range or default
    >
      <IonButtons slot="buttons">
        <IonButton color="danger" onClick={reset}>{t('common.reset')}</IonButton>
        <IonButton color="primary" onClick={cancel}>{t('common.cancel')}</IonButton>
        <IonButton color="primary" onClick={confirm}>OK</IonButton>
      </IonButtons>
    </IonDatetime>
  );
}

export default DatePicker;
