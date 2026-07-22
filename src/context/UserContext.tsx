import React, { createContext, useContext, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User, dbReady } from '../db';

interface UserContextType {
  user: User;
  userId: string;
  categorylessId: string;
  updateUser: (updates: Partial<User>) => Promise<void>;
  resetUser: () => Promise<void>;
}


const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultUser: Omit<User, "userId"> = {
  name: '',
  lastName: '',
  birthdate: '',
  email: '',
  avatar: '',
  interval: 'monthly',
  weekStartDay: 'sunday',
  localInterval: 'monthly',
  language: 'en',
  showDisabledCategories: true,
  showDisabledAccounts: true,
  favourites: 0,
  isPremium: false,
  subscriptionPlan: 'free',
  subscriptionExpirationDate: '',
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [databaseReady, setDatabaseReady] = React.useState(false);

  React.useEffect(() => {
    dbReady()
      .then(() => {
        setDatabaseReady(true);
      })
      .catch(err => {
        console.error("Database initialization failed:", err);
      });
  }, []);


  const user = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;
  
      return await db.users.toCollection().first();
  
    },
    [databaseReady]
  );



  // 2. Fetch the "Categoryless" system category (first record or by name)
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

  React.useEffect(() => {
    console.log("Calling dbReady...");
  
    dbReady()
      .then(() => {
        console.log("dbReady resolved");
        setDatabaseReady(true);
      })
      .catch(err => {
        console.error("dbReady failed", err);
      });
  
  }, []);

  const updateUser = async (updates: Partial<User>) => {
    if (!user?.userId) return;
    await db.users.update(user.userId, updates);
  };

  const resetUser = async () => {
    if (!user?.userId) return;
    await db.users.put({
      userId: user.userId, // Maintain existing string UUID
      ...defaultUser,
    });
  };

  // 2. While loading, show a visible indicator instead of returning null (blank page)
  if (!user || !categorylessId) {
    return (
      <div style={{
        padding: 50,
        color: "white",
        background: "black"
      }}>
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
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
};