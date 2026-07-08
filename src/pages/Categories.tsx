import React, { useEffect, useState } from 'react';
import { db } from "../db";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from 'react-i18next';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook



// App components
import CategoryOption from '../components/CategoryOption';
import Footer from '../components/Footer'


// Ionic components
import { 
  IonAlert,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonPage, 
  IonPopover,
  IonTitle,
  IonToolbar,
} from '@ionic/react';


// Icons
import { 
  add,
  barChartOutline, 
  cashOutline, 
  ellipsisVertical,
  eyeOffOutline,
  eyeOutline,
  home,
  homeOutline,
  informationCircleOutline,
  layersOutline
} from 'ionicons/icons';



// Styles
import '../Main.css';
import './Categories.css';


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/accounts', icon: layersOutline },
  { title: 'Add', url: '/newcategory', icon: add },
  { title: 'activity', url: '/activity', icon: cashOutline }
];



const Categories: React.FC = () => { 
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { user, updateUser } = useUser(); // Access user context

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  
  // Local state to toggle inactive categories visibility
  const [showInactive, setShowInactive] = useState(user.showDisabledCategories);

  // Show helpfull tip
  const [showInfo, setShowInfo] = useState<boolean>(false);

  useEffect(() => {
    setShowInactive(user.showDisabledCategories);
  }, [user.showDisabledCategories]); // initialize showInactive 

  
  const categories = useLiveQuery(() => db.categories.toArray());

  // Check if there are any inactive categories
  const hasInactiveCategories = categories?.some(category => !category.activeCategory);

  // Filter and sort categories based on local state
  const filteredCategories = categories
    ?.filter(category => showInactive || category.activeCategory)
    .sort((a, b) => (showInactive ? Number(b.activeCategory) - Number(a.activeCategory) : 0));


  // Translate footer menu items
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));

  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  // Update showDisabledCategories in user context
  const showDisabledCategories = (checked: boolean) => {
    setShowInactive(checked); // Update local state
    updateUser({ showDisabledCategories: checked }); // Update context
  };  
  
  
  

  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>  
          {/* Secondary menu for this category */}
          {hasInactiveCategories && (
            <IonButtons slot="end">
              {/* Button to open the popover */}
              <IonButton  onClick={openPopover}>
                <IonIcon icon={ellipsisVertical} />
              </IonButton>

              {/* Popover positioned at the button's bottom-right */}
              <IonPopover 
                isOpen={isPopoverOpen} 
                event={popoverEvent} // Position it based on the button click
                onDidDismiss={closePopover} 
                side="bottom" // Align popover below the button
                alignment="end" // Align popover to the right of the button
                className='secondary-menu'
              >
                <IonContent class="ion-no-padding">
                  <ul className='list'>
                    <li 
                      className="item" 
                      onClick={() => {
                        closePopover(); // First, close the popover
                        showDisabledCategories(!showInactive); // Then update state after a brief delay
                      }}
                    >
                      <IonIcon 
                        icon={showInactive ? eyeOffOutline : eyeOutline} 
                        className="icon"
                        style={{ marginRight: "15px" }} // Optional spacing
                      />
                      {showInactive ? t('common.hide_inactive') : t('common.show_inactive')}
                    </li>
                  </ul>
                </IonContent>
              </IonPopover>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <div className="centered-container mb-30">
          <h2 className='screen-title'>{t('categories.categories')}</h2>
        </div>

        <div className="section-header">
          <div className="flex-top ml-20">  
            <h6 className='section-title'>{t('categories.manage_categories')}</h6>   
            <IonIcon 
              icon={informationCircleOutline} 
              className="info-icon"
              onClick={() => setShowInfo(true)}
            />
          </div>
        </div>
        
        {/* Category grid */}
        <section className='centered-container'>
          <div className="categories-grid"> 
            {filteredCategories?.map((category) => (
              <CategoryOption       
                key={category.categoryId}
                categoryId={category.categoryId} 
                categoryName={
                  category.systemCategory
                    ? t(`categories.${category.categoryName}`)
                    : category.categoryName
                } 
                categoryColor={category.activeCategory ? category.categoryColor : "neutral"} 
                iconName={category.categoryIcon} 
                isFavourite={category.favouriteCategory}
              />
            ))}
          </div>
        </section>

        <IonAlert
          isOpen={showInfo}
          className='custom-alert'
          onDidDismiss={() => setShowInfo(false)}
          header={t('categories.about_categories')}
          message={t('categories.about_categories_message')}
          buttons={['OK']}
        />
      </IonContent>

      <Footer appPages={translatedMenuItems} />

    </IonPage>
  );
};

export default Categories;