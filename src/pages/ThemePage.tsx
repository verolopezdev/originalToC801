import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// App components
import ColorPicker from '../components/ColorPicker';

// Ionic Icons
import { 
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader,
  IonImg, 
  IonPage, 
  IonToolbar 
} from '@ionic/react';

// Styles
import './ThemePage.css';

const ThemePage: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { themeColor, setThemeColor } = useTheme(); 
  const color = themeColor.split("-")[1]; // Extracts "red"

  const [selectedColor, setSelectedColor] = useState<string | null>(color);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  // Update cardColor whenever selectedColor changes
  useEffect(() => {
    if (selectedColor) {
      setThemeColor(selectedColor);
    }
  }, [selectedColor]);

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        
        {/* Screen Header */}
        <section className='centered-container'>
          <h2 className='screen-title'>{t('themes.theme_title')}</h2>
          <IonImg
            src={`assets/images/themes/${color}-theming.svg`} // Dynamically set the SVG source
            alt="Theme image"
            className='screen-narrow-img'
          ></IonImg>
          <p className='screen-prompt'>{t('themes.theme_prompt')}</p>
        </section>

        {/* Color Picker */}
        <section>
          <h6 className='section-title'>{t('themes.choose_color')}</h6>
          <ColorPicker onColorSelect={handleColorSelect} />
        </section>
        
      </IonContent>
    </IonPage>
  );
};

export default ThemePage;