// src/components/StartupRedirect.tsx
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { Preferences } from '@capacitor/preferences';

const StartupRedirect: React.FC = () => {
  const history = useHistory();
  //const { isReady } = useDatabase(); // Grab the global state

  useEffect(() => {
    //if (!isReady) return;
  
    const checkRoute = async () => {
      const { value: country } = await Preferences.get({ key: 'selectedCountry' });
      
      // Debug: See exactly what the app thinks the country is after reset
      console.log("Startup Check - Country:", country);
  
      // Ensure country exists AND is not the string "null" or "undefined"
      if (country && country !== "null" && country !== "undefined") {
        history.replace('/dashboard');
      } else {
        // This is where you want to land after a Reset
        history.replace('/select-country');
      }
    };
  
    checkRoute();
  }, [history]);

  // Show a clean loading state while restoring
/*   if (!isReady) {
    return (
      <div className="ion-page ion-justify-content-center ion-align-items-center">
        <p>Initializing Database...</p>
      </div>
    );
  }
 */
  return null;
};

export default StartupRedirect;