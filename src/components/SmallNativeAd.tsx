
import React, { useEffect, createElement } from 'react';

import { NativeAdTemplate } from '@capacitor-community/admob';

import {
  useNativeAds,
  TRANSACTIONS_FEED,
} from '../context/NativeAdProvider';

import './NativeAd.css';

interface SmallNativeAdProps {
  slotKey: string;
}

const SmallNativeAd: React.FC<
  SmallNativeAdProps
> = ({ slotKey }) => {
  const {
    isReady,
    isNative,
    isPremium,
    ensureFeed,
  } = useNativeAds();

  useEffect(() => {
    if (!isReady || !isNative || isPremium) return;

    ensureFeed(
      TRANSACTIONS_FEED,
      NativeAdTemplate.Small
    );
  }, [
    isReady,
    isNative,
    isPremium,
    ensureFeed,
  ]);

  if (!isReady || !isNative || isPremium) {
    return null;
  }

  return (
    <div className="native-ad-wrapper native-ad-small">
      <div className="native-ad-label">
        Sponsored
      </div>

      {createElement('capacitor-admob-native', {
        'feed-id': TRANSACTIONS_FEED,
        'slot-key': slotKey,
      })}
    </div>
  );
};

export default SmallNativeAd;
