// child component to show select with time frecuency
// weekly, monthly, yearly
// parent component is a card, like DashboardMainCard, where the select is shown
// can update data in card in selected time frame
// grandparent component is page, like Dashboard where the card is shown
// can update data in page in selected time frame

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';


// Ionic components
import {
  IonIcon,
} from '@ionic/react';


// Ionic icons
import { 
  caretDownOutline, 
  caretUpOutline, 
} from 'ionicons/icons';


// Styles
import './CardFrecuencyPicker.css';


// Define a strict type for interval options
type IntervalOption = "weekly" | "monthly" | "yearly";


type CardFrecuencyPickerProps = {
  selectedInterval: "weekly" | "monthly" | "yearly";
  setSelectedInterval: (interval: "weekly" | "monthly" | "yearly") => void;
};


const CardFrecuencyPicker: React.FC<CardFrecuencyPickerProps> = ({ selectedInterval, setSelectedInterval }) => {  
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Reference to the dropdown

  const handleInterval = (value: "weekly" | "monthly" | "yearly") => {
    setSelectedInterval(value); 
    setIsOpen(false);
  };


  // Dropdown options
  const options: IntervalOption[] = ['weekly', 'monthly', 'yearly'];
  
  // Close the dropdown if the user clicks or taps outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Add both mouse and touch event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Cleanup event listeners on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className='card-select-interval' ref={dropdownRef}>  
      {/* Dropdown trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className='interval-label'
      >
        {t(`date.${selectedInterval}`)}
        {/* Chevron icon */}
        <IonIcon
          icon={isOpen ? caretUpOutline : caretDownOutline}
          className='interval-chevron'
        />
      </div>
      {/* Dropdown menu */}
      {isOpen && (
        <ul className='interval-dropdown'>  
          {options.map((option) => (
            <li
              key={option}
              onClick={() => handleInterval(option)}
              className={`interval-item ${
                selectedInterval === option ? 'interval-item-selected' : 'interval-item'
              }`}
            >
              {t(`date.${option}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CardFrecuencyPicker;