import React, { createContext, useContext, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, User } from '../db';

// Define context type
interface UserContextType {
  user: User;
  updateUser: (updates: Partial<User>) => Promise<void>;
  resetUser: () => Promise<void>;
}


// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Default values used for reset
const defaultUser: Omit<User, "userId"> = {
  name: '',
  lastName: '',
  birthdate: '',
  email: '',
  avatar: '',
  interval: 'monthly',
  weekStartDay: 'sunday',
  localInterval: 'monthly',
  language: '',
  showDisabledCategories: true,
  showDisabledAccounts: true,
  favourites: 0,
  isPremium: false,
  subscriptionPlan: 'free',
  subscriptionExpirationDate: '',
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const user = useLiveQuery(
    () => db.users.get(1),
    [],
    undefined
  );

  const updateUser = async (updates: Partial<User>) => {
    await db.users.update(1, updates);
  };

  const resetUser = async () => {
    await db.users.put({
      userId: 1,
      ...defaultUser,
    });
  };

  // Wait until the user has been loaded
  if (!user) {
    return null; // or your loading spinner
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

// Custom hook
export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
};