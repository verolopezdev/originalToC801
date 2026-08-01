import React, { createContext, useContext, useEffect, useMemo, useRef, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

// Define currency data type
export interface CurrencyType {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  thousandSeparator: string;
  decimalSeparator: string;
}

interface Currency {
  isTravelMode: boolean;
  defaultCurrency: CurrencyType;
  travelCurrency: CurrencyType | null;
  alternativeCurrencies: CurrencyType[];
  actualCurrency: CurrencyType;
}

interface CurrencyContextType {
  currency: Currency;
  allSelectedCurrencies: CurrencyType[];
  defaultLocaleRef: React.RefObject<string>;

  updateCurrency: (updates: Partial<Currency>) => Promise<void>;
  setDefaultCurrency: (currency: CurrencyType) => Promise<void>;
  updateActualCurrency: (currency: CurrencyType) => Promise<void>;
  addAlternativeCurrency: (currency: CurrencyType) => Promise<void>;
  removeAlternativeCurrency: (code: string) => Promise<void>;
  updateTravelCurrency: (currency: CurrencyType) => Promise<void>;
  clearTravelCurrency: () => Promise<void>;
}



export const DEFAULT_CURRENCY: CurrencyType = {
  name: "US Dollar",
  code: "USD",
  symbol: "$",
  locale: "en-US",
  thousandSeparator: ",",
  decimalSeparator: ".",
};



const getUser = () => db.users.toCollection().first();

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const defaultLocaleRef = useRef("en-US");

  const user = useLiveQuery(getUser, []);

  const alternativeCurrencies = useLiveQuery(
    () => db.alternativeCurrencies.toArray(),
    []
  );


  const currency = useMemo<Currency>(() => {
    const defaultCurrency =
      user?.defaultCurrency ?? DEFAULT_CURRENCY;
  
    const travelCurrency =
      user?.travelCurrency ?? null;
  
    const isTravelMode =
      user?.isTravelMode ?? false;
  
    return {
      defaultCurrency,
      travelCurrency,
      isTravelMode,
      alternativeCurrencies: alternativeCurrencies ?? [],
      actualCurrency:
        user?.actualCurrency ??
        (isTravelMode && travelCurrency
          ? travelCurrency
          : defaultCurrency),
    };
  }, [user, alternativeCurrencies]);


  const allSelectedCurrencies = useMemo(() => {

    const list = [
      ...(currency.defaultCurrency ? [currency.defaultCurrency] : []),
      ...(currency.alternativeCurrencies ?? []),
    ];

    return list.sort((a, b) => a.code.localeCompare(b.code));

  }, [currency]);



  useEffect(() => {
    defaultLocaleRef.current = currency.defaultCurrency.locale;
  }, [currency.defaultCurrency]);


  
  const updateCurrency = async (updates: Partial<Currency>) => {
    const user = await getUser();
  
    if (!user) {
      console.error("User not found.");
      return;
    }
  
    await db.users.put({
      ...user,
      ...(updates.defaultCurrency && {
        defaultCurrency: updates.defaultCurrency,
      }),
      ...(updates.travelCurrency !== undefined && {
        travelCurrency: updates.travelCurrency,
      }),
      ...(updates.isTravelMode !== undefined && {
        isTravelMode: updates.isTravelMode,
      }),
    });
  };


  const setDefaultCurrency = async (newCurrency: CurrencyType) => {
    const user = await getUser();
  
    if (!user) {
      throw new Error("User not found.");
    }
  
    await db.users.put({
      ...user,
      defaultCurrency: newCurrency,
      actualCurrency: user.isTravelMode
        ? user.actualCurrency
        : newCurrency,
    });
  };
  

  const updateActualCurrency = async (newCurrency: CurrencyType) => {
    const user = await getUser();
  
    if (!user) {
      console.error("User not found.");
      return;
    }
  
    await db.users.put({
      ...user,
      actualCurrency: newCurrency,
    });
  };


  const updateTravelCurrency = async (newCurrency: CurrencyType) => {
    const user = await getUser();
  
    if (!user) {
      console.error("User not found.");
      return;
    }
  
    await db.users.put({
      ...user,
      travelCurrency: newCurrency,
      actualCurrency: newCurrency,
      isTravelMode: true,
    });
  };


  const clearTravelCurrency = async () => {
    const user = await getUser();
  
    if (!user) return;
  
    await db.users.put({
      ...user,
      travelCurrency: null,
      actualCurrency: user.defaultCurrency,
      isTravelMode: false,
    });
  };


  const addAlternativeCurrency = async (currency: CurrencyType) => {
    await db.alternativeCurrencies.put(currency);
  };



  const removeAlternativeCurrency = async (code: string) => {
    await db.alternativeCurrencies.delete(code);
  };



  return (
    <CurrencyContext.Provider
      value={{
        currency,
        allSelectedCurrencies,
        defaultLocaleRef,
        updateCurrency,
        setDefaultCurrency,
        updateActualCurrency,
        addAlternativeCurrency,
        removeAlternativeCurrency,
        updateTravelCurrency,
        clearTravelCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }

  return context;
};