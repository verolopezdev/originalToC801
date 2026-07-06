import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

const AppLevelBackButtonHandler = () => {
  useEffect(() => {
    let removeListener: () => void;

    const setup = async () => {
      const handler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        console.log('Back button press intercepted and blocked.');

        // Do absolutely nothing — and it stops default behavior.
        // Don't use alert or history.goBack()
      });

      removeListener = handler.remove;
    };

    setup();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  return null;
};

export default AppLevelBackButtonHandler;
