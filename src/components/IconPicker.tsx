import React, { useState } from 'react';

import '../Main.css';
import './IconPicker.css';

// --- Data Definitions (Keep these as they are) ---
// ... categories and accounts objects ...

const categories = {
  animals: ["fa-paw", "fa-fish-fins", "fa-horse", "fa-horse-head", "fa-dove", "fa-dog","fa-shield-dog", "fa-cat", "fa-shield-cat", "fa-cow"],
  buildings: ["fa-house", "fa-city", "fa-tree-city", "fa-building-columns", "fa-building", "fa-store", "fa-hotel", "fa-place-of-worship", "fa-hospital", "fa-warehouse"],
  business: ["fa-credit-card", "fa-money-bill", "fa-computer", "fa-print", "fa-calculator", "fa-paperclip", "fa-mobile-retro", "fa-scale-balanced", "fa-boxes-packing", "fa-book-bookmark"],
  education: ["fa-book", "fa-pen", "fa-school", "fa-graduation-cap", "fa-chalkboard-user"],
  food: ["fa-mug-saucer", "fa-wheat-awn", "fa-lemon", "fa-wine-bottle", "fa-pizza-slice", "fa-pepper-hot", "fa-martini-glass-citrus", "fa-ice-cream", "fa-hotdog", "fa-carrot", "fa-cake-candles", "fa-burger", "fa-bowl-rice", "fa-bowl-food", "fa-apple-whole"],
  health: ["fa-suitcase-medical", "fa-stethoscope", "fa-glasses", "fa-star-of-life", "fa-heart-pulse", "fa-bandage", "fa-tooth", "fa-flask", "fa-truck-medical", "fa-pills"],
  hobbies: ["fa-film", "fa-music", "fa-camera-retro", "fa-guitar", "fa-ticket", "fa-palette", "fa-gamepad", "fa-paintbrush", "fa-masks-theater", "fa-chess-knight"],
  household: ["fa-lightbulb", "fa-fire-burner", "fa-phone", "fa-wifi", "fa-satellite-dish", "fa-key", "fa-paint-roller", "fa-brush", "fa-wrench", "fa-hammer",  "fa-screwdriver-wrench", "fa-faucet-drip", "fa-display", "fa-laptop", "fa-couch", "fa-chair", "fa-utensils","fa-wine-glass-empty", "fa-kitchen-set", "fa-blender"],
  nature: [ "fa-star", "fa-bolt", "fa-droplet", "fa-fire", "fa-tree", "fa-snowflake", "fa-sun", "fa-cloud-sun","fa-cloud", "fa-mountain-sun", "fa-water", "fa-moon", "fa-feather", "fa-seedling", "fa-snowman", "fa-mountain-city", "fa-clover", "fa-caravan", "fa-campground", "fa-binoculars"],
  miscellaneous: ["fa-globe", "fa-heart", "fa-face-smile", "fa-hand-holding-heart", "fa-smoking"],
  people: ["fa-baby", "fa-baby-carriage", "fa-wheelchair", "fa-user-graduate", "fa-bed"],
  personalCare: ["fa-scissors", "fa-spa", "fa-ribbon", "fa-leaf", "fa-mask"],
  shopping: ["fa-cart-shopping", "fa-bag-shopping", "fa-gift", "fa-shirt", "fa-cart-plus", "fa-tags", "fa-crown", "fa-gifts", "fa-gem", "fa-basket-shopping"],
  sports: ["fa-dumbbell", "fa-bicycle", "fa-trophy", "fa-water-ladder", "fa-volleyball", "fa-person-swimming", "fa-person-skiing", "fa-person-hiking", "fa-person-biking", "fa-golf-ball-tee", "fa-futbol", "fa-football", "fa-basketball", "fa-baseball-bat-ball", "fa-baseball"],
  travel: ["fa-compass", "fa-earth-americas", "fa-anchor", "fa-cable-car", "fa-ship", "fa-umbrella-beach", "fa-plane-departure", "fa-suitcase-rolling", "fa-sailboat", "fa-ferry"],
  vehicles: ["fa-car", "fa-truck", "fa-gauge", "fa-car-side", "fa-truck-front", "fa-motorcycle", "fa-train", "fa-truck-monster", "fa-van-shuttle", "fa-taxi", "fa-oil-can", "fa-helicopter", "fa-gas-pump", "fa-charging-station", "fa-bus"],
};

const accounts = {
  accountIcons: ["fa-globe", "fa-compass", "fa-signature", "fa-hexagon-nodes", "fa-credit-card", "fa-money-bill-1-wave", "fa-dragon", "fa-piggy-bank", "fa-award", "fa-atom", "fa-bullseye", "fa-wallet", "fa-scale-balanced", "fa-handshake", "fa-ranking-star"],
};

// --- Prop Interface Update ---
type IconPickerView = 'categories' | 'accounts';

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  isDisabled?: boolean; 
  defaultView?: IconPickerView; 
}

const IconPicker: React.FC<IconPickerProps> = ({ onIconSelect, selectedIcon, isDisabled, defaultView = 'categories' }) => {
  
  // 💡 STATE INITIALIZATION: Use the 'defaultView' prop if passed, otherwise use its default value (which is 'categories' in the destructured props).
  const [view, setView] = useState<IconPickerView>(defaultView);

  /**
   * Renders a grid of icons for a given section (category or account type).
   * @param iconArray The array of icon names.
   * @returns JSX element for the icon grid.
   */
  const renderIconGrid = (iconArray: string[]) => (
    <div className="icon-picker-grid">
      {iconArray.map((iconName) => (
        <button
          key={iconName}
          disabled={isDisabled}
          onClick={() => onIconSelect(iconName)}
          className={`icon-picker-button ${selectedIcon === iconName ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
        >
          <i className={`fas ${iconName} icon-picker-font`}></i>
        </button>
      ))}
    </div>
  );

  /**
   * Renders the view based on the current 'view' state.
   * @returns JSX element for the current content (Categories or Accounts).
   */
  const renderContent = () => {
    if (view === 'categories') {
      return Object.entries(categories).map(([category, icons]) => (
        <div key={category}>
          <h6>{category.charAt(0).toUpperCase() + category.slice(1)}</h6>
          <hr />
          {renderIconGrid(icons)}
        </div>
      ));
    } else {
      // view === 'accounts'
      const accountIcons = accounts.accountIcons;
      return (
        <div>
          {renderIconGrid(accountIcons)}
        </div>
      );
    }
  };

  return (
    <div className='icon-picker-container'>
      {/* 🖼️ Icon Grid Content */}
      <div className='icon-grid-container'>
        {renderContent()}
      </div>
    </div>
  );
};

export default IconPicker;