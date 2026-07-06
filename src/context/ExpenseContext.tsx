import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import dayjs from 'dayjs';
import { logAutoExpenses } from '../utils/autoLogger';
import { getOverallStatus, Severity } from '../utils/recurrenceStatus';

interface ExpenseContextType {
  checkExpense: () => void;
  checkRecurrence: () => void;
  overallSeverity: Severity;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [, setUpdateExpense] = useState(0);
  const [, setUpdateRecurrence] = useState(0);
  const [lastCheckDate, setLastCheckDate] = useState(dayjs().format('YYYY-MM-DD'));
  const runningRef = useRef<boolean>(false); // Prevent overlapping runs
  const [overallSeverity, setOverallSeverity] = useState<Severity>('none');

  const runChecks = async () => {
    if (runningRef.current) {
      //console.log('runChecks already in progress, skipping...');
      return;
    }
    runningRef.current = true;

    //console.log("---- Running logAutoExpenses + getOverallStatus ----");

    try {
      //console.log("Before logAutoExpenses");
      await logAutoExpenses();  // ensure auto expenses are logged
      //console.log("After logAutoExpenses");

      const severity = await getOverallStatus();  // compute current severity
      //console.log("Severity computed:", severity);

      if (!severity) {
        console.warn("getOverallStatus returned a falsy value!");
      } else {
        setOverallSeverity(severity); // update context
      }
    } catch (err) {
      console.error("Error in runChecks:", err);
    } finally {
      runningRef.current = false;
    }
  };

  const checkExpense = () => {
    setUpdateExpense(prev => prev + 1); // trigger re-render if needed
  };

  const checkRecurrence = () => {
    setUpdateRecurrence(prev => prev + 1); // trigger re-render
    runChecks();
  };

  // Run checks on app start
  useEffect(() => {
    runChecks();
  }, []);

  // Run checks when app resumes from background
  useEffect(() => {
    let listenerHandle: any;

    CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        const today = dayjs().format('YYYY-MM-DD');
        if (today !== lastCheckDate) {
          setLastCheckDate(today);
          runChecks();
        }
      }
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, [lastCheckDate]);

  return (
    <ExpenseContext.Provider value={{ checkExpense, checkRecurrence, overallSeverity }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
