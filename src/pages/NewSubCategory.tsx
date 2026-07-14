import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useParams } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';


// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop';
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';


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
  useIonViewWillEnter
} from '@ionic/react';


// Ion icon components
import { 
  chevronForwardOutline,
  closeOutline,
  heart,
  heartOutline,
} from 'ionicons/icons';



// App's components
import CategoryIcon from '../components/CategoryIcon';
import CategoryPreview from '../components/CategoryPreview';
import ColorPicker from '../components/ColorPicker';
import IconPicker from '../components/IconPicker';
import Modal from '../components/Modal';


// Styles
import '../Main.css';



const NewSubCategory: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const color = themeColor.split("-")[1]; // Extracts color name to initialize selectedColor
  const { categoryId } = useParams<{ categoryId: string }>(); // category id to fill the form
  const parentCategoryId = categoryId;
  const [parentColor, setParentColor] = useState<string>(color);
  const [parentIcon, setParentIcon] = useState<string>("fa-house");
  const [parentName, setParentName] = useState<string>('');
  
  const [subcategoryColor, setSubcategoryColor] = useState<string>(color);
  const [subcategoryIcon, setSubcategoryIcon] = useState<string>("fa-house");
  const [subcategoryName, setSubcategoryName] = useState<string>('');
  const [favouriteSubcategory, setFavouriteSubcategory] = useState<boolean>(false);
  const activeSubcategory = true;
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


  // Update categoryColor when themeColor changes
  useEffect(() => {
    setSubcategoryColor(color); // Update categoryColor when themeColor changes
  }, [color]);

  // New effect to update category details when parentCategoryId changes
    useEffect(() => {
      if (parentCategoryId) {
        db.categories.get(parentCategoryId).then((parentCategory) => {
          if (parentCategory) {
            setParentName(parentCategory.categoryName);
            setParentColor(parentCategory.categoryColor);
            setParentIcon(parentCategory.categoryIcon);
          }
        });
      }
    }, [parentCategoryId]); // Listen for parentCategoryId changes

  
  // Initialize variables every time the component is visited
  useIonViewWillEnter(() => {
    setSubcategoryName('');
    setSubcategoryIcon("fa-house");
    setSubcategoryColor(color); 
  });
  
  
  // Validation function for category name
  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s@\-_\/.]+$/u; // Allows only alphanumeric characters, spaces @ - _ /
    return nameRegex.test(name);
  };

  
  // Handle input name validation  
  const handleInputChange = async ( value: string ) => {

    setSubcategoryName(value); // Always update the input state first
    
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
    setSubcategoryColor(color);
  };


  // Success Modal
  const openInfoModal = () => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: t('categories.new_subcat_added'),
      actions: [
        {
          label: t('common.continue'),
          action: () => setIsConfirmationModalOpen(false),
        },
      ],
      destination: `/editcategory/${categoryId}`
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
      destination: `/editcategory/${categoryId}`
    });
    setIsConfirmationModalOpen(true);
  };


  // Create new subcategory record in database
  async function addSubcategory() {
    try {
      await db.transaction(
        'rw', 
        db.categories,
        db.subcategories,
        async (tx) => {
      
          await tx.subcategories.add({
            subcategoryName,
            subcategoryColor,
            subcategoryIcon,
            activeSubcategory,
            parentCategoryId,
            favouriteSubcategory
          });

          await tx.categories.update(parentCategoryId, {
            subcategories: true // Set subcategories to true
          });
        }
      );
      
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
          <h2 className='screen-title'>{t('categories.add_subcat')}</h2>
        </div>

        {/* Show Category Design */}
        <section className='mt-20'>
          <div className="centered-container">
            <CategoryPreview
              categoryColor= {subcategoryColor}
              categoryIcon= {subcategoryIcon}
            />
          </div>
        </section>


        {/* Form Section */}
        <section>
          {/* Category name */}
          <div className='parent-input'>
            <div className="input-container">
              <input
                type="text"
                value={subcategoryName}
                maxLength={20}
                onChange={(e) => handleInputChange(e.target.value) }
                placeholder={t('categories.subcat_name')}
                className={`input capitalize ${error ? 'invalid' : ''}`}
              />
              {error && <p className="error-text">{error}</p>}
            </div>
            <button 
              id="open-toast"
              onClick={() => setFavouriteSubcategory(!favouriteSubcategory)}
            >
              {favouriteSubcategory ? <IonIcon icon={heart} /> : <IonIcon icon={heartOutline} />}
            </button>
          </div>
        </section>

        {/* Color picker */}
        <section>
          <h6 className='section-title'>{t('themes.choose_color')}</h6>
          <ColorPicker onColorSelect={handleColorSelect} initialColor={subcategoryColor} />
        </section>


        {/* Icon picker */}
        <section>
          <h6 className="section-title">{t('categories.choose_icon')}</h6>
          <IonItem button onClick={() => setIsOpenCategoryModal(true)} className='mt-10'>
            <div className='list-item-select'>
              <span>{t('categories.selected_icon')}</span>
              <div>
                <span>
                  {subcategoryIcon
                    ? <i className={`fas ${subcategoryIcon} icon`}></i>
                    : t('categories.make_a_selection')}
                </span>
                <IonIcon icon={chevronForwardOutline}></IonIcon>
              </div>
            </div>
          </IonItem>
        </section>

        {/* Parent Category */}
        <section>
          <h6 className="section-title">{t('categories.parent_category')}</h6>
            <div className='mt-10'>
            {parentCategoryId ? (
              <div className="category-container centered-container">
                <CategoryIcon 
                  categoryColor={parentColor} 
                  iconName={parentIcon} 
                />
                <div className="category-name">
                  <span>{parentName}</span>
                </div>
              </div>
              ) : (
                <p>{t('common.loading')}</p>
              )}
          </div>
        </section>

        {/* Add category button */}
        <IonButton
          className="block mb-60"
          onClick={() => {
            if (isFormValid) {
              addSubcategory();
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {t('categories.add_subcat')}
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
            selectedIcon={subcategoryIcon}
            onIconSelect={(icon) => {
              setSubcategoryIcon(icon); // Update the selected category
              setIsOpenCategoryModal(false); // Close the modal
            }}
          />
          </IonContent>
        </IonModal>
        
      </IonContent>
    </IonPage>
  );
};

export default NewSubCategory;