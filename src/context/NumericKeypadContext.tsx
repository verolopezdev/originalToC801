import React, { createContext, useContext, useState, ReactNode } from 'react';  
import NumericKeypadModal from '../components/NumericKeypadModal';

interface KeypadOptions {
  initialValue: string;
  dotDisabled?: boolean;
  decimalSeparator?: string;
  maxDigits?: number;
  onInputChange?: (value: string) => void;
}

interface KeypadContextValue {
  openKeypad: (options: KeypadOptions) => Promise<string>;
}

const NumericKeypadContext = createContext<KeypadContextValue | undefined>(undefined);

export const NumericKeypadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<KeypadOptions>({
    initialValue: '',
    dotDisabled: false,
    decimalSeparator: '.',
    maxDigits: 9,
  });
  const [resolvePromise, setResolvePromise] = useState<(value: string) => void>();

  const openKeypad = (opts: KeypadOptions): Promise<string> => {
    setOptions({
      decimalSeparator: '.',
      dotDisabled: false,
      maxDigits: 9,
      ...opts,
    });
    setValue(opts.initialValue);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleClose = (val: string) => {
    setIsOpen(false);
    resolvePromise?.(val);
  };

  const handleInputChange = (val: string) => {
    setValue(val);
    options.onInputChange?.(val); // 👈 Call external onInputChange if provided
  };

  return (
    <NumericKeypadContext.Provider value={{ openKeypad }}>
      {children}
      <NumericKeypadModal
        isOpen={isOpen}
        dotDisabled={options.dotDisabled ?? false}
        decimalSeparator={options.decimalSeparator ?? '.'}
        initialValue={value}
        maxDigits={options.maxDigits}
        onClose={handleClose}
        onInputChange={handleInputChange}
      />
    </NumericKeypadContext.Provider>
  );
};

export const useNumericKeypad = (): KeypadContextValue => {
  const context = useContext(NumericKeypadContext);
  if (!context) {
    throw new Error('useNumericKeypad must be used within a NumericKeypadProvider');
  }
  return context;
};
