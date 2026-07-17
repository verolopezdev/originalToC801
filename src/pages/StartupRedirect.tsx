// src/components/StartupRedirect.tsx
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { Preferences } from '@capacitor/preferences';

const StartupRedirect: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    const checkRoute = async () => {
      // 1. Check if the user has made an initial choice or logged in
      const { value: userMode } = await Preferences.get({ key: 'userMode' }); // e.g., 'free' or 'account'
      const { value: country } = await Preferences.get({ key: 'selectedCountry' });

      console.log("Startup Check - Mode:", userMode, "Country:", country);

      const hasValidCountry = country && country !== "null" && country !== "undefined";

      // 2. Route based on status
      if (userMode === 'free') {
        if (hasValidCountry) {
          history.replace('/dashboard');
        } else {
          history.replace('/select-country');
        }
      } else if (userMode === 'account') {
        // Direct logged-in user to dashboard or login check
        history.replace('/dashboard');
      } else {
        // First time opening the app -> Welcome screen
        history.replace('/welcome');
      }
    };

    checkRoute();
  }, [history]);

  return null;
};

export default StartupRedirect;