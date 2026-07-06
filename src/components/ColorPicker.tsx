import React, { useEffect, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import './ColorPicker.css';

// Ionic components
import {
  IonButton, 
  IonIcon
} from '@ionic/react';

// Icons
import { 
  diamond 
} from 'ionicons/icons';


interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  initialColor?: string; // New prop for preselected color
  isDisabled?: boolean; // Show every color button disabled
}

const colors = [
  { name: 'red' },
  { name: 'redOrange' },
  { name: 'orange' },
  { name: 'yellowOrange' },
  { name: 'yellow' },
  { name: 'yellowGreen' },
  { name: 'green' },
  { name: 'cyan' },
  { name: 'skyBlue' },
  { name: 'blue' },
  { name: 'indigo' },
  { name: 'violet' },
  { name: 'magenta' },
  { name: 'pink' },
  { name: 'crimson' }, 
];


const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, initialColor, isDisabled }) => {
  const { user } = useUser(); // Access user context
  const { themeColor } = useTheme(); // theme-yellow

  const [currentColor, setCurrentColor] = useState<string>(initialColor || themeColor.split('-')[1]);

  // Update selected color when initialColor changes (e.g., from database)
  useEffect(() => {
    if (initialColor) {
      setCurrentColor(initialColor);
    }
  }, [initialColor]);

  const handleColorChange = (color: string) => {
    onColorSelect(color);
    setCurrentColor(color);
  };

  return (
    <div className='color-picker-grid'> 
      {colors.map((color) => {
        // const isLast10 = index >= colors.length - 10; // Check if the item is in the last 10
        // const isDisabled = !subscribed && isLast10; // Disable if unsubscribed and in the last 10
  
        return (
          <IonButton
            disabled={isDisabled}
            key={color.name}
            style={{
              backgroundColor: `var(--${color.name})`,
              border: currentColor === color.name ? '3px solid white' : 'none', // Inner white border
              boxShadow: currentColor === color.name ? '0 0 0 2px gray' : 'none', // Outer gray border
            }}
            onClick={() => handleColorChange(color.name)}
            fill="clear" // Makes the button background style fully controlled by inline styles
            className="color-picker-btn"
            >
              {/* {isDisabled && <IonIcon slot="icon-only" icon={diamond} />} Show diamond icon for disabled buttons */}
          </IonButton>
        )})}
    </div>
  );
};

export default ColorPicker;