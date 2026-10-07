import { db } from "../db";

/**
 * Service providing database maintenance and table management utilities.
 */
export const clearUserData = async (): Promise<void> => {
  console.log("🧹 Clearing local application tables...");

  await db.transaction(
    "rw",
    [
      db.users,
      db.accounts,
      db.categories,
      db.subcategories,
      db.expenses,
      db.trips,
      db.recurringSeries,
      db.alternativeCurrencies,
      db.historicCurrencyList,
    ],
    async () => {
      await Promise.all([
        db.users.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.subcategories.clear(),
        db.expenses.clear(),
        db.trips.clear(),
        db.recurringSeries.clear(),
        db.alternativeCurrencies.clear(),
        db.historicCurrencyList.clear(),
      ]);
    }
  );

  console.log("✅ Local application data cleared.");
};