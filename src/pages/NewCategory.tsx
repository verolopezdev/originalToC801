import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';


// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop'; 
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';


// Utils
import { validateName } from '../utils/validateName';


// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonModal,
  IonPage,
  IonTitle, 
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';


// Ion icon components
import { 
  chevronForwardOutline,
  closeOutline,
  heart,
  heartOutline
} from 'ionicons/icons';


// App's components
import CategoryPreview from '../components/CategoryPreview';
import ColorPicker from '../components/ColorPicker';
import IconPicker from '../components/IconPicker';
import Modal from '../components/Modal';


// Styles
import '../Main.css';


const NewCategory: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { user, updateUser } = useUser(); // Access user context
  const [favourites, setFavourites] = useState<number>(0);
  const { themeColor } = useTheme();
  const color = themeColor.split("-")[1]; // Extracts color name to initialize selectedColor
  const [categoryColor, setCategoryColor] = useState<string>(color);
  const [categoryIcon, setCategoryIcon] = useState<string>("fa-house");
  const [categoryName, setCategoryName] = useState<string>('');
  const [favouriteCategory, setFavouriteCategory] = useState<boolean>(false);
  const activeCategory = true;
  const systemCategory = false;
  const subcategories = false;
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isOpenCategoryModal, setIsOpenCategoryModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
    destination: '',
  });
  
  const [error, setError] = useState<string | null >(null);
  
  useKeyboardAutoClose();
  
  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isOpenCategoryModal, setIsOpenCategoryModal);


  useEffect(() => {
    if(user) {
      setFavourites(user.favourites);
    }
  }, []);

  
  // Update categoryColor when themeColor changes
  useEffect(() => {
    setCategoryColor(color); // Update categoryColor when themeColor changes
  }, [color]);


  // Initialize variables every time the component is visited
  useIonViewWillEnter(() => {
    setCategoryName('');
    setCategoryIcon("fa-house");
    setCategoryColor(color);
    setFavouriteCategory(false);
  });


  
  // Handle input name validation  
  const handleInputChange = async ( value: string ) => {

    setCategoryName(value); // Always update the input state first
    
    // 1. Check if the value is empty
    if (!value.trim()) {
      setError(t('common.field_required'));
      setIsFormValid(false);
      return;
    }

    // 2. Validate format (e.g., allowed characters)
    if (!validateName(value)) {
      setError(t('common.invalid_name'));
      setIsFormValid(false);
      return;
    }

    // 3. Check if the category name exists in categories and subcategories
    const categoryExists = await db.categories.where("categoryName").equalsIgnoreCase(value).count();
    const subcategoryExists = await db.subcategories.where("subcategoryName").equalsIgnoreCase(value).count();

    if (categoryExists > 0 || subcategoryExists > 0) {
      setError(t('categories.already_exists'));
      setIsFormValid(false);
      return;
    }

    // No errors, mark form as valid
    setError(null);
    setIsFormValid(true);
  };


  // Handle color selection
  const handleColorSelect = (color: string) => {
    setCategoryColor(color);
  };

  // Handle favourite category
  const handleFavourite = () => {
    setFavouriteCategory(!favouriteCategory);
    updateUser({ favourites:  favourites + 1})
  }


  // Success Modal
  const openInfoModal = () => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: t('categories.new_cat_added'),
      actions: [
        {
          label: t('common.continue'),
          action: () => setIsConfirmationModalOpen(false),
        },
      ],
      destination: '/app/categories'
    });
    setIsConfirmationModalOpen(true);
  };
  

  // Failure Modal
  const openFailureModal = () => {
    setModalConfig({
      icon: 'failure',
      title: t('modal.failure_modal_title'),
      content: t('modal.failure_add_account_msg'),
      actions: [
        {
          label: t('common.try_again'),
          action: () => setIsConfirmationModalOpen(false),
          style: 'fail-btn', // Optional CSS class
        },
      ],
      destination: '/app/categories'
    });
    setIsConfirmationModalOpen(true);
  };

  
  // Create new account record in database
  async function addNewCategory() {
    try {
      // 🚨 CRITICAL FIX: Wrap the operation in an explicit transaction 🚨
      // We list both 'categories' and 'changes' tables.
      await db.transaction('rw', db.categories, async (tx) => {

        const categoryId = await tx.categories.add({
            categoryName,
            categoryColor,
            categoryIcon,
            activeCategory,
            favouriteCategory,
            systemCategory,
            subcategories
        });
      });
      
      openInfoModal();

    } catch (error) {
      // show error
      openFailureModal();
    }
  }
  
  

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
        <div className='centered-container'>
          <h2 className='screen-title'>{t('categories.add_cat')}</h2>  
        </div>

        {/* Show Category Design */}
        <section>
          <div className="centered-container mt-20">
            <CategoryPreview
              categoryColor= {categoryColor}
              categoryIcon={categoryIcon}
            />
          </div>
        </section>


        {/* Form Section */}
        <section>
          <div className="parent-input">
            <div className="input-container">
              <input
                type="text"
                value={categoryName}
                maxLength={20}
                onChange={(e) => handleInputChange(e.target.value) }
                placeholder={t('categories.category_name')}
                className={`input capitalize ${error ? 'invalid' : ''}`}
              />
              {error && <p className="error-text">{error}</p>}
            </div>
            <button 
              id="open-toast"
              onClick={handleFavourite}
            >
              {favouriteCategory ? <IonIcon icon={heart} /> : <IonIcon icon={heartOutline} />}
            </button>
          </div>
        </section>

        {/* Color picker */}
        <section>
          <h6 className='section-title'>{t('themes.choose_color')}</h6>
          <ColorPicker onColorSelect={handleColorSelect} initialColor={categoryColor} />
        </section>


        {/* Icon picker */}
        <section>
          <h6 className="section-title">{t('categories.choose_icon')}</h6>
          <IonItem button onClick={() => {
            setIsOpenCategoryModal(true);  
          }}>
            <div className='list-item-select'>
              <span>{t('categories.selected_icon')}</span>
              <div>
                <span>
                  {categoryIcon
                    ? <i className={`fas ${categoryIcon} icon`}></i>
                    : t('categories.make_a_selection')}
                </span>
                <IonIcon icon={chevronForwardOutline}></IonIcon>
              </div>
            </div>
          </IonItem>
        </section>

        {/* Add category button */}
        <IonButton
          className="block mb-20"
          onClick={() => {
            if (isFormValid) {
              addNewCategory();
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {t('categories.add_cat')}
        </IonButton>

        {/* Confirmation Modal */}
        <Modal
          isOpen={isConfirmationModalOpen}
          icon={modalConfig.icon}
          title={modalConfig.title}
          content={modalConfig.content}
          closeModal={() => setIsConfirmationModalOpen(false)}
          actions={modalConfig.actions}
          destination={modalConfig.destination}
        />

        {/* Category picker modal */}
        <IonModal isOpen={isOpenCategoryModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('categories.select_an_icon')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsOpenCategoryModal(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
          <IconPicker
            selectedIcon={categoryIcon}
            onIconSelect={(icon) => {
              setCategoryIcon(icon); // Update the selected category
              setIsOpenCategoryModal(false); // Close the modal
            }}
          />
          </IonContent>
        </IonModal>
        
      </IonContent>
    </IonPage>
  );
};

export default NewCategory;