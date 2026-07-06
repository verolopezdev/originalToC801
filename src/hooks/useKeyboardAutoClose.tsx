// hooks/useKeyboardAutoClose.ts
import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';

export const useKeyboardAutoClose = () => {
  useEffect(() => {
    const onTouchMove = () => {
      Keyboard.hide();
    };

    document.addEventListener('touchmove', onTouchMove);

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
};
