
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';

import { Capacitor } from '@capacitor/core';
import { useUser } from './UserContext';

import {
  AdMob,
  AdmobConsentStatus,
  NativeAdFeed,
  NativeAdTemplate,
} from '@capacitor-community/admob';

import '../components/NativeAd.css';

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const DASHBOARD_FEED = 'dashboard-feed';
const TRANSACTIONS_FEED = 'transactions-feed';

const TEST_ADS = true;

// Set to true when you're ready to implement
// the production consent flow.
const ENABLE_CONSENT = false;

// Initialize AdMob only once.
let initializationPromise: Promise<boolean> | null = null;

async function initializeAdMob(): Promise<boolean> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // DEVELOPMENT: Initialize directly without UMP consent.
      if (!ENABLE_CONSENT) {
        await AdMob.initialize();

        console.info(
          'AdMob initialized successfully (consent disabled for development).'
        );

        return true;
      }

      // PRODUCTION: Request and handle consent.
      let consent = await AdMob.requestConsentInfo();

      if (
        consent.isConsentFormAvailable &&
        consent.status === AdmobConsentStatus.REQUIRED
      ) {
        consent = await AdMob.showConsentForm();
      }

      if (!consent.canRequestAds) {
        console.info('AdMob: consent does not allow ad requests.');
        return false;
      }

      await AdMob.initialize();

      console.info('AdMob initialized successfully.');

      return true;
    } catch (error) {
      console.error('AdMob initialization failed:', error);

      initializationPromise = null;

      return false;
    }
  })();

  return initializationPromise;
}



// --------------------------------------------------
// Types
// --------------------------------------------------

type NativeFeed = Awaited<
  ReturnType<typeof NativeAdFeed.create>
>;

interface NativeAdContextType {
  isReady: boolean;
  isNative: boolean;
  isPremium: boolean;

  ensureFeed: (
    feedId: string,
    template: NativeAdTemplate
  ) => Promise<NativeFeed | null>;

  pauseAll: () => Promise<void>;
  resumeAll: () => void;
  destroyFeed: (feedId: string) => Promise<void>;
}

interface NativeAdProviderProps {
  children: ReactNode;
}

const NativeAdContext = createContext<
  NativeAdContextType | undefined
>(undefined);

// --------------------------------------------------
// Provider
// --------------------------------------------------

export const NativeAdProvider: React.FC<
  NativeAdProviderProps
> = ({ children }) => {
  const { user } = useUser();

  const isPremium = user?.isPremium ?? false;

  const [isReady, setIsReady] = useState(false);

  const feedsRef = useRef<Map<string, NativeFeed>>(
    new Map()
  );

  const pendingFeedsRef = useRef<
    Map<string, Promise<NativeFeed | null>>
  >(new Map());

  const isNative = Capacitor.isNativePlatform();

  // ----------------------------------------------
  // Initialize AdMob and consent
  // ----------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!isNative || isPremium) {
        setIsReady(false);
        return;
      }

      const success = await initializeAdMob();

      if (!cancelled) {
        setIsReady(success);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [isNative, isPremium]);

  // ----------------------------------------------
  // Create or reuse a feed
  // ----------------------------------------------

  const ensureFeed = useCallback(
    async (
      feedId: string,
      template: NativeAdTemplate
    ): Promise<NativeFeed | null> => {
      if (!isNative || isPremium || !isReady) {
        return null;
      }

      const existingFeed = feedsRef.current.get(feedId);

      if (existingFeed) {
        return existingFeed;
      }

      const pending = pendingFeedsRef.current.get(feedId);

      if (pending) {
        return pending;
      }

      // The plugin supports a maximum of two active
      // native feed managers.
      if (feedsRef.current.size >= 2) {
        console.warn('AdMob: maximum active feeds reached.');
        return null;
      }

      const creationPromise = (async () => {
        try {
          const feed = await NativeAdFeed.create({
            feedId,
            template,
            isTesting: TEST_ADS,

            style: {
              backgroundColor: '#ffffff',
              cornerRadius: 12,
            
              borderColor: '#eeeeee',
              borderWidth: 0,
            
              headlineColor: '#202124',
              headlineFontSize: 16,
            
              bodyColor: '#666666',
              bodyFontSize: 13,
            
              callToActionBackgroundColor: '#2563eb',
              callToActionTextColor: '#ffffff',
              callToActionFontSize: 13,
            },
          });

          feedsRef.current.set(feedId, feed);

          console.info(`AdMob feed created: ${feedId}`);

          return feed;
        } catch (error) {
          console.error(
            `Failed to create AdMob feed ${feedId}:`,
            error
          );

          return null;
        } finally {
          pendingFeedsRef.current.delete(feedId);
        }
      })();

      pendingFeedsRef.current.set(
        feedId,
        creationPromise
      );

      return creationPromise;
    },
    [isNative, isPremium, isReady]
  );

  // ----------------------------------------------
  // Pause all feeds
  // Use before opening Ionic overlays
  // ----------------------------------------------

  const pauseAll = useCallback(async () => {
    const feeds = Array.from(feedsRef.current.values());

    await Promise.all(
      feeds.map(async (feed) => {
        try {
          await feed.pause();
        } catch (error) {
          console.error('Failed to pause native feed:', error);
        }
      })
    );
  }, []);

  // ----------------------------------------------
  // Resume all feeds
  // ----------------------------------------------

  const resumeAll = useCallback(() => {
    feedsRef.current.forEach((feed) => {
      try {
        feed.resume();
      } catch (error) {
        console.error('Failed to resume native feed:', error);
      }
    });
  }, []);

  // ----------------------------------------------
  // Destroy one feed
  // ----------------------------------------------

  const destroyFeed = useCallback(
    async (feedId: string) => {
      const feed = feedsRef.current.get(feedId);

      if (!feed) return;

      feedsRef.current.delete(feedId);

      try {
        await feed.destroy();
      } catch (error) {
        console.error(
          `Failed to destroy feed ${feedId}:`,
          error
        );
      }
    },
    []
  );

  // ----------------------------------------------
  // Destroy all feeds when premium is activated
  // or when the provider is removed
  // ----------------------------------------------

  useEffect(() => {
    if (!isPremium) return;

    feedsRef.current.forEach((feed) => {
      void feed.destroy();
    });

    feedsRef.current.clear();
    pendingFeedsRef.current.clear();
  }, [isPremium]);

  useEffect(() => {
    return () => {
      feedsRef.current.forEach((feed) => {
        void feed.destroy();
      });

      feedsRef.current.clear();
      pendingFeedsRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isNative,
      isPremium,
      ensureFeed,
      pauseAll,
      resumeAll,
      destroyFeed,
    }),
    [
      isReady,
      isNative,
      isPremium,
      ensureFeed,
      pauseAll,
      resumeAll,
      destroyFeed,
    ]
  );

  return (
    <NativeAdContext.Provider value={value}>
      {children}
    </NativeAdContext.Provider>
  );
};

// --------------------------------------------------
// Custom hook
// --------------------------------------------------

export const useNativeAds = (): NativeAdContextType => {
  const context = useContext(NativeAdContext);

  if (!context) {
    throw new Error(
      'useNativeAds must be used inside NativeAdProvider'
    );
  }

  return context;
};

// Export feed identifiers for other components.
export { DASHBOARD_FEED, TRANSACTIONS_FEED };
