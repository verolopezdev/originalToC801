// context/DatePickerContext.tsx
import React, { createContext, useContext, useState } from 'react';
import DatePickerModal from '../components/DatePickerModal';

interface DatePickerOptions { 
  minDate?: Date;
  maxDate?: Date;
}

interface DatePickerContextValue {
  openDatePicker: (initialDate: Date, options?: DatePickerOptions) => Promise<string | null>;
}

// 🟢 Define defaults OUTSIDE so they are stable
export const getDefaultMinDate = (): Date => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d;
};

export const getDefaultMaxDate = (): Date => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 10);
  return d;
};

const DatePickerContext = createContext<DatePickerContextValue | undefined>(undefined);

export const useDatePicker = () => {
  const ctx = useContext(DatePickerContext);
  if (!ctx) throw new Error('useDatePicker must be used within DatePickerProvider');
  return ctx;
};

export const DatePickerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(new Date());
  const [minDate, setMinDate] = useState<Date>(getDefaultMinDate);
  const [maxDate, setMaxDate] = useState<Date>(getDefaultMaxDate);
  const [resolver, setResolver] =
    useState<(date: string | null) => void>(() => () => {});

  const openDatePicker = (
    date: Date, 
    options?: DatePickerOptions
  ): Promise<string | null> => {
    setInitialDate(date);
    setMinDate(options?.minDate ?? getDefaultMinDate());
    setMaxDate(options?.maxDate ?? getDefaultMaxDate());
    setIsOpen(true);

    return new Promise<string>((resolve) => {
      setResolver(() => resolve);
    });
  };


  const handleDismiss = () => {
    resolver(null);
    setIsOpen(false);
  };

  const handleSelect = (date: Date) => {
    resolver(date.toISOString());
    setIsOpen(false);
  };

  return (
    <DatePickerContext.Provider value={{ openDatePicker }}>
      {children}
      <DatePickerModal
        isOpen={isOpen}
        initialDate={initialDate}
        minDate={minDate}
        maxDate={maxDate}
        onDismiss={handleDismiss}
        onSelect={handleSelect}
      />
    </DatePickerContext.Provider>
  );
};
