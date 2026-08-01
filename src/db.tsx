import Dexie, { type EntityTable } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { incrementChangeCount } from './services/BackupService';


// GLOBAL FLAGS
let initializing = false;
let isPopulating = false;
let isSyncing = false;


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


export const setIsSeeding = (value: boolean) => {
  isSeeding = value;
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


interface AppMetadata {
  id: string;
  key: string;
  value: string;
}

export type SubscriptionPlan = "free" | "monthly" | "quarterly" | "yearly";

export interface User {
  userId: string;
  // Identity
  name: string;
  lastName: string;
  email: string;
  avatar: string;
  // Language
  language: string;
  selectedCountry?: string;
  // Currency
  defaultCurrency: CurrencyType;
  actualCurrency: CurrencyType;
  travelCurrency: CurrencyType | null;
  // Subscription
  isPremium: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpirationDate: string | null;
  // Settings
  interval: "weekly" | "monthly" | "yearly";
  localInterval: "weekly" | "monthly" | "yearly";
  showDisabledAccounts: boolean;
  showDisabledCategories: boolean;
  favourites: number;
  weekStartDay: "sunday" | "monday";
  theme?: string;
  mode?: string;
  isTravelMode: boolean;
}


interface Account {
  accountId: string;
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
  subcategoryName: string;
  subcategoryColor: string;
  subcategoryIcon: string;
  activeSubcategory: boolean;
  favouriteSubcategory: boolean;
  parentCategoryId: string;
}

export interface Expense {
  expenseId: string;
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
  tripName: string;
  tripIcon: string;
  fromDate: Date;
  toDate: Date;
  currencyCode: string;
}

// Define currency data type
export interface CurrencyType {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  thousandSeparator: string;
  decimalSeparator: string;
}


interface HistoricCurrencyList {
  id: string;
  currencies: string[];
  updatedAt: number;
}

export interface AlternativeCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimalSeparator: string;
  thousandSeparator: string;
}

// 1. Initialize Dexie with the addon attached so schema annotations (@) remain valid
const db = new Dexie('DB', { addons: [dexieCloud] }) as Dexie & {
  appmetadata: EntityTable<AppMetadata, 'id'>;
  users: EntityTable<User, 'userId'>;
  accounts: EntityTable<Account, 'accountId'>;
  categories: EntityTable<Category, 'categoryId'>;
  subcategories: EntityTable<Subcategory, 'subcategoryId'>;
  expenses: EntityTable<Expense, 'expenseId'>;
  trips: EntityTable<Trip, 'tripId'>;
  historicCurrencyList: EntityTable<HistoricCurrencyList, 'id'>;
  alternativeCurrencies: EntityTable<AlternativeCurrency, 'id'>;
  recurringSeries: EntityTable<RecurringSeries, 'seriesId'>;
};
(window as any).db = db;


export async function initializeDatabase() {
  if (initializing) {
    return;
  }

  initializing = true;

  try {
    if (!db.isOpen()) {
      await db.open();
    }

  } finally {
    initializing = false;
  }
}


db.version(1).stores({
  appmetadata: 'id, key',
  users: 'userId, email',
  accounts: 'accountId, userId, sortOrder',
  categories: 'categoryId, categoryName',
  subcategories: 'subcategoryId, subcategoryName, parentCategoryId',
  expenses: 'expenseId, isActive, userId, expenseDate, accountId, categoryId, subcategoryId, expenseCurrencyCode, tripId, seriesId, [seriesId+expenseDate], [seriesId+installmentIndex], [seriesId+isActive+dueDate], [seriesId+dueDate]',
  trips: 'tripId, tripName, tripIcon, fromDate, toDate, currencyCode',
  historicCurrencyList: 'id',
  alternativeCurrencies: 'id, code',
  recurringSeries: 'seriesId, userId, startDate, interval, unit, totalOccurrences, isActive, lastLoggedDate, moved, categoryId, subcategoryId, accountId',
});


db.cloud.configure({
  databaseUrl: 'https://zz8cobd57.dexie.cloud',
  requireAuth: false,
});


db.cloud.syncState.subscribe(state => {
  isSyncing =
    state.phase === "pulling" ||
    state.phase === "pushing";
});


// HOOK SETUP
const setupHooks = () => {
  const trackableTables = ['expenses', 'categories', 'accounts', 'trips', 'recurringSeries'];

  let hasLoggedBypass = false;

  trackableTables.forEach((tableName) => {
    const table = db.table(tableName);

    const handleChange = () => {
      const isBypassed =
        isPopulating ||
        isSeeding ||
        isSyncing;

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
export const seedInitialData = async (
  initialCurrency: any
): Promise<void> => {
  // Don't seed twice
  const userCount = await db.users.count();
  if (userCount > 0) {
    return;
  }

  isPopulating = true;
  console.log("🌱 Seeding initial database...");

  try {
    const installationId = crypto.randomUUID();

    await db.transaction(
      "rw",
      db.appmetadata,
      db.users,
      db.accounts,
      db.categories,
      async () => {

        await db.appmetadata.put({
          id: crypto.randomUUID(),
          key: "installationId",
          value: installationId,
        });

        await db.appmetadata.put({
          id: crypto.randomUUID(),
          key: "createdAt",
          value: Date.now().toString(),
        });

        await db.users.add({
          userId: crypto.randomUUID(),
          // Identity
          name: "",
          lastName: "",
          email: "",
          avatar: "",
          // Language
          language: initialCurrency.locale.split("-")[0],
          selectedCountry: initialCurrency.country,
          // Currency
          defaultCurrency: initialCurrency,
          actualCurrency: initialCurrency,
          travelCurrency: null,
          // Subscription
          isPremium: false,
          subscriptionPlan: "free",
          subscriptionExpirationDate: null,
          // Settings
          interval: "monthly",
          localInterval: "monthly",
          showDisabledAccounts: true,
          showDisabledCategories: true,
          favourites: 0,
          weekStartDay: "sunday",
          theme: 'theme-cyan',
          mode: "system",
          isTravelMode: false,
        } as User);

        await db.accounts.add({
          accountId:crypto.randomUUID(),
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
            categoryId:crypto.randomUUID(),
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
    dbReadyPromise = initializeDatabase();
    setupHooks();
  } else {
  }

  return dbReadyPromise;
}

export type { Account, Category, Subcategory, Trip };
export { db };



