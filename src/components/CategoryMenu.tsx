import React from "react";
import { useTranslation } from 'react-i18next';

import {
  IonContent,
  IonHeader,
  IonItem,
  IonTitle,
  IonToolbar,
  IonList,
  IonCheckbox,
  IonMenu,
} from "@ionic/react";
import { Category } from "../db";
import { resolveCategoryColor } from "../utils/chartFunctions";

import '../Main.css';
import './Menu.css';

interface CategoryMenuProps {
  categories: Category[];
  visibleCategories: string[]; // use IDs instead of names
  onToggleCategory: (categoryId: string) => void;
}

const CategoryMenu: React.FC<CategoryMenuProps> = ({
  categories,
  visibleCategories,
  onToggleCategory,
}) => {
  const { t } = useTranslation();

  return (
    <IonMenu
      menuId="categoryMenu"
      contentId="statistics-content"
      side="end"
      type="overlay"
      swipeGesture={false}
    >
      <IonHeader>
        <IonToolbar className="chart-category-menu-toolbar">
          <IonTitle>{t('categories.select_categories')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div>
          {categories
            .filter((cat) => cat.categoryId !== '')
            .map((cat) => {
              const isChecked = visibleCategories.includes(cat.categoryId);

              return (
                <IonItem key={cat.categoryId} lines="none" className="no-padding ion-no-margin" >
                  <IonCheckbox
                    checked={isChecked}
                    onIonChange={() => onToggleCategory(cat.categoryId)}
                    style={{
                      "--checkbox-background-checked": resolveCategoryColor(cat.categoryColor),
                      "--checkbox-border-color-checked": resolveCategoryColor(cat.categoryColor),
                      "--border-color-checked": resolveCategoryColor(cat.categoryColor),
                    }}
                  >
                    <span
                      style={{
                        color: isChecked
                          ? resolveCategoryColor(cat.categoryColor)
                          : "var(--ion-color-medium)",
                        fontWeight: isChecked ? "bold" : "normal",
                      }}
                    >
                      {cat.categoryName}
                    </span>
                  </IonCheckbox>
                </IonItem>
              );
            })}
        </div>
      </IonContent>
    </IonMenu>
  );
};

export default CategoryMenu;
