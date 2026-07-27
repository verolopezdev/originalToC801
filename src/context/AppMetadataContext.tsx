import React, { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { Preferences } from "@capacitor/preferences";
import { useLiveQuery } from "dexie-react-hooks";
import { db, dbReady } from "../db";

interface AppMetadataContextType {
  ready: boolean;
}

const AppMetadataContext = createContext<AppMetadataContextType>({
  ready: false,
});

export const AppMetadataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {

  const [databaseReady, setDatabaseReady] = React.useState(false);

  useEffect(() => {
    dbReady().then(() => setDatabaseReady(true));
  }, []);

  const metadata = useLiveQuery(
    async () => {
      if (!databaseReady) return undefined;

      return db.appmetadata.toArray();
    },
    [databaseReady]
  );

  // Keeps track of the last values we've mirrored
  const lastValues = useRef<Map<string, string>>(new Map());

  useEffect(() => {

    if (!metadata) return;

    const syncPreferences = async () => {

      for (const item of metadata) {

        const previous = lastValues.current.get(item.key);

        if (previous === item.value) {
          continue;
        }

        await Preferences.set({
          key: item.key,
          value: item.value,
        });

        lastValues.current.set(item.key, item.value);
      }

    };

    syncPreferences();

  }, [metadata]);

  if (!databaseReady || metadata === undefined) {
    return (
      <div style={{ padding: 40 }}>
        Loading preferences...
      </div>
    );
  }

  return (
    <AppMetadataContext.Provider
      value={{
        ready: true,
      }}
    >
      {children}
    </AppMetadataContext.Provider>
  );
};

export const useAppMetadata = () => useContext(AppMetadataContext);