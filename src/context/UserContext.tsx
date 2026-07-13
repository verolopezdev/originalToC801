import React, { createContext, useContext, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User } from '../db';

interface UserContextType {
  user: User;
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
  // 1. Fetch the user record dynamically instead of looking for numerical ID 1
  const user = useLiveQuery(
    () => db.users.toCollection().first(),
    []
  );

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
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading user context...</p>
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{
        user,
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