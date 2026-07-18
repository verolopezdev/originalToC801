import { Preferences } from '@capacitor/preferences';
import { CurrencyType } from "../context/CurrencyContext"; // adjust import
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";


export type ExchangeRates = {
  baseCurrency: string;
  timestamp: number;
  currencies: {
    [currencyCode: string]: number;
  };
};

const EXCHANGE_RATES_FILE = "exchange-rates.json";
const EXCHANGE_KEY = "exchangeRates";
const primaryUrl = "https://exchangerate.datasur.net.ar/Exchange-rates/";
const fallbackUrl = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/";


/**
 * Downloads the latest exchange rates using the configured base currency and
 * persists them to the local filesystem.
 *
 * Process:
 * 1. Attempts to fetch rates from the primary API.
 * 2. If the primary API fails (network error, invalid response, non-200 status),
 *    automatically falls back to the secondary API.
 * 3. Normalizes all currency codes to uppercase.
 * 4. Ensures the base currency is always present with a rate of 1.
 * 5. Creates an ExchangeRates object with:
 *    - baseCurrency
 *    - timestamp (download time)
 *    - currencies (currency → rate map)
 * 6. Saves the data to the exchange rates file in Capacitor's Data directory.
 * 7. Immediately performs a verification read to confirm the file was written
 *    successfully and logs the result.
 *
 * Throws:
 * - If both APIs fail.
 * - If either API returns an unexpected format.
 * - If writing the exchange rates file fails.
 *
 * @param baseCurrency ISO currency code to use as the base currency (e.g. "USD", "EUR", "ARS").
 * @returns The downloaded and persisted ExchangeRates object.
 * 
 * Important:
// Rates are always stored relative to the user's selected base currency.
// Example:
// baseCurrency = "USD"
// currencies["EUR"] = 0.85
// currencies["ARS"] = 1200
//
// When the base currency changes, a completely new set of rates must be
// downloaded because all stored rates are relative to the base currency.
 */
export const downloadAndSaveExchangeRates = async (
  baseCurrency: string
): Promise<ExchangeRates> => {
  // Normalize currency code for APIs that require different casing.
  const baseUpper = baseCurrency.toUpperCase();
  const baseLower = baseCurrency.toLowerCase();

  // Stores the final normalized currency → rate mapping.
  let parsedRates: Record<string, number> = {};

  try {
    // Primary exchange rate provider.
    const response = await fetch(`${primaryUrl}${baseUpper}`);

    if (!response.ok) {
      throw new Error(`Primary API failed: ${response.status}`);
    }

    const data = await response.json();

    console.log(
      "Primary API data received:",
      Object.keys(data.rates ?? {}).length,
      "rates"
    );

    // Validate expected response structure.
    if (!data.rates) {
      throw new Error("Invalid primary API format");
    }

    // Normalize all currency codes to uppercase for consistent storage.
    for (const [currency, rate] of Object.entries(data.rates)) {
      parsedRates[currency.toUpperCase()] = parseFloat(rate as string);
    }

  } catch (primaryError) {
    // If the primary provider is unavailable, attempt the fallback provider.
    console.warn(
      "Primary API failed. Trying fallback...",
      primaryError
    );

    console.log(
      "Calling fallback API:",
      `${fallbackUrl}${baseLower}.json`
    );

    const response = await fetch(
      `${fallbackUrl}${baseLower}.json`
    );

    if (!response.ok) {
      throw new Error(`Fallback API failed: ${response.status}`);
    }

    const data = await response.json();

    const rates = data[baseLower];

    console.log(
      "Fallback API data received:",
      Object.keys(rates ?? {}).length,
      "rates"
    );

    // Validate expected response structure.
    if (!rates) {
      throw new Error("Invalid fallback API format");
    }

    // Normalize all currency codes to uppercase for consistent storage.
    for (const [currency, rate] of Object.entries(rates)) {
      parsedRates[currency.toUpperCase()] = Number(rate);
    }
  }

  // Ensure the base currency is always present in the rates map.
  parsedRates[baseUpper] = 1;

  // Create the exchange rates object that will be persisted locally.
  const exchangeRates: ExchangeRates = {
    baseCurrency: baseUpper,
    timestamp: Date.now(),
    currencies: parsedRates,
  };

  // Persist rates to the app's private data directory.
  await Filesystem.writeFile({
    path: EXCHANGE_RATES_FILE,
    directory: Directory.Data,
    data: JSON.stringify(exchangeRates),
    encoding: Encoding.UTF8,
  });

  console.log("Exchange rates file written successfully");

  try {
    // Immediate read-back verification to help diagnose filesystem issues.
    const verify = await Filesystem.readFile({
      path: EXCHANGE_RATES_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    console.log(
      "Verification read successful:",
      (verify.data as string).length,
      "bytes"
    );
  } catch (error) {
    // Log verification failures without blocking the download process.
    console.error(
      "Verification read failed immediately after write:",
      error
    );
  }

  return exchangeRates;
};




/**
 * Retrieves the timestamp of the currently stored exchange rates.
 *
 * The timestamp represents when the exchange rates were originally
 * downloaded and saved. It can be used to determine whether the
 * cached rates are still fresh or need to be updated.
 *
 * @returns Unix timestamp in milliseconds, or `null` if the rates
 *          cannot be loaded or no timestamp exists.
 */
export const getExchangeRatesTimestamp = async (): Promise<number | null> => {
  try {
    // Load the saved exchange rates from local storage.
    const exchangeRates = await loadExchangeRates();

    // Return the stored timestamp, or null if it doesn't exist.
    return exchangeRates?.timestamp ?? null;
  } catch {
    // Return null if the rates file cannot be loaded or parsed.
    return null;
  }
};



/**
 * Loads previously saved exchange rates from the app's data directory.
 *
 * The exchange rates are stored as a JSON file and are parsed into an
 * `ExchangeRates` object before being returned.
 *
 * @returns The parsed exchange rates object, or `null` if the file
 *          does not exist, cannot be read, or contains invalid JSON.
 */
export const loadExchangeRates = async (): Promise<ExchangeRates | null> => {
  try {
    // Read the exchange rates file from the app's local data directory.
    const result = await Filesystem.readFile({
      path: EXCHANGE_RATES_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    // Convert the stored JSON string back into an ExchangeRates object.
    return JSON.parse(result.data as string);
  } catch (error) {
    // Handles cases where the file doesn't exist, cannot be read,
    // or contains invalid JSON.
    console.error("Failed to load exchange rates", error);
    return null;
  }
};


/**
 * Updates the saved exchange rates based on the user's current
 * currency configuration.
 *
 * The full exchange rates file may contain rates for many currencies,
 * but only the base currency and the user's selected alternative
 * currencies are kept and saved to PREFERENCES. This reduces the
 * amount of stored data and ensures the app only works with currencies
 * that are currently in use.
 *
 * The original timestamp is preserved so the app can determine when
 * the rates were last downloaded.
 *
 * @param baseCurrency - User's selected base currency.
 * @param alternativeCurrencies - Additional currencies enabled by the user.
 * @returns The filtered exchange rates object that was saved.
 */
export const updateSavedExchangeRates = async (
  baseCurrency: CurrencyType,
  alternativeCurrencies: CurrencyType[]
): Promise<ExchangeRates> => {
  console.log(
    "---> [getExchangeRates] ",
    baseCurrency,
    alternativeCurrencies
  );

  // Load the complete exchange rates file.
  const file = await Filesystem.readFile({
    path: EXCHANGE_RATES_FILE,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });

  const fullRates: ExchangeRates = JSON.parse(
    file.data as string
  );

  const parsedRates: Record<string, number> = {};

  // The base currency always has a rate of 1 relative to itself.
  parsedRates[baseCurrency.code] = 1;

  // Keep only rates for currencies currently configured by the user.
  for (const currency of alternativeCurrencies) {
    const rate =
      fullRates.currencies[currency.code];

    if (rate !== undefined) {
      parsedRates[currency.code] = rate;
    }
  }

  // Create a filtered exchange rates object while preserving
  // the original download timestamp.
  const newRates: ExchangeRates = {
    baseCurrency: baseCurrency.code,
    timestamp: fullRates.timestamp,
    currencies: parsedRates,
  };

  // Save the filtered rates to preferences for quick access.
  await Preferences.set({
    key: EXCHANGE_KEY,
    value: JSON.stringify(newRates),
  });

  console.log("[getExchangeRates] - Rates in preferences updated.");

  return newRates;
};


export const getFlagImage = (currencyItem: any) => {
  if (currencyItem.code === 'EUR') {
    return '/assets/flags/eu.svg';
  }

  return `/assets/flags/${currencyItem.locale.split('-')[1].toLowerCase()}.svg`;
};
