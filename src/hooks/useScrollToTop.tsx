import { useIonViewDidEnter } from '@ionic/react';
import { useRef } from 'react';

const useScrollToTop = () => {
  const contentRef = useRef<HTMLIonContentElement | null>(null);

  useIonViewDidEnter(() => {
    if (contentRef.current) {
      contentRef.current.scrollToTop(0);
    }
  });

  return contentRef;
};

export default useScrollToTop;
