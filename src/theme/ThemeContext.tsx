import React, { createContext, useContext, useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';

// Defines the structure of the Theme Context.
interface ThemeContextType {
  themeColor: string;
  isDarkMode: boolean;
  modePreference: 'system' | 'light' | 'dark';
  setThemeColor: (color: string) => void;
  setModePreference: (preference: 'system' | 'light' | 'dark') => void;
}

// Initializes a context object for the theme with default value undefined.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColor] = useState(localStorage.getItem('themeColor') || 'theme-cyan'); 
  const [modePreference, setModePreference] = useState<'system' | 'light' | 'dark'>(
    (localStorage.getItem('modePreference') as 'system' | 'light' | 'dark') || 'system'
  );
  // Tracks whether dark mode is active based on the current preference.
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect system theme
  const detectSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Updates the status bar style and background color based on the darkMode flag.
  const updateStatusBar = (darkMode: boolean) => {
    if (darkMode) {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#131314' }); // Example dark mode color
    } else {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#fafbfd' }); // Example light mode color
    }
  };

  useEffect(() => {
    const applyTheme = () => {
      let darkMode = false;

      if (modePreference === 'system') {
        darkMode = detectSystemTheme();
      } else if (modePreference === 'dark') {
        darkMode = true;
      }

      setIsDarkMode(darkMode);
      document.body.classList.toggle('dark', darkMode);

      // Update the status bar based on the mode
      updateStatusBar(darkMode);
    };

    applyTheme();

    // Listens for system theme changes when the preference is set to system.
    const systemThemeListener = (e: MediaQueryListEvent) => {
      if (modePreference === 'system') {
        const isDark = e.matches;
        setIsDarkMode(isDark);
        updateStatusBar(isDark);
        applyTheme(); // Reapply the theme to the app
      }
    };

    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryList.addEventListener('change', systemThemeListener);

    return () => {
      mediaQueryList.removeEventListener('change', systemThemeListener);
    };
  }, [modePreference]);

  // Apply theme color
  useEffect(() => {
    document.body.classList.add(themeColor);
    return () => {
      document.body.classList.remove(themeColor);
    };
  }, [themeColor]);

  const handleThemeColorChange = (color: string) => {
    const themeColorVar = `theme-${color}`;
    setThemeColor(themeColorVar);
    localStorage.setItem('themeColor', themeColorVar);
  };

  const handleModePreferenceChange = (preference: 'system' | 'light' | 'dark') => {
    setModePreference(preference);
    localStorage.setItem('modePreference', preference);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        isDarkMode,
        modePreference,
        setThemeColor: handleThemeColorChange,
        setModePreference: handleModePreferenceChange,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
