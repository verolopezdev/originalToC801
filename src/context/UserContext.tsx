import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, User, dbReady, CurrencyType, SubscriptionPlan, seedInitialData } from "../db";
import { useTranslation } from "react-i18next";
import { Preferences } from "@capacitor/preferences";
import { loadCountries, getCountryWithSeparators, detectDeviceCountry } from "../utils/countryUtils";
import { CountryData } from "../utils/countryUtils";

import { clearUserData } from "../services/DbService";

import Modal from "../components/Modal";

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

const defaultCountryData: CountryData = {
  name: "US Dollar",
  code: "USD",
  symbol: "$",
  locale: "en-US",
  country: "US",
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
  const { t } = useTranslation();
  const [databaseReady, setDatabaseReady] = useState(false);
  const isCreatingRef = useRef(false);
  const isInitializingRef = useRef(false);

  const currentUserId = db.cloud.currentUser.value?.userId;
  const [isExpelledModalOpen, setIsExpelledModalOpen] = React.useState(false);

  const isDexieCloudAuthenticated =
    !!currentUserId && currentUserId !== "unauthorized";

  React.useEffect(() => {
    dbReady()
      .then(() => setDatabaseReady(true))
      .catch(console.error);
  }, []);


  const users = useLiveQuery(
    async () => {
      return db.users
        .toArray();
    },
    []
  );

  console.log("👥 Users: ", users);


  const user = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;
  
      if (isDexieCloudAuthenticated) {
        // 1. First search by owner matching current auth user
        const usersByOwner = await db.users
          .where("owner")
          .equals(currentUserId!)
          .toArray();
  
        if (usersByOwner.length > 0) {
          // Deduplicate: Prioritize local main user (e.g. non-guest or active sharingStatus)
          const primary = usersByOwner.find((u) => u.sharingStatus === 'active') || usersByOwner[0];
          return primary;
        }
  
        // 2. Fallback search by current authenticated email
        const userEmail = db.cloud.currentUser.value?.email;
        if (userEmail) {
          const userByEmail = await db.users
            .where("email")
            .equals(userEmail)
            .first();
          if (userByEmail) return userByEmail;
        }
      }
  
      return db.users.toCollection().first();
    },
    [databaseReady, currentUserId, isDexieCloudAuthenticated]
  );


  const adminUser = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;
      if (!user?.sharedRealmId) return undefined;
      if (user.sharingRole !== "guest") return undefined;

      const sharedUsers = await db.users
        .where("realmId")
        .equals(user.sharedRealmId)
        .toArray();

      const admin = sharedUsers.find(
        (sharedUser) => sharedUser.sharingRole === "admin"
      );

      return admin;
    },
    [databaseReady, user?.sharedRealmId, user?.sharingRole]
  );


  // Check if guest was removed
  useEffect(() => {
    if (!databaseReady || !isDexieCloudAuthenticated || !currentUserId || !user) {
      return;
    }
  
    const checkIfGuestWasRemoved = async () => {
      // 1. Check native preference
      const { value: wasGuest } = await Preferences.get({ key: "wasGuest" });
      if (wasGuest !== "true") return;
  
      let isStillMember = false;
  
      try {
        // Fetch all member records cleanly without relying on single-record live queries
        const memberships = await db.members
          .where("userId")
          .equals(currentUserId)
          .toArray();
  
        // Check if they are still listed in a realm owned by someone else
        isStillMember = memberships.some((m) => m.owner !== currentUserId);
        console.warn("😳 User still a member? ", isStillMember);
      } catch (error) {
        // PermissionError / AccessDenied from Dexie Cloud means realm access was revoked!
        console.warn("Realm access revoked or permission denied:", error);
        isStillMember = false;
      }
  
      // 2. If no longer a guest in any shared realm -> handle expulsion!
      if (!isStillMember) {
        console.warn("Guest was removed from the shared realm. Clearing local synced data...");

        // Clean up native preference so this fires ONLY ONCE
        await Preferences.remove({ key: "wasGuest" });

        // 1. Save user email / identity parameters before clearing
        const currentCurrency = user.defaultCurrency;

        // 2. Clear all local tables (removes old admin expenses, accounts, categories)
        await clearUserData();

        // 3. Re-seed default categories & cash account for the standalone user
        await seedInitialData(currentCurrency);

        // 4. Open expulsion modal
        setIsExpelledModalOpen(true);
      }
    };
  
    checkIfGuestWasRemoved().catch(console.error);
  }, [
    databaseReady,
    isDexieCloudAuthenticated,
    currentUserId,
    user?.userId,
    user?.sharedRealmId, // Triggers immediately when shared realm sync state changes
  ]);



  // Initialize guest settings from admin
  useEffect(() => {
    if (!user) return;
    if (user.sharingRole !== "guest") return;
    if (user.guestInitializedFromAdmin) return;
    if (!adminUser) return;
    if (adminUser.userId === user.userId) return;

    // 🔒 Lock immediately to block duplicate sync events
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    const initializeGuestFromAdmin = async () => {
      try {
        console.log("😩 guest initialized from admin...");

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
      } catch (error) {
        console.error("Failed to initialize guest from admin:", error);
        // Unlock only on error so it can retry if the network/DB write fails
        isInitializingRef.current = false; 
      }
    };

    initializeGuestFromAdmin();
  }, [
    user?.userId,
    user?.sharingRole,
    user?.guestInitializedFromAdmin,
    adminUser?.userId, // Use primitive ID, NOT the entire adminUser object
  ]);


  
  // Create authenticated user record safely
  useEffect(() => {
    if (!databaseReady || !isDexieCloudAuthenticated || !currentUserId || user !== undefined) {
      return;
    }

    if (isCreatingRef.current) return;

    const createAuthenticatedUser = async () => {
      isCreatingRef.current = true;

      try {
        const userEmail = db.cloud.currentUser.value?.email ?? currentUserId;

        // ----------------------------------------------------
        // STRICT GUARD: Search for ANY existing user by owner OR email
        // ----------------------------------------------------
        const allMatchingUsers = await db.users
          .where("owner")
          .equals(currentUserId)
          .or("email")
          .equals(userEmail)
          .toArray();

        console.log("🥳 all matching users: ", allMatchingUsers);

        // Fetch member records to check sharing status
        const memberships = await db.members
          .where("userId")
          .equals(currentUserId)
          .toArray();

        const guestMembership = memberships.find((m) => m.owner !== currentUserId);
        const isGuest = !!guestMembership;
        const sharedRealmId = guestMembership?.realmId ?? memberships[0]?.realmId;

        // ----------------------------------------------------
        // CASE A: EXISTING USER FOUND (Reinvite or Existing Account)
        // ----------------------------------------------------
        if (allMatchingUsers.length > 0) {
          const existingUser = allMatchingUsers[0];
          console.log("🔄 Reinvite or existing record detected for user:", existingUser.userId);
          
          await db.users.update(existingUser.userId, {
            owner: currentUserId,
            realmId: sharedRealmId,
            sharedRealmId,
            sharingRole: isGuest ? "guest" : existingUser.sharingRole,
            sharingStatus: "active",
            guestInitializedFromAdmin: isGuest ? false : existingUser.guestInitializedFromAdmin,
          });
          

          if (isGuest) {
            await Preferences.set({ key: "wasGuest", value: "true" });
          }
          return;
        }

        // ----------------------------------------------------
        // CASE B: FIRST-TIME INVITE / BRAND NEW USER
        // ----------------------------------------------------
        console.log("✨ Brand new user record being created...");

        let countryToSave: CountryData = defaultCountryData;

        try {
          const countries = await loadCountries();
          const country = await detectDeviceCountry(countries);
          if (country) {
            countryToSave = getCountryWithSeparators(country);
          }
        } catch (error) {
          console.warn("Could not detect device country, falling back to USD:", error);
        }

        const newUser: User = {
          userId: crypto.randomUUID(),

          // Identity
          name: "",
          lastName: "",
          email: userEmail,
          avatar: "",

          // Language
          language: countryToSave.locale ? countryToSave.locale.split("-")[0] : "en",
          selectedCountry: countryToSave.country,

          // Currency
          defaultCurrency: countryToSave,
          actualCurrency: countryToSave,
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
          theme: "theme-cyan",
          mode: "system",
          isTravelMode: false,

          // Dexie Cloud
          owner: currentUserId,
          realmId: sharedRealmId,
          sharedRealmId,
          sharingStatus: "active",

          // Sharing
          sharingRole: isGuest ? "guest" : undefined,
          guestInitializedFromAdmin: isGuest ? false : undefined,
        };

        await db.users.add(newUser);

        if (isGuest) {
          await Preferences.set({ key: "wasGuest", value: "true" });
        }
      } finally {
        isCreatingRef.current = false;
      }
    };

    createAuthenticatedUser().catch(console.error);
  }, [databaseReady, isDexieCloudAuthenticated, currentUserId, user]);

  
  
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
  }, [user?.language, i18n]);

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
      <div style={{ padding: 50, color: "white" }}>
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

      {/* Access Revoked Modal */}
      {isExpelledModalOpen && (
        <Modal
          isOpen={isExpelledModalOpen}
          icon="alert" // Options: 'alert' | 'info' | 'success' | 'failure'
          title={t("modal.access_revoked_title")}
          content={t("modal.access_revoked_msg")}
          closeModal={() => setIsExpelledModalOpen(false)}
          actions={[
            {
              label: t("common.ok"),
              action: () => setIsExpelledModalOpen(false),
              style: "small-modal-btn", // Optional CSS class for action button styling
            },
          ]}
        />
      )}
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