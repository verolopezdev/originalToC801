import React, { createContext, useState, useContext, useEffect } from 'react';
import { useUser } from './UserContext'; // Import the useUser hook

type IntervalContextType = {
  selectedInterval: string;
  setSelectedInterval: (interval: string) => void;
};

const IntervalContext = createContext<IntervalContextType | undefined>(undefined);

export const IntervalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser(); // Access user context
  const { interval } = user; // Extract interval property

  const [selectedInterval, setSelectedInterval] = useState<string>('monthly'); // Default value 

  useEffect(() => {
    if (interval) {
      setSelectedInterval(interval); // Update state when `interval` from user context changes
    }
  }, [interval]); // Run effect whenever `interval` changes

  return (
    <IntervalContext.Provider value={{ selectedInterval, setSelectedInterval }}>
      {children}
    </IntervalContext.Provider>
  );
};

export const useInterval = () => {
  const context = useContext(IntervalContext);
  if (!context) {
    throw new Error('useInterval must be used within an IntervalProvider');
  }
  return context;
};
