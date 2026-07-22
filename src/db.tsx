import Dexie, { type EntityTable } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { incrementChangeCount } from './services/BackupService';

// GLOBAL FLAGS
let isPopulating = false;
export const TABLE_NAMES = [
  'users',
  'accounts',
  'categories',
  'subcategories',
  'expenses',
  'trips',
  'historicCurrencyList',
  'alternativeCurrencies',
  'recurringSeries',
];

export let isSeeding = false;
export const CATEGORYLESS_ID = 'system_categoryless';

export const setIsSeeding = (value: boolean) => {
  isSeeding = value;
};

export const clearAllData = async () => {
  try {
    setIsSeeding(true);
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
    console.log("🗑️ Database cleared successfully.");
  } catch (error) {
    console.error("❌ Failed to clear database:", error);
    throw error;
  } finally {
    setIsSeeding(false);
  }
};

export const deleteDatabaseEntirely = async () => {
  try {
    console.log("Shutting down DB connections...");
    db.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await Dexie.delete('DB');
    console.log("🧨 Database 'DB' deleted from storage.");
  } catch (error) {
    console.error("❌ Failed to delete database:", error);
    throw error;
  }
};

export const deleteRecords = async () => {
  try {
    setIsSeeding(true);
    const idsToDelete = await db.expenses.limit(10).primaryKeys();

    if (idsToDelete.length === 0) {
      console.log("No expenses found to delete.");
      return;
    }

    await db.expenses.bulkDelete(idsToDelete);
    console.log(`🗑️ Deleted ${idsToDelete.length} expenses.`);
  } catch (error) {
    console.error("❌ Failed to delete expenses:", error);
  } finally {
    setIsSeeding(false);
  }
};

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

export type SubscriptionPlan = "free" | "monthly" | "quarterly" | "yearly";

export interface User {
  userId: string;
  realmId?: string;
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
  accountId: string;
  realmId?: string;
  accountName: string;
  accountIdentifier: string;
  accountColor: string;
  accountLogo: string;
  activeAccount: boolean;
  userId: string;
  sortOrder: number;
}

interface Category {
  categoryId: string;
  realmId?: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  activeCategory: boolean;
  favouriteCategory: boolean;
  systemCategory: boolean;
  subcategories: boolean;
}

interface Subcategory {
  subcategoryId: string;
  realmId?: string;
  subcategoryName: string;
  subcategoryColor: string;
  subcategoryIcon: string;
  activeSubcategory: boolean;
  favouriteSubcategory: boolean;
  parentCategoryId: string;
}

export interface Expense {
  expenseId: string;
  realmId?: string;
  userId: string;
  dueDate?: string;
  deletionDate?: string;
  expenseDate: string;
  expenseNote: string;
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  expenseAmountDefault: number;
  expenseAmountTrip: number;
  expenseAmountAlt: number;
  expenseCurrencyCode: string;
  expenseLocale: string;
  tripId: string | null;
  seriesId?: string;
  installmentIndex?: number;
  totalInstallments?: number;
  autoLogged?: boolean;
  isActive: number;
}

export type FrequencyUnit = 'week' | 'month' | 'year';

export interface RecurringSeries {
  seriesId: string;
  realmId?: string;
  userId: string;
  startDate: string;
  interval: number;
  unit: FrequencyUnit;
  totalOccurrences: number | null;
  endDate: string | null;
  isActive: number;
  logAutomatically: boolean;
  accountId: string;
  categoryId: string;
  subcategoryId: string;
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
  tripId: string;
  userId: string;
  realmId?: string;
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

// 1. Initialize Dexie with the addon attached so schema annotations (@) remain valid
const db = new Dexie('DB', { addons: [dexieCloud] }) as Dexie & {
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

export const initializeDatabase = async () => {
  await db.open();

  const userCount = await db.users.count();

  if (userCount === 0) {
    await seedInitialData();
  }
};

db.version(1).stores({
  metadata: 'key',
  users: '@userId, email, realmId',
  accounts: '@accountId, userId, sortOrder, realmId',
  categories: '@categoryId, &categoryName, realmId',
  subcategories: '@subcategoryId, &subcategoryName, parentCategoryId, realmId',
  expenses: '@expenseId, isActive, userId, expenseDate, accountId, categoryId, subcategoryId, expenseCurrencyCode, tripId, seriesId, realmId, [seriesId+expenseDate], [seriesId+installmentIndex], [seriesId+isActive+dueDate], [seriesId+dueDate]',
  trips: '@tripId, tripName, tripIcon, fromDate, toDate, currencyCode, realmId',
  historicCurrencyList: 'id',
  alternativeCurrencies: 'code',
  recurringSeries: '@seriesId, userId, startDate, interval, unit, totalOccurrences, isActive, lastLoggedDate, moved, categoryId, subcategoryId, accountId, realmId',
});

db.cloud.configure({
  databaseUrl: 'https://zxzf58e25.dexie.cloud',
  requireAuth: false,
  customLoginGui: false,
});

export const enableDexieCloud = (databaseUrl = 'https://zxzf58e25.dexie.cloud') => {
  db.cloud.configure({
    databaseUrl,
    requireAuth: true,
    customLoginGui: false,
  });
};

// HOOK SETUP
const setupHooks = () => {
  const trackableTables = ['expenses', 'categories', 'accounts', 'trips', 'recurringSeries'];

  let hasLoggedBypass = false;

  trackableTables.forEach((tableName) => {
    const table = db.table(tableName);

    const handleChange = () => {
      const isBypassed = isPopulating || isSeeding;

      if (isBypassed) {
        if (!hasLoggedBypass) {
          console.log(`⚠️ Hooks Bypassed (Not counting changes) - Seeding: ${isSeeding}`);
          hasLoggedBypass = true;
        }
      } else {
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



// Seed initial data
export const seedInitialData = async (): Promise<void> => {
  // Don't seed twice
  const userCount = await db.users.count();
  if (userCount > 0) {
    console.log("⏭️ Seed skipped (database already initialized).");
    return;
  }

  isPopulating = true;

  console.log("🌱 Seeding initial database...");

  try {
    const installationId = crypto.randomUUID();

    await db.transaction(
      "rw",
      db.metadata,
      db.users,
      db.accounts,
      db.categories,
      async () => {

        await db.metadata.put({
          key: "installationId",
          value: installationId,
        });

        await db.metadata.put({
          key: "createdAt",
          value: Date.now().toString(),
        });

        await db.users.add({
          name: "",
          lastName: "",
          email: "",
          avatar: "",
          interval: "monthly",
          showDisabledAccounts: true,
          showDisabledCategories: true,
          weekStartDay: "sunday",
          birthdate: "",
          localInterval: "monthly",
          language: "en",
          favourites: 0,
          isPremium: false,
          subscriptionPlan: "free",
          subscriptionExpirationDate: null,
        } as User);

        await db.accounts.add({
          accountName: "Cash",
          accountIdentifier: "",
          accountColor: "cyan",
          accountLogo: "fa-money-bill-1-wave",
          activeAccount: true,
          sortOrder: 0,
        } as Account);

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

        await db.categories.bulkAdd(
          defaultCategories.map(cat => ({
            categoryName: cat.name,
            categoryColor: cat.color,
            categoryIcon: cat.icon,
            activeCategory: true,
            favouriteCategory: false,
            systemCategory: true,
            subcategories: false,
          }))
        );
      }
    );

    console.log("✅ Initial database seeded.");
  } catch (err) {
    console.error("❌ Failed to seed initial data:", err);
    throw err;
  } finally {
    isPopulating = false;
  }
};


let dbReadyPromise: Promise<void> | null = null;

export function dbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      await initializeDatabase();

      setupHooks();

      const user = await db.users.toCollection().first();

      if (user?.isPremium) {
        enableDexieCloud();
      }

      console.log("✅ Database ready");
    })();
  }

  return dbReadyPromise;
}
export type { Account, Category, Subcategory, Trip };
export { db };



