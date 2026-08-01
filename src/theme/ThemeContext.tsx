import React, {
  createContext,
  useContext,
  useEffect,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { StatusBar, Style } from "@capacitor/status-bar";
import { db } from "../db";

interface ThemeContextType {
  themeColor: string;
  isDarkMode: boolean;
  modePreference: "system" | "light" | "dark";
  setThemeColor: (color: string) => Promise<void>;
  setModePreference: (
    preference: "system" | "light" | "dark"
  ) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getUser = () => db.users.toCollection().first();

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const user = useLiveQuery(getUser, []);

  // User preferences come directly from Dexie
  const themeColor = user?.theme ?? "theme-cyan";

  const modePreference =
    (user?.mode as "system" | "light" | "dark") ?? "system";

  // Detect current system theme
  const detectSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDarkMode =
    modePreference === "dark"
      ? true
      : modePreference === "light"
      ? false
      : detectSystemTheme();

  const updateStatusBar = (darkMode: boolean) => {
    if (darkMode) {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({
        color: "#131314",
      });
    } else {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({
        color: "#fafbfd",
      });
    }
  };

  // Apply dark/light mode
  useEffect(() => {
    const applyTheme = () => {
      const darkMode =
        modePreference === "dark"
          ? true
          : modePreference === "light"
          ? false
          : detectSystemTheme();

      document.body.classList.toggle("dark", darkMode);

      updateStatusBar(darkMode);
    };

    applyTheme();

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const listener = () => {
      if (modePreference === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", listener);

    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, [modePreference]);

  // Apply theme color
  useEffect(() => {
    document.body.classList.add(themeColor);

    return () => {
      document.body.classList.remove(themeColor);
    };
  }, [themeColor]);

  const setThemeColor = async (color: string) => {
    if (!user) return;

    const theme = color.startsWith("theme-")
      ? color
      : `theme-${color}`;

    await db.users.update(user.userId, {
      theme,
    });
  };

  const setModePreference = async (
    preference: "system" | "light" | "dark"
  ) => {
    if (!user) return;

    await db.users.update(user.userId, {
      mode: preference,
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        isDarkMode,
        modePreference,
        setThemeColor,
        setModePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider"
    );
  }

  return context;
};