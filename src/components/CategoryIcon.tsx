/*
This component shows a round background with the category icon.
*/

import React from "react";


// Ionic's components
import { 
  IonIcon
} from '@ionic/react';


//Styles
import "../Main.css";
import "./CategoryOption.css";  
import { airplane } from "ionicons/icons";

interface CategoryProps {
  categoryColor: string;
  iconName: string; 
  tripId?: number | null;
  autoLogged?: boolean;
  isTransaction?: boolean;
  isReportsCategory?: boolean;
}

const Category: React.FC<CategoryProps> = ({
  categoryColor,
  iconName,
  tripId,
  autoLogged,
  isTransaction,
  isReportsCategory
}) => {


  return (
    <div className="category-container-wrapper centered-container">  
      <div className={`category  ${isTransaction ? 'transaction-category' : ''} ${isReportsCategory ? 'reports-category' : ''} ${categoryColor}-bg`}>  
        <i className={`fas ${iconName}`}></i>
      </div>
      {tripId && tripId !== 0 && (
        <IonIcon icon={airplane} className="travel-icon" />
      )}
      {typeof autoLogged === 'boolean' && ( // renders the span only if autoLogged is defined (either true or false)
        <span className={`recursive-mode ${autoLogged ? 'auto' : 'manual'}`}>
          {autoLogged ? 'A' : 'M'}
        </span>
      )}
    </div>
  )
};

export default Category;
