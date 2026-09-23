import { Device } from '@capacitor/device';

export interface CountryData {
  name: string;
  code: string;
  locale: string;
  symbol: string;
  country: string;
  nativeName?: string;
  thousandSeparator: string;
  decimalSeparator: string;
  flag?: string;
}

export const getCountryWithSeparators = (
  country: CountryData
): CountryData => {
  const countryToSave = { ...country };

  const numberFormat = new Intl.NumberFormat(countryToSave.locale);
  const exampleFormatted = numberFormat.format(1234567.89);

  countryToSave.thousandSeparator = exampleFormatted
    .replace(/\d/g, '')
    .charAt(0);

  countryToSave.decimalSeparator = (1.1)
    .toLocaleString(countryToSave.locale)
    .substring(1, 2);

  return countryToSave;
};

export const detectDeviceCountry = async (
  countries: CountryData[]
): Promise<CountryData | undefined> => {
  if (countries.length === 0) return undefined;

  const { value: deviceLocale } = await Device.getLanguageTag();

  let matched = countries.find(
    country =>
      country.locale.toLowerCase() === deviceLocale?.toLowerCase()
  );

  if (!matched) {
    const language = deviceLocale?.split("-")[0] ?? "";

    matched = countries.find(
      country => country.locale.startsWith(language)
    );
  }

  return matched ?? countries[0];
};

export const loadCountries = async (): Promise<CountryData[]> => {
  const response = await fetch("/assets/countries.json");

  if (!response.ok) {
    throw new Error("Failed to load countries.");
  }

  return response.json();
};