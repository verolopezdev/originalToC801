import React, { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { App as CapacitorApp } from '@capacitor/app';

import { useCurrency } from '../context/CurrencyContext'; // Import the useUser hook


const primaryUrl =
  "https://exchangerate.datasur.net.ar/Exchange-rates/"
const fallbackUrl =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/"; // this was primary

  //"https://latest.currency-api.pages.dev/v1/currencies/"; this was fallback

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EXCHANGE_KEY = "exchangeRates";

const ExchangeRatesUpdater: React.FC = () => {
  const { currency } = useCurrency();
  
  const baseCurrencyLower = currency.defaultCurrency.code.toLowerCase();
  const baseCurrencyUpper = currency.defaultCurrency.code.toUpperCase();

  const targetCurrenciesLower = Array.isArray(currency.alternativeCurrencies)
    ? currency.alternativeCurrencies.map((c) => c.code.toLowerCase())
    : [];

  const targetCurrenciesUpper = targetCurrenciesLower.map((code) => code.toUpperCase());

  // Check for update on first load and app resume
  useEffect(() => {
    if (targetCurrenciesLower.length === 0 || targetCurrenciesUpper.length === 0) return;
  
    const updateOnLoad = async () => {
      await checkAndUpdateRates(true);
    };
  
    updateOnLoad(); // On first load
  
    const onAppResume = () => {
      checkAndUpdateRates(); // Still okay unawaited, but ideally also async-safe
    };
  
    CapacitorApp.addListener('resume', onAppResume);
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [currency]);
    

  const fetchCurrencies = async (
    url: string,
    retryUrl?: string,
    isPrimary: boolean = true
  ) => {
    try {
      if (!navigator.onLine) return;
  
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Primary URL failed: ${response.status} ${response.statusText}`);
  
      const data = await response.json();
  
      let filteredCurrencies: { [key: string]: number } = {};
  
      if (isPrimary) {
        // Handle primary URL structure: { base, rates: { "AED": "0.003072" } }
        const rates = data.rates;
        if (!rates) throw new Error("Invalid primary format");
  
        filteredCurrencies = targetCurrenciesUpper.reduce((acc, curr) => {
          if (rates[curr]) {
            acc[curr] = parseFloat(rates[curr]); // Convert string to number
          }
          return acc;
        }, {} as { [key: string]: number });
  
      } else {
        // Handle fallback structure: { "ars": { "aed": 0.003 } }
        const baseKey = baseCurrencyLower;
        if (!data[baseKey]) throw new Error("Invalid fallback format");
  
        const baseRates = data[baseKey];
        filteredCurrencies = targetCurrenciesLower.reduce((acc, curr) => {
          if (baseRates[curr]) {
            acc[curr.toUpperCase()] = baseRates[curr];
          }
          return acc;
        }, {} as { [key: string]: number });
      }
  
      await saveCurrenciesToPreferences(filteredCurrencies, baseCurrencyUpper);
  
    } catch (err) {
      if (retryUrl) {
        console.warn("Primary URL failed, trying fallback...");
        fetchCurrencies(retryUrl, undefined, false);
      } else {
        console.warn("Failed to fetch currency data from both sources.", err);
      }
    }
  };
    

  // Save currencies to preferences
  const saveCurrenciesToPreferences = async (currencies: Record<string, number>, baseCurrencyUpper: string) => {
    try {
      // Add the base currency with value 1 (in uppercase key)
      currencies[baseCurrencyUpper] = 1;
  
      // Store the data in Preferences with a timestamp
      const timestamp = Date.now();
      const dataToStore = {
        baseCurrency: baseCurrencyUpper,
        timestamp,
        currencies
      };
  
      await Preferences.set({
        key: EXCHANGE_KEY,
        value: JSON.stringify(dataToStore)
      });
    } catch (error) {
      console.error("Error saving currencies to Preferences", error);
    }
  };
  

  const checkAndUpdateRates = async (forceUpdate: boolean = false) => {
    try {
      const result = await Preferences.get({ key: EXCHANGE_KEY });
      let lastUpdate: number | null = null;
  
      if (result.value) {
        const parsed = JSON.parse(result.value);
        lastUpdate = parsed.timestamp;
      
        if (lastUpdate != null) {
          const formattedDate = new Date(lastUpdate).toLocaleString();
        }
      }      
  
      const now = Date.now();
  
      if (forceUpdate || !lastUpdate || now - lastUpdate > ONE_DAY_MS) {
        const primary = `${primaryUrl}${baseCurrencyUpper}`;
        const fallback = `${fallbackUrl}${baseCurrencyLower}.json`;
        fetchCurrencies(primary, fallback, true);
      }
    } catch (error) {
      console.error("Error reading exchange rates from Preferences", error);
      // Fallback to fetch if something went wrong reading the cache
      const primary = `${primaryUrl}${baseCurrencyUpper}`;
      const fallback = `${fallbackUrl}${baseCurrencyLower}.json`;
      fetchCurrencies(primary, fallback, true);
    }
  };
    
  

  return null; // No UI
};

export default ExchangeRatesUpdater;