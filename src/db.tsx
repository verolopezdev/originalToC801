import Dexie, { type EntityTable } from 'dexie';
import { incrementChangeCount } from './services/BackupService'; // Adjust path as needed

// GLOBAL FLAGS
let isPopulating = false;
export const TABLE_NAMES = ['users', 'accounts', 'categories', 'subcategories', 'expenses', 'trips', 'historicCurrencyList', 'alternativeCurrencies', 'recurringSeries'];



// FOR TESTING PURPOSES to bypass the changes hooks on writing expenses ------
export let isSeeding = false;

export const setIsSeeding = (value: boolean) => {
  isSeeding = value;
};

/**
 * Wipes all data from the trackable tables for testing.
 * Uses the isSeeding flag to bypass backup hooks.
 */
export const clearAllData = async () => {
  try {
    // 1. Enable the bypass flag so hooks don't count these as "changes"
    setIsSeeding(true);

    // 2. Run deletion in a transaction
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(
        db.tables.map(table => table.clear())
      );
    });

    console.log("🗑️ Database cleared successfully.");
  } catch (error) {
    console.error("❌ Failed to clear database:", error);
    throw error;
  } finally {
    // 3. Always turn the flag back off
    setIsSeeding(false);
  }
};


/**
 * Completely destroys the database.
 * Use this to test the "First Load" or "Restore from File" scenarios.
 */
export const deleteDatabaseEntirely = async () => {
  try {
    console.log("Shutting down DB connections...");
    
    // 1. Tell Dexie to close and stop all pending operations
    db.close();

    // 2. Add a tiny delay to let the browser's IndexedDB engine 
    // settle the connection state before the delete command hits
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Delete the database
    // We use the global Dexie class here to ensure we aren't 
    // fighting with the instance we just closed
    await Dexie.delete('DB');

    console.log("🧨 Database 'DB' deleted from storage.");
  } catch (error) {
    console.error("❌ Failed to delete database:", error);
    throw error;
  }
};


/**
 * Deletes the first 3 records from the expenses table.
 * Useful for testing UI lists.
 */
export const deleteRecords = async () => {
  try {
    setIsSeeding(true); // Bypass backup hooks

    // 1. Get the IDs of the first 3 records
    const idsToDelete = await db.expenses.limit(10).primaryKeys();

    if (idsToDelete.length === 0) {
      console.log("No expenses found to delete.");
      return;
    }

    // 2. Bulk delete those IDs
    await db.expenses.bulkDelete(idsToDelete);

    console.log(`🗑️ Deleted ${idsToDelete.length} expenses.`);
  } catch (error) {
    console.error("❌ Failed to delete expenses:", error);
  } finally {
    setIsSeeding(false);
  }
};
// end for testing -----------------------------------------------------------


export interface DbCounts {
  totalRecords: number;
  tableCounts: Record<string, number>;
}

export const getLiveRecordCount = async (): Promise<DbCounts> => {
  const tableCounts = {
    users: await db.users.count(),
    accounts: await db.accounts.count(), 
    categories: await db.categories.count(),
    subcategories: await db.subcategories.count(),
    expenses: await db.expenses.count(),
    trips: await db.trips.count(),
    historicCurrencyList: await db.historicCurrencyList.count(),
    alternativeCurrencies: await db.alternativeCurrencies.count(),
    recurringSeries: await db.recurringSeries.count(), 
  };

  const totalRecords = Object.values(tableCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  return {
    totalRecords,
    tableCounts,
  };
};

interface Metadata {
  key: string;
  value: string;
}

export type SubscriptionPlan =
  | "free"
  | "monthly"
  | "quarterly"
  | "yearly";

/**
 * What each field is for
isPremium: What your app checks to enable or disable premium features.
subscriptionPlan: Which subscription the user has (monthly, quarterly, or yearly), useful for UI like "Current Plan: Yearly."
subscriptionProductId: The RevenueCat/App Store product ID (e.g. premium_yearly). This can help if you ever rename plans or need to distinguish between products.
subscriptionExpirationDate: Lets you show "Renews on July 15" or "Expired on..."
subscriptionLastVerified: Indicates when you last synchronized with RevenueCat, which can help with debugging or deciding when to refresh.
 */
export interface User {
  userId: number;
  name: string;
  lastName: string;
  email: string;
  avatar: string;
  interval: "weekly" | "monthly" | "yearly";
  showDisabledAccounts: boolean;
  showDisabledCategories: boolean;
  weekStartDay: "sunday" | "monday";
  birthdate: string;
  localInterval: "weekly" | "monthly" | "yearly";
  language: string;
  favourites: number;
  isPremium: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpirationDate: string | null;
}

interface Account {
  accountId: number;
  accountName: string;
  accountIdentifier: string;
  accountColor: string;
  accountLogo: string;
  activeAccount: boolean;
  userId: string;
  sortOrder: number;
}

interface Category {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  activeCategory: boolean;
  favouriteCategory: boolean;
  systemCategory: boolean;
  subcategories: boolean;
}

interface Subcategory {
  subcategoryId: number;
  subcategoryName: string;
  subcategoryColor: string;
  subcategoryIcon: string;
  activeSubcategory: boolean;
  favouriteSubcategory: boolean;
  parentCategoryId: number;
}

export interface Expense {
  expenseId: number;
  userId: number;
  dueDate?: string;
  deletionDate?: string;
  expenseDate: string;  
  expenseNote: string;
  accountId: number;
  categoryId: number;
  subcategoryId: number;
  expenseAmountDefault: number; 
  expenseAmountTrip: number;
  expenseAmountAlt: number; 
  expenseCurrencyCode: string; 
  expenseLocale: string; 
  tripId: number | null; 
  seriesId?: number; 
  installmentIndex?: number;      
  totalInstallments?: number;     
  autoLogged?: boolean; 
  isActive: number; 
}

export type FrequencyUnit = 'week' | 'month' | 'year';

export interface RecurringSeries {    
  seriesId: number;
  userId: number;
  startDate: string;                  
  interval: number;                   
  unit: FrequencyUnit;                
  totalOccurrences: number | null;    
  endDate: string | null;              
  isActive: number;                    
  logAutomatically: boolean;
  accountId: number;
  categoryId: number;
  subcategoryId: number;
  note: string;
  estimatedAmount: number;              
  amountDefault: number;               
  amountAlt: number;                   
  currencyCode: string;
  locale: string;
  lastLoggedDate: string;             
  lastLoggedInstallmentIndex: number; 
  originalNextDueDate: string | null;     
  nextDueDate: string | null;          
  moved?: Record<number, string>;     
}

export interface ParsedExpense extends Omit<Expense, 'expenseDate'> {
  expenseDate: Date;
}

interface Trip {
  tripId: number;
  tripName: string;
  tripIcon: string;
  fromDate: Date;
  toDate: Date;
  currencyCode: string;
}

interface HistoricCurrencyList {
  id: string;            
  currencies: string[];  
  updatedAt: number;     
}

export interface AlternativeCurrency {
  code: string;                 
  name: string;
  symbol: string;
  locale: string;
  decimalSeparator: string;
  thousandSeparator: string;
}

const db = new Dexie('DB') as Dexie & {
  metadata: EntityTable<Metadata, 'key'>;
  users: EntityTable<User, 'userId'>;
  accounts: EntityTable<Account, 'accountId'>;
  categories: EntityTable<Category, 'categoryId'>;
  subcategories: EntityTable<Subcategory, 'subcategoryId'>;
  expenses: EntityTable<Expense, 'expenseId'>;
  trips: EntityTable<Trip, 'tripId'>;
  historicCurrencyList: EntityTable<HistoricCurrencyList, 'id'>;
  alternativeCurrencies: EntityTable<AlternativeCurrency, 'code'>;
  recurringSeries: EntityTable<RecurringSeries, 'seriesId'>;
};

db.version(1).stores({
  metadata: 'key',
  users: '++userId, email',
  accounts: '++accountId, userId, sortOrder', 
  categories: '++categoryId, &categoryName',
  subcategories: '++subcategoryId, &subcategoryName, parentCategoryId',
  expenses: '++expenseId, isActive, userId, expenseDate, accountId, categoryId, subcategoryId, expenseCurrencyCode, tripId, [seriesId+expenseDate], [seriesId+installmentIndex], [seriesId+isActive+dueDate], [seriesId+dueDate]',
  trips: '++tripId, tripName, tripIcon, fromDate, toDate, currencyCode',
  historicCurrencyList: 'id',
  alternativeCurrencies: 'code',
  recurringSeries: 'seriesId, userId, startDate, interval, unit, totalOccurrences, isActive, lastLoggedDate, moved, categoryId, subcategoryId, accountId', 
});

// --- HOOK IMPLEMENTATION ---

const setupHooks = () => {
  // Tables we want to track for backups
  const trackableTables = ['expenses', 'categories', 'accounts', 'trips', 'recurringSeries'];

  // 1. Keep track of whether we've logged the bypass warning
  let hasLoggedBypass = false;

  trackableTables.forEach(tableName => {
    const table = db.table(tableName);

    const handleChange = () => {
      const isBypassed = isPopulating || isSeeding;

      if (isBypassed) {
        // 2. Only log if we haven't already logged it during this bypass cycle
        if (!hasLoggedBypass) {
          console.log(`⚠️ Hooks Bypassed (Not counting changes) - Seeding: ${isSeeding}`);
          hasLoggedBypass = true;
        }
      } else {
        // 3. Reset the lock when flags are false, so it can log again on the next seed/restore
        hasLoggedBypass = false;
        
        console.log("-> Counting change...");
        incrementChangeCount();
      }
    };

    table.hook('creating', handleChange);
    table.hook('updating', handleChange);
    table.hook('deleting', handleChange);
  });
};
// --- END HOOKS ---


db.on('ready', () => {
  console.log(`✅ [DB Status] Database ready.`); 
  // Initialize hooks
  setupHooks();
});


db.on("populate", (transaction) => {
  isPopulating = true; 
  console.log('⚠️ Hooks Bypassed (Not counting changes) - Seeding default data...');

  const installationId = crypto.randomUUID();

  transaction.table("metadata").add({
    key: "installationId",
    value: installationId,
  });

  transaction.table("metadata").add({
    key: "createdAt",
    value: Date.now().toString(),
  });

  transaction.table("users").add({
    userId: 1,
    name: "",
    lastName: "",
    email: "",
    avatar: "",
    interval: "monthly",
    showDisabledAccounts: true,
    showDisabledCategories: true,
    weekStartDay: "sunday",
    isPremium: false,
    subscriptionPlan: "free",
  });


  
  try {
  
    transaction.table("accounts").add({
      accountName: "Cash",
      accountIdentifier: "",
      accountColor: "cyan", 
      accountLogo: "fa-money-bill-1-wave", 
      activeAccount: true,
      userId: "user@email.com",
      sortOrder: 0,
    });

    const defaultCategories = [
      { name: "Categoryless", color: "categoryless", icon: "fa-bolt-lightning" },
      { name: "Housing", color: "red", icon: "fa-house" },
      { name: "Utilities", color: "redOrange", icon: "fa-bolt" },
      { name: "Groceries", color: "orange", icon: "fa-cart-shopping" },
      { name: "Transportation", color: "yellowOrange", icon: "fa-car" },
      { name: "Healthcare", color: "yellow", icon: "fa-suitcase-medical" },
      { name: "Communications", color: "yellowGreen", icon: "fa-phone" },
      { name: "Dining & Takeout", color: "cyan", icon: "fa-utensils" },
      { name: "Entertainment", color: "skyBlue", icon: "fa-film" },
      { name: "Shopping", color: "blue", icon: "fa-bag-shopping" },
      { name: "Fitness", color: "indigo", icon: "fa-dumbbell" },
      { name: "Personal Care", color: "violet", icon: "fa-scissors" },
      { name: "Pets", color: "magenta", icon: "fa-shield-dog" },
      { name: "Education", color: "pink", icon: "fa-book" },
      { name: "Travel", color: "crimson", icon: "fa-plane" },
    ];

    defaultCategories.forEach(cat => {
      transaction.table("categories").add({
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
        activeCategory: true,
        favouriteCategory: false,
        systemCategory: true,
        subcategories: false
      });
    });
  } finally {
    // Crucial: Use a small timeout or wait for the transaction to finish 
    // to ensure hooks don't fire the millisecond seeding ends.
    setTimeout(() => { isPopulating = false; }, 1000);
    console.log('🎉 Initial population executed.');
  }
});

export type { Account, Category, Subcategory, Trip };
export { db };
