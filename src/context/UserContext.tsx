import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, User, dbReady, CurrencyType, SubscriptionPlan } from "../db";
import { useTranslation } from "react-i18next";

interface UserContextType {
  user: User;
  userId: string;
  categorylessId: string;

  updateUser: (updates: Partial<User>) => Promise<void>;
  resetUser: () => Promise<void>;
}

const usd: CurrencyType = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  locale: "en-US",
  thousandSeparator: ",",
  decimalSeparator: ".",
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultUser: Omit<User, "userId"> = {
  // Identity
  name: "",
  lastName: "",
  email: "",
  avatar: "",

  // Language
  language: "en",
  selectedCountry: undefined,

  // Currency
  defaultCurrency: usd,
  actualCurrency: usd,
  travelCurrency: null,

  // Subscription
  isPremium: false,
  subscriptionPlan: "free" as SubscriptionPlan,
  subscriptionExpirationDate: null,

  // Settings
  interval: "monthly",
  localInterval: "monthly",
  showDisabledAccounts: true,
  showDisabledCategories: true,
  favourites: 0,
  weekStartDay: "sunday",

  theme: "system",
  mode: "light",

  isTravelMode: false,
};



export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const [databaseReady, setDatabaseReady] = React.useState(false);

  React.useEffect(() => {
    dbReady()
      .then(() => setDatabaseReady(true))
      .catch(console.error);
  }, []);

  const user = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;

      return db.users.toCollection().first();
    },
    [databaseReady]
  );

  const categorylessId = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;

      const category = await db.categories
        .where("categoryName")
        .equals("Categoryless")
        .first();

      return category?.categoryId ?? "";
    },
    [databaseReady]
  );

  useEffect(() => {
    if (!user) return;
  
    if (user.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language]);

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    await db.users.update(user.userId, updates);
  };

  const resetUser = async () => {
    if (!user) return;

    await db.users.put({
      userId: user.userId,
      ...defaultUser,
    });
  };

  if (!user || categorylessId === undefined) {
    return (
      <div
        style={{
          padding: 50,
          color: "white",
        }}
      >
        Loading user context...
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{
        user,
        userId: user.userId,
        categorylessId,
        updateUser,
        resetUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }

  return context;
};