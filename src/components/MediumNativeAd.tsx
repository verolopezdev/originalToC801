
import React, { useEffect, useState, createElement } from 'react';

import { NativeAdTemplate } from '@capacitor-community/admob';

import {
  useNativeAds,
  DASHBOARD_FEED,
} from '../context/NativeAdProvider';

import './NativeAd.css';

const MediumNativeAd: React.FC = () => {
  const {
    isReady,
    isNative,
    isPremium,
    ensureFeed,
  } = useNativeAds();

  const [feedReady, setFeedReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const createFeed = async () => {
      setFeedReady(false);

      if (!isReady || !isNative || isPremium) {
        return;
      }

      const feed = await ensureFeed(
        DASHBOARD_FEED,
        NativeAdTemplate.Medium
      );

      if (!cancelled) {
        setFeedReady(feed !== null);
      }
    };

    void createFeed();

    return () => {
      cancelled = true;
    };
  }, [
    isReady,
    isNative,
    isPremium,
    ensureFeed,
  ]);

  if (
    !isReady ||
    !isNative ||
    isPremium ||
    !feedReady
  ) {
    return null;
  }

  return (
    <div className="native-ad-wrapper native-ad-medium">
      <div className="native-ad-label">
        Sponsored
      </div>

      {createElement('capacitor-admob-native', {
        'feed-id': DASHBOARD_FEED,
        'slot-key': 'dashboard-monthly-summary',
      })}
    </div>
  );
};

export default MediumNativeAd;
