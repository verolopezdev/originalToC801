import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from "../db";


// App components
import CategoryIcon from './CategoryIcon';

// Ionic components 
import { 
  IonIcon,
  IonModal,
} from '@ionic/react';


// Ionic icons
import { 
  heart,
  heartOutline
} from 'ionicons/icons';


// Styles
import '../Main.css';
import '../pages/Categories.css';


type Subcategory = {
  subcategoryId: string;
  subcategoryName: string;
  subcategoryColor: string;
  subcategoryIcon: string;
  activeSubcategory: boolean;
  favouriteSubcategory: boolean;
  parentCategoryId: string;
}

type Category = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  activeCategory: boolean;
  favouriteCategory: boolean;
  systemCategory: boolean;
  subcategories: boolean;
}


interface CategoryPickerProps {
  selectedCategory?:  string;
  selectedSubcategory?: string;
  onCategorySelect: (selection: { categoryId: string; categoryName: string; subcategoryId: string, subcategoryName: string }) => void;
  excludeFirst?: boolean; // Optionally exclude the first category
  showFavourites?: boolean; // Show only favourite categories & subcategories 
  onlyCategories?: boolean; // ✅ New prop
  currentCategoryId?: string; // The ID of the category currently being edited/merged 
  currentSubcategoryId?: string; // The ID of the subcategory currently being edited/merged
}


const CategoryPicker: React.FC<CategoryPickerProps> = ({ 
  selectedCategory, 
  selectedSubcategory, 
  onCategorySelect, 
  excludeFirst, 
  showFavourites, 
  onlyCategories,
  currentCategoryId,
  currentSubcategoryId 
}) => {
  const { t } = useTranslation();
  
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [activeSubcategories, setActiveSubcategories] = useState<Subcategory[]>([]);
    
  let favouriteCategories: Array<any> = [];
  let favouriteSubcategories: Array<any> = [];
  let parentCategory: any = null; // Holds data for parent category
  
  // State for managing subcategory modal
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState<string | null>(null); // Parent category Id that has subcategories
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]); // Saves all subcategories for a parent category

  // Get all active categories
  useEffect(() => {
    const fetchCategories = async () => {
      const allCategories = await db.categories.toArray();
      setActiveCategories(allCategories.filter(cat => cat.activeCategory));
    };

    const fetchSubcategories = async () => {
      const allSubcategories = await db.subcategories.toArray();
      setActiveSubcategories(allSubcategories.filter(cat => cat.activeSubcategory));

      // This opens subcategory modal if selectedSubcategory has content
      if (selectedSubcategory && selectedSubcategory !== '' && allSubcategories.length > 0) {
        const subcategory = allSubcategories.find(sub => sub.subcategoryId === selectedSubcategory);
    
        if (subcategory) {
          // Set the parent ID to open the subcategory modal
          setSelectedCategoryForSub(subcategory.parentCategoryId);
        }
      }
    };

    fetchCategories();
    fetchSubcategories();

  }, []);


  // Get subcategories for selected parent category
  async function fetchSubcategories(categoryId: string | null): Promise<Subcategory[]> {
    if (categoryId !== null) {
      const result = await db.subcategories
        .where("parentCategoryId")
        .equals(categoryId)
        .and((subcategory) => subcategory.activeSubcategory)
        .toArray();
  
      return result;
    } else {
      return [];
    }
  }


  useEffect(() => {
    const getSubcategories = async () => {
      const result = await fetchSubcategories(selectedCategoryForSub);
      setFilteredSubcategories(result);
    };
    getSubcategories();
  }, [selectedCategoryForSub]);


  // Get data to show parent category inside small modal with subcategories
  if (selectedCategoryForSub) {
    const foundCategory = activeCategories?.find(activeCategory => activeCategory.categoryId === selectedCategoryForSub);
    
    if (foundCategory) {
      parentCategory = {
        categoryId: foundCategory.categoryId,
        categoryName: foundCategory.categoryName,
        subcategoryId: null, // No subcategory
        name: foundCategory.categoryName,
        color: foundCategory.categoryColor,
        icon: foundCategory.categoryIcon,
        fav: foundCategory.favouriteCategory
      };
    }
  }

  const loadFavourites = () => {
    // Map categories to a common structure
    favouriteCategories = activeCategories
      ?.filter(category => category.activeCategory && category.favouriteCategory)
      .map(category => ({
        categoryId: category.categoryId,
        subcategoryId: null, // No subcategory
        name: category.categoryName,
        color: category.categoryColor,
        icon: category.categoryIcon,
        fav: category.favouriteCategory
      })) || [];

    // Map subcategories to a common structure
    favouriteSubcategories = activeSubcategories
      ?.filter(subcategory => subcategory.activeSubcategory && subcategory.favouriteSubcategory)
      .map(subcategory => ({
        categoryId: subcategory.parentCategoryId, // Parent category ID
        subcategoryId: subcategory.subcategoryId, // Subcategory ID
        name: subcategory.subcategoryName,
        color: subcategory.subcategoryColor,
        icon: subcategory.subcategoryIcon,
        fav: subcategory.favouriteSubcategory
      })) || [];
  }

  // Get every favourite category and subcategory
  if (showFavourites) {
    loadFavourites();
  }


  // Optionally exclude the first category to select parent category of subcategory 
  useEffect(() => {
    if (excludeFirst) {
      setActiveCategories(prev => prev.slice(1));
    }
  }, [excludeFirst]);


  const handleClick = async (categoryId: string, categoryName: string, subcategoryId: string, subcategoryName: string, hasSubcategories: boolean) => {
    if (!onlyCategories && hasSubcategories) {
      setSelectedCategoryForSub(categoryId);
    } else {
      if (selectedCategoryForSub) {
        // Subcategory modal is open
        setSelectedCategoryForSub(null); // Close subcategory modal first
  
        // Wait for the subcategory modal to close before triggering selection
        setTimeout(() => {
          onCategorySelect({ categoryId, categoryName, subcategoryId, subcategoryName });
        }, 300); // Wait a bit for animation to complete
      } else {
        // Just close the main modal
        onCategorySelect({ categoryId, categoryName, subcategoryId, subcategoryName });
      }
    }
  };
  

  let categoriesToRender;
  let subcategoriesToRender;
  
  if (currentSubcategoryId) {
    subcategoriesToRender = filteredSubcategories.filter(
      subcat => subcat.subcategoryId !== currentSubcategoryId
    );
  
    categoriesToRender = activeCategories;
  } else {
    categoriesToRender = currentCategoryId
      ? activeCategories.filter(cat => cat.categoryId !== currentCategoryId)
      : activeCategories;
  
    subcategoriesToRender = filteredSubcategories;
  }
  
  

  return (
    <>
      {/* Show favourite categories and subcategories as default */}
      {showFavourites ? (
        <section className='centered-container'>
          {favouriteCategories.length === 0 && favouriteSubcategories.length === 0 ? (
            <>
              <IonIcon icon={heartOutline} className="no-favourites-screen" />
              <h2 className='screen-title'>{t('categories.no_favs_yet')}</h2>
              <p className='screen-prompt'>{t('categories.no_favs_yet_msg')}</p>
            </>
          ) : (
            <div className="categories-grid">
              {/* Loop through favourite categories */}
              {favouriteCategories.map((category) => (
                <div
                  key={category.categoryId} 
                  className={`category-container centered-container ${category.categoryId === selectedCategory && !selectedSubcategory ? "selected-category" : ""}`} // ✅ Check for selectedSubcategory
                  onClick={() => handleClick(category.categoryId, category.categoryName, '', '', category.subcategories)}  
                >
                  <CategoryIcon categoryColor={category.color} iconName={category.icon} />
                  <div className="category-name">
                    <span>{category.name}</span>
                  </div>
                  {category.fav && <IonIcon icon={heart} className="favorite-icon" />}
                </div>
              ))}

              {/* Loop through favourite subcategories */}
              {!onlyCategories && favouriteSubcategories.map((subcategory) => (                
                <div
                  key={subcategory.subcategoryId} 
                  className={`category-container centered-container ${subcategory.subcategoryId === selectedSubcategory ? "selected-category" : ""}`}
                  onClick={() => handleClick(subcategory.categoryId, subcategory.subcategoryName, subcategory.subcategoryId, subcategory.subcategoryName, false)}
                >
                  <CategoryIcon categoryColor={subcategory.color} iconName={subcategory.icon} />
                  <div className="category-name">
                    <span>{subcategory.name}</span>
                  </div>
                  {subcategory.fav && <IonIcon icon={heart} className="favorite-icon" />}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        // Show every active category, if it has subcategories a small modal will open
        <section className='centered-container'>
          <div className="categories-grid">
            {categoriesToRender?.map((category) => (
              <div
                key={category.categoryId} 
                className={`category-container centered-container ${category.categoryId === selectedCategory && !selectedSubcategory ? "selected-category" : ""}`} // ✅ Check for selectedSubcategory
                onClick={() => handleClick(category.categoryId, category.categoryName, '', '', category.subcategories)}
              >
                <CategoryIcon categoryColor={category.categoryColor} iconName={category.categoryIcon} />
                <div className="category-name">
                  <span>{category.categoryName}</span>
                </div>
                {category.favouriteCategory && <IonIcon icon={heart} className="favorite-icon" />}
              </div>
            ))}
          </div>

          {/* Subcategory Modal */}
          <IonModal isOpen={!!selectedCategoryForSub} onDidDismiss={() => setSelectedCategoryForSub(null)} className="small-modal">
            <div className="modal-content mt-30">
              {/* Show parent category */}
              {parentCategory && (
                <div className="centered-container">
                  <div
                    className={`category-container ${parentCategory.categoryId === selectedCategory && !selectedSubcategory ? "selected-category" : ""}`} // ✅ Check for selectedSubcategory
                    onClick={() => handleClick(parentCategory.categoryId, parentCategory.categoryName, '', '', false)}
                  >
                    <CategoryIcon categoryColor={parentCategory.color} iconName={parentCategory.icon} />
                    <div className="category-name">
                      <span>{parentCategory.name}</span>
                    </div>
                    {parentCategory.fav && <IonIcon icon={heart} className="favorite-icon" />}
                  </div>
                </div>
              )}


              {/* Show subcategories */}
              <div className="categories-grid-modal mt-20">
                {subcategoriesToRender.map((subcategory) => (
                  <div
                    key={subcategory.subcategoryId} 
                    className={`category-container-modal centered-container ${subcategory.subcategoryId === selectedSubcategory ? "selected-category" : ""}`}
                    onClick={() => handleClick(subcategory.parentCategoryId, parentCategory.categoryName, subcategory.subcategoryId, subcategory.subcategoryName, false)}
                  >
                    <CategoryIcon categoryColor={subcategory.subcategoryColor} iconName={subcategory.subcategoryIcon} />
                    <div className="category-name">
                      <span>{subcategory.subcategoryName}</span>
                    </div>
                    {subcategory.favouriteSubcategory && <IonIcon icon={heart} className="favorite-icon" />}
                  </div>
                ))}
              </div>
            </div>
          </IonModal>
        </section>
      )}  

    </>
  );
}

export default CategoryPicker;