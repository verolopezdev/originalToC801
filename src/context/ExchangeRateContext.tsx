/**
 * This file does three main jobs:

  Provides exchange rates to React components through Context
  Keeps exchange rates updated and cached
  Allows non-React code to access exchange rates directly
 */
import React, { createContext, useContext, useEffect, useCallback, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from '@capacitor/core';
import {
  downloadAndSaveExchangeRates,
  updateSavedExchangeRates,
  loadExchangeRates,
  getExchangeRatesTimestamp,
} from "../utils/getExchangeRates";
import { useCurrency } from "./CurrencyContext"; // Adjust path as needed

type ExchangeRates = {
  baseCurrency: string;
  timestamp: number;
  currencies: Record<string, number>;
};

/**
{
  baseCurrency: "USD",
  timestamp: 1740000000000,
  currencies: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78,
    ARS: 1200
  }
}
  
  Meaning:
  1 USD = 0.92 EUR
  1 USD = 0.78 GBP
  1 USD = 1200 ARS
*/

/* 
Defines what components can access through the context. 
Any component using: const rates = useExchangeRates(); gets access to those values.
*/
type ExchangeRateContextType = {
  exchangeRates: ExchangeRates | null;
  refreshRates: (force?: boolean) => Promise<void>;
  lastUpdated: Date | null;
  outdated: boolean;
  getExchangeRate: (currencyCode: string) => number | null;
  convertCurrency: (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ) => number | null;
};

// Creates the React context. Initially: undefined until the Provider wraps the app.
const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

// One day constant Equals:86400000. Used to determine whether rates are stale.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;


// Global variables for access outside React
let latestExchangeRates: ExchangeRates | null = null;
let refreshRatesFn: ((force?: boolean) => Promise<void>) | null = null;

// Provider component: This wraps your application.
export const ExchangeRateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currency } = useCurrency();
  // Contains the currently loaded rates.
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Used to indicate: rates older than 24 hours
  const [outdated, setOutdated] = useState<boolean>(false);
 
  const altCodes = (currency.alternativeCurrencies ?? [])
    .map(c => c.code)
    .join(",");


  // Runs when the provider mounts and whenever the default currency changes.
  //
  // Responsibilities:
  // 1. Immediately refresh exchange rates using the current default currency.
  // 2. Register a Capacitor "resume" listener so rates are refreshed whenever
  //    the user returns to the app after it has been in the background.
  //
  // The listener is removed during cleanup to prevent duplicate listeners from
  // accumulating if the effect runs again or the provider unmounts.
  useEffect(() => {
    // Debugg log
    /*console.log(
      "[ExchangeRateContext UseEffect]",
      {
        defaultCurrency: currency.defaultCurrency.code,
        altCodes
      }
    );*/
  
    // Refresh rates immediately
    if (currency.defaultCurrency.code) {
      refreshRates();
    }
  
    // store the listener returned by Capacitor
    let resumeListener: PluginListenerHandle | null = null;
  
    // Create an async helper function that returns a Promise
    const setupListener = async () => {
      // Register the resume listener
      resumeListener = await CapacitorApp.addListener(
        // This event fires when the app returns to the foreground. 
        // Example: user opens your app, switches to WhatsApp, comes back
        "resume",
        // Callback executed on resume: runs every time the resume event occurs.
        () => {
          //console.log("[ExchangeRateContext Listener] Resume detected");
          // The idea is:
          // User may have left the app for hours.
          // Exchange rates may have changed.
          // When they come back, update them automatically.
          // So every resume triggers:
          refreshRates();
        }
      );
    };
  
    // Without this line, the function would merely exist.
    // This actually registers the listener.
    setupListener();
  
    // Cleanup function
    // React calls this cleanup: When component unmounts
    // or Before effect re-runs: if currency.defaultCurrency.code changes
    // React executes cleanup first, then runs the effect again.
    // Cleanup guarantees only one active listener exists.
    return () => {
      // Remove listener safely: if it exists, it runs
      resumeListener?.remove();
    };
  }, [currency.defaultCurrency.code]);


  // Keep the stored exchange rates file synchronized with the currently
  // selected alternative currencies.
  //
  // This runs whenever the list of alternative currency codes changes
  // (currency added, removed, or replaced). The existing rates file is
  // updated to include newly selected currencies and remove currencies
  // that are no longer needed.
  useEffect(() => {
    updateSavedExchangeRates(
      currency.defaultCurrency,
      currency.alternativeCurrencies ?? []
    );
  }, [altCodes]);


  const isOverOneDayOld = (ts: number): boolean => {
    return Date.now() - ts > ONE_DAY_MS;
  };
  

  /**
 * Refreshes exchange rates from local storage and downloads a new rates file
 * when the current data is missing, older than 24 hours, or when forced.
 *
 * Flow:
 * 1. Read the timestamp of the last downloaded exchange-rates.json file.
 * 2. Determine whether the cached rates are expired (> 24 hours old).
 * 3. If rates are expired (or forceUpdate is true):
 *    - Download a fresh exchange-rates.json file using the current default currency.
 *    - Rebuild and save the app's filtered exchange-rate data in Preferences.
 * 4. Load the latest rates from storage.
 * 5. Update React state and the module-level cache.
 * 6. Update UI metadata (lastUpdated and outdated status).
 *
 * The function is memoized with useCallback so event listeners and effects
 * can safely reuse the same function reference unless the default currency
 * or alternative currency list changes.
 *
 * @param forceUpdate When true, forces a download regardless of cache age.
 */
  const refreshRates = useCallback(async (forceUpdate = false) => {
    try {
      // Generate a short random id to make concurrent refresh logs easier to track.
      const id = Math.random().toString(36).slice(2, 7);
      //console.log(`[${id}] refreshRates start`);

      // Read the timestamp from the last downloaded exchange-rates.json file.
      const timestamp = await getExchangeRatesTimestamp();

      // Debug log
      /*console.log(
        "[ExchangeRateContext]",
        "timestamp:",
        timestamp,
        "expired:",
        !timestamp || Date.now() - timestamp > ONE_DAY_MS
      );*/
  
      // Rates are considered expired if no timestamp exists or if older than 24 hours.
      const expired =
        !timestamp ||
        Date.now() - timestamp > ONE_DAY_MS;

      /*console.log(
        `[${id}] timestamp=${timestamp} expired=${expired} force=${forceUpdate}`
      );*/
  
      // Download a fresh rates file when forced or when the cache is expired.
      if (forceUpdate || expired) {
        console.log(`[${id}] [ExchangeRateContext] ---> Downloading new rates json...`);
        await downloadAndSaveExchangeRates(
          currency.defaultCurrency.code
        );
        
        // Update stored data
        console.log(`[${id}] [ExchangeRateContext] ---> Updating Preferences...`);
        // Rebuild and save the subset of currencies used by the app.
        await updateSavedExchangeRates(
          currency.defaultCurrency,
          currency.alternativeCurrencies ?? []
        );
      }

  
      // Load the latest exchange rates from storage.
      const stored = await loadExchangeRates();
  
      setExchangeRates(stored);
      // Update module-level cache for non-React consumers.
      latestExchangeRates = stored;
  
      if (stored) {
        // Track when the currently loaded rates were generated.
        setLastUpdated(new Date(stored.timestamp));
        // Flag rates as outdated for UI warnings.
        setOutdated(isOverOneDayOld(stored.timestamp));
      }
    } catch (error) {
      console.error("refreshRates failed:", error);
    }
  }, [
    // altCodes is not used directly inside refreshRates, but it's intentionally included in the dependency array 
    // so a new callback is created whenever the alternative currency list changes. 
    // This allows any effects or listeners using refreshRates to pick up the updated currency configuration.
    currency.defaultCurrency.code,
    altCodes
  ]);
  
  
  
  // refreshRatesFn is a global variable pointing to the context’s refreshRates() function.
  refreshRatesFn = refreshRates; // 🟢 make it available outside React



  const getExchangeRate = (currencyCode: string): number | null => {
    //console.log("[ExchangeRateContext] - getExchangeRate executed...")
    if (!exchangeRates || !exchangeRates.currencies) return null;
    const rate = exchangeRates.currencies[currencyCode.toUpperCase()];
    return typeof rate === "number" ? rate : null;
  };
  

  
  /**
   * Converts an amount from one currency to another using the currently loaded
   * exchange rates.
   *
   * The conversion is performed in two steps:
   * 1. Convert the source amount to the base currency used by the rates file.
   * 2. Convert the base currency amount to the target currency.
   *
   * Returns null when:
   * - Exchange rates have not been loaded yet.
   * - Either currency code does not exist in the rates data.
   * - The source currency rate is invalid or zero.
   *
   * @param amount Amount to convert.
   * @param fromCurrency Source currency code (e.g. "USD").
   * @param toCurrency Target currency code (e.g. "EUR").
   * @returns Converted amount, or null if conversion cannot be performed.
   */
  const convertCurrency = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number | null => {
    //console.log("Convert currency...");

    // Cannot convert if rates have not been loaded.
    if (!exchangeRates || !exchangeRates.currencies) return null;

    // Look up exchange rates for both currencies.
    const fromRate = exchangeRates.currencies[fromCurrency.toUpperCase()];
    const toRate = exchangeRates.currencies[toCurrency.toUpperCase()];

    // Validate rates before attempting the conversion.
    if (
      typeof fromRate !== "number" ||
      typeof toRate !== "number" ||
      fromRate === 0
    ) {
      return null;
    }

    // Convert the source amount to the base currency.
    const baseAmount = amount / fromRate;

    // Convert from the base currency to the target currency.
    return baseAmount * toRate;
  };
  


  // Makes all these available to React components.
  return (
    <ExchangeRateContext.Provider
      value={{
        exchangeRates,
        refreshRates,
        lastUpdated,
        outdated,
        getExchangeRate, // used in new expense
        convertCurrency  // used in new expense
      }}
    >
      {children}
    </ExchangeRateContext.Provider>
  );
};

export const useExchangeRates = () => {
  const context = useContext(ExchangeRateContext);
  if (!context) throw new Error("useExchangeRates must be used within ExchangeRateProvider");
  return context;
};


// 🟢 NEW: safe to use anywhere (with auto-refresh)
/*
  This defines a function called getExchangeRateDirect.
  It is async because it might wait for refreshRatesFn() to finish fetching rates.
  It accepts currencyCode (like "USD" or "EUR").
  It returns either: a number (the exchange rate), or null (if we still don’t have rates even after refreshing)
*/
export const getExchangeRateDirect = async (currencyCode: string): Promise<number | null> => {
  /**
  This checks whether we already have exchange rates loaded in memory (latestExchangeRates is a global variable updated by the context).
  If latestExchangeRates is null, it means: the app just started, or no rates were fetched yet.
  */
  if (!latestExchangeRates) {
    /*
    This prints a warning to the console letting you know no rates were available, so it will try to refresh them.
    You should see this only once per app launch (or if rates were cleared).
    */
    console.warn("[ExchangeRateContext] No rates loaded yet, refreshing...");

    /*
    refreshRatesFn is a global variable pointing to the context’s refreshRates() function.
    If it exists, we call it and await its result — meaning:
    We tell the app: “Go fetch rates now and wait until they’re stored.”
    When refreshRates() finishes, it updates latestExchangeRates
    */
    if (refreshRatesFn) {
      await refreshRatesFn();
    } else {
      console.warn("[getExchangeRateDirect] No refreshRatesFn available.");
    }
  }

  /*
  We check again: after trying to refresh, do we have rates now?
  If still null, we just return null — meaning we couldn’t fetch them.
  */
  if (!latestExchangeRates) {
    console.error("[getExchangeRateDirect] Still no rates after refresh, returning null.");
    return null;
  }

  /*
  If we got this far, latestExchangeRates exists.
  We look up the currencyCode (converted to uppercase).
  If we find it, we return the numeric value.
  If we don’t find it, we return null (because of ?? null).
  */
  const rate = latestExchangeRates.currencies[currencyCode.toUpperCase()] ?? null;

  return rate;
};
