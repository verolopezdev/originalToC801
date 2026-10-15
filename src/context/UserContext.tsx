import React, { createContext, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, User, dbReady, CurrencyType, SubscriptionPlan } from "../db";
import { useTranslation } from "react-i18next";

import { loadCountries, getCountryWithSeparators, detectDeviceCountry } from "../utils/countryUtils";

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



export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [databaseReady, setDatabaseReady] = React.useState(false);

  const currentUserId = db.cloud.currentUser.value?.userId;
  const isDexieCloudAuthenticated = !!currentUserId && currentUserId !== "unauthorized";

  React.useEffect(() => {
    dbReady()
      .then(() => setDatabaseReady(true))
      .catch(console.error);
  }, []);

  const user = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;
      if (isDexieCloudAuthenticated) {
        return db.users.where("owner").equals(currentUserId!).first();
      }
      return db.users.toCollection().first();
    },
    [databaseReady, currentUserId]
  );

  // Dev logging only on user mutation
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log("🙃 LOGGED USER UPDATED: ", user);
    }
  }, [user]);

  const adminUser = useLiveQuery(
    async () => {
      if (!databaseReady || !user?.sharedRealmId || user.sharingRole !== "guest") return undefined;
      const sharedUsers = await db.users.where("realmId").equals(user.sharedRealmId).toArray();
      return sharedUsers.find(sharedUser => sharedUser.sharingRole === "admin");
    },
    [databaseReady, user?.sharedRealmId, user?.sharingRole]
  );

  // Guest initialization effect
  useEffect(() => {
    if (!user || user.sharingRole !== "guest" || user.guestInitializedFromAdmin || !adminUser) return;
    if (adminUser.userId === user.userId) return;

    const initializeGuestFromAdmin = async () => {
      console.log("😎 Initializing guest from admin...");

      await db.users.update(user.userId, {
        language: adminUser.language,
        selectedCountry: adminUser.selectedCountry,
        defaultCurrency: adminUser.defaultCurrency,
        actualCurrency: adminUser.actualCurrency,
        travelCurrency: adminUser.travelCurrency,
        isPremium: adminUser.isPremium,
        subscriptionPlan: adminUser.subscriptionPlan,
        subscriptionExpirationDate: adminUser.subscriptionExpirationDate,
        interval: adminUser.interval,
        localInterval: adminUser.localInterval,
        showDisabledAccounts: adminUser.showDisabledAccounts,
        showDisabledCategories: adminUser.showDisabledCategories,
        weekStartDay: adminUser.weekStartDay,
        theme: adminUser.theme,
        mode: adminUser.mode,
        guestInitializedFromAdmin: true,
      });
    };

    initializeGuestFromAdmin().catch(console.error);
  }, [
    user?.userId,
    user?.sharingRole,
    user?.guestInitializedFromAdmin,
    adminUser,
  ]);

  // Authenticated user creation effect
  useEffect(() => {
    if (!databaseReady || !isDexieCloudAuthenticated || !currentUserId || user !== undefined) return;

    const createAuthenticatedUser = async () => {
      

      const existingUser = await db.users.where("owner").equals(currentUserId).first();
      if (existingUser) return;

      const member = await db.members.where("userId").equals(currentUserId).first();
      const sharedRealmId = member?.realmId;
      const countries = await loadCountries();
      const country = await detectDeviceCountry(countries);

      if (!country) throw new Error("Could not determine user's country.");

      const countryToSave = getCountryWithSeparators(country);

      console.log("😎 Creating authenticated user...");
      
      const newUser: User = {
        userId: crypto.randomUUID(),
        name: "",
        lastName: "",
        email: db.cloud.currentUser.value?.email ?? currentUserId,
        avatar: "",
        language: countryToSave.locale.split("-")[0],
        selectedCountry: countryToSave.country,
        defaultCurrency: countryToSave,
        actualCurrency: countryToSave,
        travelCurrency: null,
        isPremium: false,
        subscriptionPlan: "free",
        subscriptionExpirationDate: null,
        interval: "monthly",
        localInterval: "monthly",
        showDisabledAccounts: true,
        showDisabledCategories: true,
        favourites: 0,
        weekStartDay: "sunday",
        theme: "theme-cyan",
        mode: "system",
        isTravelMode: false,
        owner: currentUserId,
        realmId: sharedRealmId,
        sharedRealmId,
        sharingStatus: 'active',
        sharingRole: member ? "guest" : undefined,
        guestInitializedFromAdmin: member ? false : undefined,
      };

      await db.users.add(newUser);
    };

    createAuthenticatedUser().catch(console.error);
  }, [databaseReady, isDexieCloudAuthenticated, currentUserId, user]);

  const categorylessId = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;
      const category = await db.categories.where("categoryName").equals("Categoryless").first();
      return category?.categoryId ?? "";
    },
    [databaseReady]
  );

  useEffect(() => {
    if (user?.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user?.userId) return;
    await db.users.update(user.userId, updates);
  }, [user?.userId]);

  const resetUser = useCallback(async () => {
    if (!user?.userId) return;
    await db.users.put({
      userId: user.userId,
      ...defaultUser,
    });
  }, [user?.userId]);

  const contextValue = useMemo(() => ({
    user: user!, // guarantees user is not null
    userId: user?.userId ?? "",
    categorylessId: categorylessId ?? "",
    updateUser,
    resetUser,
  }), [user, categorylessId, updateUser, resetUser]);

  if (!user || categorylessId === undefined) {
    return (
      <div style={{ padding: 50, color: "white" }}>
        Loading user context...
      </div>
    );
  }

  return (
    <UserContext.Provider value={contextValue}>
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