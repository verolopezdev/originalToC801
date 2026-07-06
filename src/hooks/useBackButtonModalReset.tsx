import { useEffect } from "react";
import { App } from "@capacitor/app";

const useBackButtonModalReset = (
  isOpen: boolean, 
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  useEffect(() => {

    const registerBackButton = async () => {
      const backButtonHandler = await App.addListener("backButton", ({ canGoBack }) => {

        if (isOpen) {
          setIsOpen(false); // Close modal if open
        } else if (!canGoBack) {
          App.exitApp();
        }
      });

      return () => backButtonHandler.remove();
    };

    const unregister = registerBackButton();

    return () => {
      unregister.then(removeListener => removeListener());
    };
  }, [isOpen]); // Depend on isOpen and modalName
};

export default useBackButtonModalReset;
