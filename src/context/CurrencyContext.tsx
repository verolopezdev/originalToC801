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



/**
 * Temporary fallback used while the settings record is loading.
 *
 * The application should normally replace this immediately with the user's
 * persisted default currency from the database.
 */
export const DEFAULT_CURRENCY: CurrencyType = {
  name: "US Dollar",
  code: "USD",
  symbol: "$",
  locale: "en-US",
  thousandSeparator: ",",
  decimalSeparator: ".",
};



/**
 * Returns the single user settings record.
 *
 * IMPORTANT:
 * Dexie Cloud uses UUIDs as primary keys, so we cannot use:
 *
 *   db.userSettings.get("settings")
 *
 * because "settings" is the value of the `key` field, not the primary key.
 * Instead we query by the indexed `key` property.
 */
const getSettings = () =>
  db.userSettings
    .where("key")
    .equals("settings")
    .first();

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const defaultLocaleRef = useRef("en-US");

  /**
   * Live subscription to the user settings.
   *
   * Whenever the settings record changes, Dexie automatically re-runs
   * getSettings() and React re-renders this provider.
   */
  const settings = useLiveQuery(getSettings, []);

  const alternativeCurrencies = useLiveQuery(
    () => db.alternativeCurrencies.toArray(),
    []
  );


  /**
   * Builds the currency object exposed by the context.
   *
   * This object is derived from the database settings plus the list of
   * alternative currencies.
   *
   * A fallback currency is provided only while the settings record is still
   * loading during app startup.
   */
  const currency = useMemo<Currency>(() => {
    const defaultCurrency =
      settings?.defaultCurrency ?? DEFAULT_CURRENCY;
  
    const travelCurrency =
      settings?.travelCurrency ?? null;
  
    const isTravelMode =
      settings?.isTravelMode ?? false;
  
    return {
      defaultCurrency,
      travelCurrency,
      isTravelMode,
      alternativeCurrencies: alternativeCurrencies ?? [],
      actualCurrency:
        isTravelMode && travelCurrency
          ? travelCurrency
          : defaultCurrency,
    };
  }, [settings, alternativeCurrencies]);


  /**
   * Convenience list used throughout the app.
   *
   * Combines:
   *   - the default currency
   *   - all alternative currencies
   *
   * and sorts them alphabetically by currency code.
   */
  const allSelectedCurrencies = useMemo(() => {

    const list = [
      ...(currency.defaultCurrency ? [currency.defaultCurrency] : []),
      ...(currency.alternativeCurrencies ?? []),
    ];

    return list.sort((a, b) => a.code.localeCompare(b.code));

  }, [currency]);



  /**
   * Stores the current default locale in a mutable ref.
   *
   * Using a ref allows non-React code to read the latest locale without
   * triggering React re-renders.
   */
  useEffect(() => {
    defaultLocaleRef.current = currency.defaultCurrency.locale;
  }, [currency.defaultCurrency]);


  
  /**
   * Generic helper that updates one or more user settings.
   *
   * Only the properties present in `updates` are written.
   * The existing record is preserved by spreading the current settings first.
   */
  const updateCurrency = async (updates: Partial<Currency>) => {
    const settings = await getSettings();

    if (!settings) {
      console.error("User settings not found.");
      return;
    }

    await db.userSettings.put({
      ...settings,
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



  /**
   * Changes the application's default currency.
   *
   * If Travel Mode is disabled, the actual currency also becomes the new
   * default currency.
   *
   * If Travel Mode is enabled, the actual currency remains unchanged because
   * it is controlled by the selected travel currency.
   */
  const setDefaultCurrency = async (newCurrency: CurrencyType) => {
    const settings = await getSettings();
  
    if (!settings) {
      throw new Error("Settings record not found.");
    }
  
    await db.userSettings.put({
      ...settings,
      defaultCurrency: newCurrency,
      actualCurrency: settings.isTravelMode
        ? settings.actualCurrency
        : newCurrency,
    });
  };

  

  /**
   * Updates only the current working currency.
   *
   * This is the currency used when creating new expenses and may differ from
   * the default currency while Travel Mode is active.
   */
  const updateActualCurrency = async (newCurrency: CurrencyType) => {
    const settings = await getSettings();
  
    if (!settings) {
      console.error("User settings not found.");
      return;
    }
  
    await db.userSettings.put({
      ...settings,
      actualCurrency: newCurrency,
    });
  };



  /**
   * Enables Travel Mode.
   *
   * The selected travel currency becomes both:
   *   - the stored travel currency
   *   - the current working currency
   */
  const updateTravelCurrency = async (newCurrency: CurrencyType) => {
    const settings = await getSettings();
  
    if (!settings) {
      console.error("User settings not found.");
      return;
    }
  
    await db.userSettings.put({
      ...settings,
      travelCurrency: newCurrency,
      actualCurrency: newCurrency,
      isTravelMode: true,
    });
  };



  /**
   * Disables Travel Mode.
   *
   * The travel currency is cleared and the working currency returns to the
   * default currency.
   */
  const clearTravelCurrency = async () => {
    const settings = await getSettings();
  
    if (!settings) return;
  
    await db.userSettings.put({
      ...settings,
      travelCurrency: null,
      actualCurrency: settings.defaultCurrency,
      isTravelMode: false,
    });
  };



  /**
   * Adds a selectable alternative currency.
   *
   * The currency is stored in its own table because multiple records can
   * exist for a user.
   */
  const addAlternativeCurrency = async (currency: CurrencyType) => {
    await db.alternativeCurrencies.put(currency);
  };



  /**
   * Removes an alternative currency by its primary key (currency code).
   */
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