/*
This component is showed only in Categories.tsx
It shows a round background with the category icon and the name at the bottom.
*/

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { db } from "../db";

// App components
import CategoryIcon from './CategoryIcon';

// Ionic's components
import { 
  IonIcon,
  IonToast,
} from '@ionic/react';

// Ion icon components
import { 
  heartOutline,
  heart
} from 'ionicons/icons';



//Styles
import "../Main.css";
import "./CategoryOption.css";

interface CategoryProps {
  categoryId?: string;
  categoryName?: string;
  destination?: string; // "edit" if empty, "subcategory" to create new 
  isDisabled?: boolean;
  categoryColor: string;
  iconName: string;
  isFavourite?: boolean;
}


const Category: React.FC<CategoryProps> = ({
  categoryId,
  categoryName,
  destination,
  categoryColor,
  iconName,
  isDisabled,
  isFavourite
}) => {
  const { t } = useTranslation();
  
  const history = useHistory(); // This replaces the <IonRouterLink>, giving full control over navigation logic
  const [toastOpen, setToastOpen] = useState(false); // controls visibility of the toast
  const [toastMessage, setToastMessage] = useState("");
  const wasLongPressRef = useRef(false); // a flag to know if the last interaction was a long press
  
  const getLink = (destination?: string) => {
    switch (destination) {
      case "addsubcategory":
        return "/app/newsubcategory/";
      case "editsubcategory":
        return "/app/editsubcategory/";
      default:
        return "/app/editcategory/";
    }
  };
  const link = getLink(destination);


  const handleClick = () => {
    if (!wasLongPressRef.current) {
      history.push(`${link}${categoryId}`);
    }
  };

  const toggleFavorite = async (): Promise<string> => {
    if (categoryId === undefined) {
      console.warn("categoryId is undefined");
      return 'Invalid category';
    }
    let newStatus = false;
    const item = await db.categories.get(categoryId);
    
    if (item) {
      newStatus = !item.favouriteCategory;
      await db.transaction(
        'rw', 
        db.categories,
        async (tx) => {
          await tx.categories.update(categoryId, { favouriteCategory: newStatus });
        }
      );
    }
  
    return newStatus ? t('categories.added_to_favs') : t('categories.removed_from_favs');
  };




  return (
    <>
      {isDisabled ? (
        <div className="category-container centered-container disabled-category">   
          <CategoryIcon categoryColor={categoryColor} iconName={iconName} />
          <div className="category-name">
            <span>{categoryName}</span>
          </div>
        </div>
      ) : (
          <div 
            className="category-container centered-container"
            onClick={handleClick}
          >
            <CategoryIcon categoryColor={categoryColor} iconName={iconName} />
            <div className="category-name">
              <span>{categoryName}</span>
            </div>
            {isFavourite && <IonIcon icon={heart} className="favorite-icon" />}
          </div>
      )}
    
      {/* Updated Favourite */}
      <IonToast
        isOpen={toastOpen}
        message={toastMessage}
        icon={isFavourite ? heart : heartOutline}
        duration={2000}
        position='bottom'
        className="custom-toast"
        buttons={[
          {
            text: t('common.dismiss'),
            role: 'cancel',
          },
        ]}
        onDidDismiss={() => setToastOpen(false)}
      />      
      
    </> 
  );
};

export default Category;
