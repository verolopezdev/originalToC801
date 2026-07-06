import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { db } from '../db';
import { Preferences } from '@capacitor/preferences';
//import { fetchAndSaveExchangeRates } from "../utils/getExchangeRates";

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
  updateCurrency: (updates: Partial<Currency>) => void;
  setDefaultCurrency: (currency: CurrencyType) => void;
  addAlternativeCurrency: (currency: CurrencyType) => void;
  removeAlternativeCurrency: (code: string) => void;
  updateTravelCurrency: (currency: CurrencyType) => void;
  clearTravelCurrency: () => void;
  updateActualCurrency: (currency: CurrencyType) => void;
  syncAlternativeCurrenciesFromDexie: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>({
    isTravelMode: false,
    defaultCurrency: { name: '', code: '', locale: '', symbol: '', thousandSeparator: '', decimalSeparator: '' },
    travelCurrency: null,
    alternativeCurrencies: [],
    actualCurrency: { name: '', code: '', locale: '', symbol: '', thousandSeparator: '', decimalSeparator: '' },
  });

  const defaultLocaleRef = useRef<string>('en-US');


  // Load from Preferences or fallback to mock data
  useEffect(() => {
    const loadCurrencyData = async () => {
      const { value } = await Preferences.get({ key: 'currency' });
      let currencyData;
  
      if (value) {
        currencyData = JSON.parse(value);
      } else {
        const response = await fetch('/mockCurrencyData.json');
        currencyData = await response.json();
        await Preferences.set({
          key: 'currency',
          value: JSON.stringify(currencyData),
        });
      }
  
      // Set ref before state to make sure it's ready
      if (currencyData.defaultCurrency?.locale) {
        defaultLocaleRef.current = currencyData.defaultCurrency.locale;
      }
  
      setCurrency(currencyData);
    };
  
    loadCurrencyData();
  }, []);


  // update the ref if locale changes dynamically
  useEffect(() => {
    if (currency.defaultCurrency.locale) {
      defaultLocaleRef.current = currency.defaultCurrency.locale;
    }
  }, [currency.defaultCurrency.locale]);


  // Persist currency to Preferences
  const persistCurrency = async (updatedCurrency: Currency) => {
    await Preferences.set({
      key: 'currency',
      value: JSON.stringify(updatedCurrency),
    });
  };


  // Sync alternative currencies from Dexie to Preferences when restoring db
  const syncAlternativeCurrenciesFromDexie = async () => {
    try {
      // 1. Fetch alternative currencies from Dexie:
      const alternativeCurrencies = await db.alternativeCurrencies.toArray();
  
      // 2. Merge into updated currency object
      const updated = {
        ...currency,  // Copy everything from the current currency object (...currency)
        alternativeCurrencies, // Replace the alternativeCurrencies field with the version you just read from the database
      };
  
      // 3. Set currency and persist it
      setCurrency(updated);
      await persistCurrency(updated);
    } catch (error) {
      console.error("Failed to sync currencies from Dexie:", error);
    }
  };
  

  const updateCurrency = (updates: Partial<Currency>) => {
    setCurrency((prev) => {
      const updated = { ...prev, ...updates };
      persistCurrency(updated);
      return updated;
    });
  };


  const setDefaultCurrency = (newDefaultCurrency: CurrencyType) => {
    setCurrency((prev) => {
      const updated = {
        ...prev,
        defaultCurrency: { ...prev.defaultCurrency, ...newDefaultCurrency },
      };
      persistCurrency(updated);
      return updated;
    });
  };

  // This function adds a new currency to the list of alternativeCurrencies in your app's state, persists to Preferences and saves it to Dexie.
  // You're defining an async function that takes a CurrencyType object called newCurrency
  const addAlternativeCurrency = async (newCurrency: CurrencyType) => {
    // You are updating the state using the React state updater function. The prev parameter gives you the previous currency state
    setCurrency((prev) => {
      const updated = {
        ...prev,   // Copying everything from the previous state prev (...prev)
        alternativeCurrencies: [
          ...(prev.alternativeCurrencies ?? []),   // prev.alternativeCurrencies ?? [] ensures that if it's null or undefined, you start with an empty array.
          newCurrency, // newCurrency is added at the end
        ],
      };
      persistCurrency(updated); 
      return updated;  // This returns the updated object to setCurrency
    });

  // Save to Dexie
  try {
    await db.transaction(
      'rw', 
      db.alternativeCurrencies,
      async (tx) => {
        await tx.alternativeCurrencies.put(newCurrency); // insert or update by `code` if the currency already exists, it will be updated.
      }
    );

  } catch (error) {
    console.error('Failed to save to Dexie:', error);
  }
};
  

  const removeAlternativeCurrency = async (code: string) => {
    setCurrency((prev) => {
      const updated = {
        ...prev,
        alternativeCurrencies: prev.alternativeCurrencies.filter((alt) => alt.code !== code),
      };
      persistCurrency(updated);
      return updated;
    });

    // Delete from Dexie
    try {
      await db.transaction(
        'rw', 
        db.alternativeCurrencies,
        async (tx) => {
          await tx.alternativeCurrencies.delete(code);
        }
      );

    } catch (error) {
      console.error('Failed to delete from Dexie:', error);
    }
  };


  const updateTravelCurrency = (newCurrency: CurrencyType) => {
    setCurrency((prev) => {
      const updated = {
        ...prev,
        travelCurrency: newCurrency,
        actualCurrency: newCurrency,
      };
      persistCurrency(updated);
      return updated;
    });
  };


  const clearTravelCurrency = () => {
    setCurrency((prev) => {
      const updated = {
        ...prev,
        travelCurrency: null,
        actualCurrency: prev.defaultCurrency,
      };
      persistCurrency(updated);
      return updated;
    });
  };


  const updateActualCurrency = (newCurrency: CurrencyType) => {
    setCurrency((prev) => {
      const updated = {
        ...prev,
        actualCurrency: newCurrency,
      };
      persistCurrency(updated);
      return updated;
    });
  };



  const allSelectedCurrencies: CurrencyType[] = [
    currency.defaultCurrency,
    ...(currency.alternativeCurrencies || [])
      .slice()
      .sort((a, b) => a.code.localeCompare(b.name)),
  ];

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        allSelectedCurrencies,
        defaultLocaleRef,
        updateCurrency,
        setDefaultCurrency,
        addAlternativeCurrency,
        removeAlternativeCurrency,
        updateTravelCurrency,
        clearTravelCurrency,
        updateActualCurrency,
        syncAlternativeCurrenciesFromDexie,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};