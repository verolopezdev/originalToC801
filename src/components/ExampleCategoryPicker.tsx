import React from 'react';
import { IonList, IonItem, IonLabel, IonPage } from '@ionic/react';

interface Subcategory {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  subcategories?: Subcategory[];
}


interface Props {
  categories: Category[];
  onCategoryWithSubcategories: (category: Category) => void;
  onSimpleCategorySelected: (category: Category) => void;
}

const ExampleCategoryPicker: React.FC<Props> = ({
  categories,
  onCategoryWithSubcategories,
  onSimpleCategorySelected,
}) => {
  return (
        <IonList>
        {categories.map((cat) => (
            <IonItem
            key={cat.id}
            button
            onClick={() =>
                cat.subcategories
                ? onCategoryWithSubcategories(cat)
                : onSimpleCategorySelected(cat)
            }
            >
            <IonLabel>{cat.name}</IonLabel>
            </IonItem>
        ))}
        </IonList>
  );
};

export default ExampleCategoryPicker;
