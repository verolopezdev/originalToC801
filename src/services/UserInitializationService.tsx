import { db, User } from "../db";
import {
  CountryData,
  getCountryWithSeparators,
  loadCountries,
  detectDeviceCountry,
} from "../utils/countryUtils";

export const initializeUserFromCountry = async (
  user: User,
  country: CountryData
): Promise<User> => {
  const countryToSave = getCountryWithSeparators(country);

  const updatedUser: Partial<User> = {
    language: countryToSave.locale.split("-")[0],
    selectedCountry: countryToSave.country,

    defaultCurrency: {
      code: countryToSave.code,
      name: countryToSave.name,
      symbol: countryToSave.symbol,
      locale: countryToSave.locale,
      thousandSeparator: countryToSave.thousandSeparator,
      decimalSeparator: countryToSave.decimalSeparator,
    },

    actualCurrency: {
      code: countryToSave.code,
      name: countryToSave.name,
      symbol: countryToSave.symbol,
      locale: countryToSave.locale,
      thousandSeparator: countryToSave.thousandSeparator,
      decimalSeparator: countryToSave.decimalSeparator,
    },
  };

  await db.users.update(user.userId, updatedUser);

  return {
    ...user,
    ...updatedUser,
  };
};

export const initializeUserFromDeviceCountry = async (
  user: User
): Promise<User> => {
  const countries = await loadCountries();

  const country = await detectDeviceCountry(countries);

  if (!country) {
    throw new Error("Could not determine user's country.");
  }

  return initializeUserFromCountry(user, country);
};