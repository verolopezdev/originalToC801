import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useHistory } from "react-router-dom";
import { Trans } from 'react-i18next';

// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop';
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';
import { useExpense } from '../context/ExpenseContext';


// Ionic's components
import { 
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonModal,
  IonNote,
  IonPage, 
  IonPopover,
  IonRouterLink,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar,
  isPlatform,
} from '@ionic/react';

// Ionic icons
import { 
  addCircleOutline, 
  arrowBackOutline, 
  chevronBack,
  chevronForwardOutline, 
  closeOutline, 
  ellipsisVertical, 
  eyeOffOutline, 
  eyeOutline, 
  gitMergeOutline, 
  heart,
  heartOutline,
  searchOutline,
  trashOutline, 
} from 'ionicons/icons';


// App's components
import CategoryOption from '../components/CategoryOption';
import CategoryPreview from '../components/CategoryPreview';
import CategoryPicker from '../components/CategoryPicker';
import ColorPicker from '../components/ColorPicker';
import IconPicker from '../components/IconPicker';
import Modal from '../components/Modal';

// Styles
import '../Main.css';
import './Categories.css';


const EditCategory: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const history = useHistory();
  const isIOS = isPlatform('ios'); // Detect iOS platform
  const { checkExpense } = useExpense();
  const CATEGORYLESS_ID = 1; 
  
  // This will override the back button behavior (useful for custom screens)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  
  const { categoryId } = useParams<{ categoryId: string }>(); // category id to fill the form
  const category = useLiveQuery(() => db.categories.get(Number(categoryId)), [categoryId]);
  const categoryIdNum = Number(categoryId); // Convert to number
  const expensesCount = useLiveQuery(() => 
    db.expenses
      .where('categoryId')
      .equals(categoryIdNum)
      .count(), // Returns only the count as a number
    [categoryId]
  );
  const subcategories = useLiveQuery(() =>
    db.subcategories.where('parentCategoryId').equals(categoryIdNum).toArray()
  );  
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const color = themeColor.split("-")[1]; // Extracts color name to initialize selectedColor
  const [passedCategoryId, setPassedCategoryId] = useState<number>(Number(categoryId))
  const [categoryColor, setCategoryColor] = useState<string>(color);
  const [categoryIcon, setCategoryIcon] = useState<string>("fa-house");
  const [categoryName, setCategoryName] = useState<string>('');
  const [isActiveCategory, setIsActiveCategory] = useState<boolean>(true);
  const [isFavouriteCategory, setIsFavouriteCategory] = useState<boolean>(false);
  const [isFormValid, setIsFormValid] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpenCategoryModal, setIsOpenCategoryModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
    destination: '',
  });

  const [error, setError] = useState<string | null >(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Merge categories variables
  // Icon picker modal is now the Merge Modal:
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false); // New state for Merge Modal
  const [isOpenCategoryMergeModal, setIsOpenCategoryMergeModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<number | null>(null); // To store the selected target category ID
  const [targetSubcategoryId, setTargetSubcategoryId] = useState<number>(0); 
  const [targetName, setTargetName] = useState<string>('');
  const [agreedToMerge, setAgreedToMerge] = useState(false);

  // Delete modal variables
  const [showDeleteModal, setShowDeleteModal] = useState(false); // State to open/close the delete confirmation modal
  const [agreedToDelete, setAgreedToDelete] = useState(false);     // State for the "I understand" toggle in the delete modal


  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isOpenCategoryModal, setIsOpenCategoryModal);
  
  useKeyboardAutoClose();


  // Initialize variables when account is available
  useEffect(() => {
    if (category) {
      setPassedCategoryId(category.categoryId);
      setCategoryName(category.systemCategory
        ? t(`categories.${category.categoryName}`)
        : category.categoryName);
      setCategoryColor(category.categoryColor);
      setCategoryIcon(category.categoryIcon);
      setIsActiveCategory(category.activeCategory);
      setIsFavouriteCategory(category.favouriteCategory);
    }
  }, [category]); // Update state when `account` is available


  useEffect(() => {
    if (categoryName.trim()) {
      setIsFormValid(true);
    }
  }, [categoryName]);
  

  // validation function for card name
  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s@\-_\/.]+$/u; // Allows only alphanumeric characters, spaces @ - _ /
    return nameRegex.test(name);
  };
  
  
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


  // Color selection
  const handleColorSelect = (color: string) => {
    setCategoryColor(color);
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
          action: () => setIsModalOpen(false),
          style: 'fail-btn', // Optional CSS class
        },
      ],
      destination: '/categories'
    });
    setIsModalOpen(true);
  };


  // Function to handle the category deletion modal open
  const openDeleteModal = () => {
    // Check if category is available and not the system category
    if (!category || categoryIdNum === 1) {
        setToastMessage(t('categories.cannot_delete_categoryless')); 
        setShowToast(true);
        return;
    }
    
    // Reset the toggle and show the modal
    setAgreedToDelete(false); 
    setShowDeleteModal(true);
  };


  // Function to handle the actual deletion confirmation inside the modal
  const handleFinalDelete = () => {
    if (agreedToDelete) {
        setShowDeleteModal(false); // Close the modal
        // Call the core database logic
        deleteCategory(); 
    }
  };
  

  // Update record
  async function updateCategory(categoryId: number) {
    try {
      // Check if category exists
      const existingCategory = await db.categories.get(categoryId);
      if (!existingCategory) {
        openFailureModal();
        return;
      }

      await db.transaction(
        'rw', 
        db.categories,
        async (tx) => {
      
          // Update the category record
          await tx.categories.update(categoryId, {
            categoryName,
            categoryColor,
            categoryIcon,
            systemCategory: false,
            favouriteCategory: isFavouriteCategory
          });
        }
      );
      
      openInfoModal({ // A revised success modal function to accept custom content
        content: t('categories.category_updated'),
        destination: '/categories' // Navigate away since the current category is deleted
    }); // Success feedback

    } catch (error) {
      openFailureModal();
    }
  }

  // Update activeCategory
  const changeActiveCategory = async (categoryId: number, activeCategory: boolean) => {

    if (!categoryId) return;

    // Toggle activeCategory state
    const newActiveState = !activeCategory;

    await db.transaction(
      'rw', 
      db.categories,
      db.subcategories,
      async (tx) => {
        // Update category's active state
        await tx.categories.update(categoryId, { activeCategory: newActiveState });

        // Update all subcategories to match the category's active state
        await tx.subcategories
          .where('parentCategoryId')
          .equals(categoryId)
          .modify({ activeSubcategory: newActiveState });
      }
    );
  };

  // Favourite category
  const handleFavourite = async (categoryId: number, favouriteCategory: boolean) => {
    if (!categoryId) return;
    
    const newFavState = !favouriteCategory;
  
    setToastMessage(newFavState ? t('categories.added_to_favs') : t('categories.removed_from_favs'));
    setShowToast(true);
  
    // Fix: Change db.accounts to db.categories and update local component state
    setIsFavouriteCategory(newFavState);
  
    await db.transaction(
      'rw', 
      db.categories,
      async (tx) => {
        await tx.categories.update(categoryId, { favouriteCategory: newFavState });
      }
    );
  };


  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const handleBack = () => {
    history.replace('/categories');
  };


const handleTargetCategorySelect = (selection: { categoryId: number; categoryName: string; subcategoryId: number; subcategoryName: string; }) => {
  // We only care about the categoryId for the merge operation
  setTargetCategoryId(selection.categoryId); 
  
  if (selection.subcategoryId > 0) {
    // Case: User selected a SUBcategory
    setTargetSubcategoryId(selection.subcategoryId);
    // Display name includes the parent category for context
    setTargetName(`${selection.categoryName} / ${selection.subcategoryName}`); 
  } else {
    // Case: User selected a main CATEGORY
    setTargetSubcategoryId(0); 
    setTargetName(selection.categoryName); 
  }  

  setIsOpenCategoryMergeModal(false);
};



// Function to handle the actual merge
const mergeCategory = async () => {
  // Use the array syntax for tables to avoid the TypeScript overload error
  const tablesToLock = [
    db.expenses, 
    db.categories, 
    db.subcategories, 
    db.recurringSeries
  ];

  // 1. Validate target category ID
  if (!targetCategoryId || targetCategoryId === categoryIdNum) {
    setToastMessage(t('categories.invalid_target'));
    setShowToast(true);
    return;
  }

  try {
    // 2. Start a Dexie Transaction for atomicity
    await db.transaction(
      'rw', 
      tablesToLock, // Use the array here
      async (tx) => { // Use 'tx' for all database access within this block
        
        // --- Transaction Logic Starts ---

        // A. Handle Expenses (Original Logic, adjusted to use 'tx')
        if(targetSubcategoryId > 0) {
          await tx.expenses // MUST use tx.expenses
            .where('categoryId')
            .equals(categoryIdNum)
            .modify({ categoryId: targetCategoryId, subcategoryId: targetSubcategoryId });

        } else {
          // Reassign Expenses
          await tx.expenses // MUST use tx.expenses
            .where('categoryId')
            .equals(categoryIdNum)
            .modify({ categoryId: targetCategoryId });
          
          // Reassign Subcategories (if applicable)
          await tx.subcategories // MUST use tx.subcategories
            .where('parentCategoryId')
            .equals(categoryIdNum)
            .modify({ parentCategoryId: targetCategoryId });
        }

        // B. INTEGRATED: Update Recurrence Series
        // This MUST be inside the transaction for atomicity.
        await tx.recurringSeries // MUST use tx.recurringSeries
          .where('categoryId')
          .equals(categoryIdNum)
          .modify({ categoryId: targetCategoryId, subcategoryId: targetSubcategoryId });
            
        // C. INTEGRATED: Delete Source Category
        // This MUST be inside the transaction for atomicity.
        if(categoryIdNum > 1) {
          await tx.categories.delete(categoryIdNum); // MUST use tx.categories
        }

        // --- Transaction Logic Ends ---
      }
    ); // Transaction commits here if successful
    
    // 3. Post-Transaction Actions (UI updates, navigation, etc.)
    checkExpense(); // Assuming this is an action that is safe outside the transaction
    
    // Close the merge modal and navigate back
    setIsMergeModalOpen(false);
    
    openInfoModal({
      content: t('categories.merge_success', {
        source: category?.categoryName,
        target: targetName
      }),
      destination: '/categories'
    });
    
  } catch (error) {
    // If any operation inside the transaction failed, the whole thing rolls back here.
    console.error("Merge failed (Rollback initiated):", error);
    openFailureModal();
  }
};

// Note: You'll need to update your openInfoModal to accept custom content, e.g.:
const openInfoModal = (config: { content: string, destination: string }) => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: config.content,
      actions: [{ label: t('common.continue'), action: () => setIsModalOpen(false) }],
      destination: config.destination
    });
    setIsModalOpen(true);
};




// The final database transaction to execute the deletion
const deleteCategory = async () => {
  // Use the array syntax for tables to avoid the TypeScript overload error
  const tablesToLock = [
    db.expenses, 
    db.categories, 
    db.subcategories, 
    db.recurringSeries
  ];
  
  // Guard clause: Should not be able to delete the Categoryless category (ID 1)
  if (categoryIdNum === CATEGORYLESS_ID) {
    setToastMessage(t('categories.cannot_delete_categoryless')); 
    setShowToast(true);
    return;
  }

  try {
    // 1. Start a Dexie Transaction for atomicity
    await db.transaction(
      'rw', 
      tablesToLock, // Use the array here
      async (tx) => { // Use 'tx' for all database access within this block
      // 2. Reassign Expenses: Move all expenses from the current category to Categoryless (ID 1)
      await tx.expenses
        .where('categoryId')
        .equals(categoryIdNum)
        .modify({ categoryId: CATEGORYLESS_ID, subcategoryId: 0 }); // Move to new category and reset subcategory 
      
      // 2a. Check recurrences: Update all recurrences from the current category to Categoryless (ID 1)
      await tx.recurringSeries
        .where('categoryId')
        .equals(categoryIdNum)
        .modify({ categoryId: CATEGORYLESS_ID, subcategoryId: 0 }); // Update to new category and reset subcategory 

      // 3. Delete Subcategories: Delete all subcategories of the source category
      await tx.subcategories
        .where('parentCategoryId')
        .equals(categoryIdNum)
        .delete();

      // 4. Delete Source Category
      await tx.categories.delete(categoryIdNum);
    });

    checkExpense(); // Re-sync expense context/totals
    
    // 5. Success Feedback and Navigation
    openInfoModal({
      content: t('categories.category_deleted', {
        source: category?.categoryName,
      }),
      destination: '/categories' 
    });

  } catch (error) {
    console.error("Deletion failed:", error);
    openFailureModal();
  }
};

const key =
  targetName && targetName.trim().length > 0
    ? "categories.merge_toggle_confirm_with_target"
    : "categories.merge_toggle_confirm";

  


  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border' id="header">
        <IonToolbar>
          
          {/* Back button */}
          <IonButtons slot="start">
            {/* Custom back button with chevron icon */}
            <IonButton onClick={handleBack} fill="clear">
              {isIOS ? (
                <>
                  <IonIcon icon={chevronBack} />
                  {t('common.back')}
                </>
              ) : (
                <IonIcon icon={arrowBackOutline} slot="icon-only" />
              )}
            </IonButton>          
          </IonButtons>
           
          {/* Secondary menu for this category */}
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
                  {isActiveCategory ? (
                    <>
                      {/* Add subcategory */}
                      {categoryIdNum > 1 && (
                        <IonRouterLink 
                          key={1}
                          routerLink={`/newsubcategory/${categoryId}`}
                          routerDirection="forward"
                          style={{ textDecoration: 'none' }} /* Optional: remove underline styling */
                        >
                          <li 
                            className='item'
                            onClick={() => {
                              closePopover(); // First, close the popover
                            }}
                          >
                            <IonIcon icon={addCircleOutline} />
                            {t('categories.add_subcat')}
                          </li>
                        </IonRouterLink>
                      )}

                      {/* Merge category */}
                      <li 
                        className='item' 
                        onClick={() => {
                          closePopover(); // Close the popover
                          setTargetCategoryId(null); // Reset selection when opening
                          setTimeout(() => setIsMergeModalOpen(true), 100); // Open the merge modal
                        }}
                      >
                        <IonIcon icon={gitMergeOutline} />
                        {t('categories.merge')}
                      </li>

                      {/* Disable category */}
                      {categoryIdNum > 1 && (
                        <li 
                          className="item" 
                          onClick={() => {
                            closePopover(); // First, close the popover
                            setTimeout(() => changeActiveCategory(categoryIdNum, isActiveCategory), 100); // Then update state after a brief delay
                          }}
                        >
                          <IonIcon icon={eyeOffOutline} /> {t('common.disable')}
                        </li>
                      )}
                    </>
                  ) : (
                    // Enable category
                    <li 
                      className="item" 
                      onClick={() => {
                        closePopover(); // Close the popover first
                        setTimeout(() => changeActiveCategory(categoryIdNum, isActiveCategory), 100); // Delay state change
                      }}
                    >
                      <IonIcon icon={eyeOutline} /> {t('common.enable')}
                    </li>
                  )}

                  {/* Delete category */}
                  {categoryIdNum > 1 && (
                    <li 
                      className='item' 
                      onClick={() => {
                        closePopover();     // Close the small menu popover
                        openDeleteModal();  // Open the custom deletion modal
                      }}
                    >
                      <IonIcon icon={trashOutline} />
                      {t('common.delete')}
                    </li>
                  )}
                </ul>
              </IonContent>
            </IonPopover>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        {/* Screen Header */}
        <div className='centered-container'>
          <h2 className='screen-title'>{t('categories.edit_category')}</h2>
        </div>

        {/* Show Category Design */}
        <section>
          <div className="centered-container mt-20">  
            <CategoryPreview
              categoryColor= {isActiveCategory ? categoryColor : "neutral"}
              categoryIcon={categoryIcon}
            />
          </div>
        </section>
        
        {/* Warning for Categoryless only */}
        {categoryIdNum === 1 && (
          <IonItem className='system-danger'>
            <div className='system-warning'>
              <h5 className='title'>{t('categories.system_category_warning')}</h5>
              <p className='message'>
                {t('categories.system_category_advice')}
              </p>
            </div>
          </IonItem>
        )}

        {/* Category name and Favourite */}
        <section>
          <div className="parent-input">
            <div className="input-container">
              <input
                type="text"
                value={categoryName}
                disabled={!isActiveCategory || categoryIdNum === 1}
                maxLength={20}
                onChange={(e) => handleInputChange(e.target.value) }
                placeholder="Category Name"
                className={`input capitalize ${error ? 'invalid' : ''} ${categoryIdNum === 1 ? 'disabled' : ''}`}
              />
              {error && <p className="error-text">{error}</p>}
            </div>
            {categoryIdNum > 1 && (
              <button 
                id="open-toast"
                onClick={() => handleFavourite(categoryIdNum, isFavouriteCategory)}
              >
                {isFavouriteCategory ? <IonIcon icon={heart} /> : <IonIcon icon={heartOutline} />}
              </button>
            )}
          </div>
        </section>

        {/* Color picker */}
        <section>
          <h6 className='section-title'>{t('themes.choose_color')}</h6>
          <ColorPicker 
            onColorSelect={handleColorSelect} 
            initialColor={categoryColor} 
            isDisabled={!isActiveCategory || categoryIdNum === 1}
          />
        </section>

        {/* Icon picker */}
        <section>
          <div className="section-header">
            <h6 className="section-title">{t('categories.choose_icon')}</h6>
          </div>
          <IonItem 
            button 
            onClick={() => setIsOpenCategoryModal(true)}
            disabled={!isActiveCategory || categoryIdNum === 1}
          >
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

        {/* Subcategories - only show if available */}
        {(subcategories ?? []).length > 0  && (
        <section>
          <h6 className="section-title">{t('categories.subcategories')}</h6>
          <div className='centered-container mt-20'>
            <div className="categories-grid">
              {subcategories?.map((subcategory) => (
                <CategoryOption 
                  key={subcategory.subcategoryId}
                  categoryId={subcategory.subcategoryId} 
                  categoryName={subcategory.subcategoryName} 
                  categoryColor={subcategory?.activeSubcategory ? subcategory?.subcategoryColor : "neutral"} 
                  iconName={subcategory.subcategoryIcon} 
                  destination='editsubcategory'
                  isDisabled={!isActiveCategory}
                  isFavourite={subcategory.favouriteSubcategory}
                />
              ))}
              {isActiveCategory && (
                <CategoryOption 
                  key="fa-plus"
                  categoryId={passedCategoryId}
                  categoryColor={color} 
                  iconName='fa-plus' 
                  destination='addsubcategory' 
                />
              )}
            </div>
          </div>
        </section>
        )}

        {/* Update category button */}
        <IonButton
          className="block mb-20"
          onClick={() => {
            if (isFormValid) {
              updateCategory(passedCategoryId);
            }
          }}
          disabled={!isFormValid || !isActiveCategory || categoryIdNum === 1} // Disable the button if the form is invalid
        >
          {t('categories.update_category')}
        </IonButton>

        {/* Confirmation Modal */}
        <Modal
          isOpen={isModalOpen}
          icon={modalConfig.icon}
          title={modalConfig.title}
          content={modalConfig.content}
          closeModal={() => setIsModalOpen(false)}
          actions={modalConfig.actions}
          destination={modalConfig.destination}
        />


        {/* Category icon picker modal */}
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


        {/* Updated Favourite */}
        <IonToast
          isOpen={showToast}
          message={toastMessage}
          icon={isFavouriteCategory ? heart : heartOutline}
          duration={3000}
          position='bottom'
          className="custom-toast"
          buttons={[
            {
              text: t('common.dismiss'),
              role: 'cancel',
            },
          ]}
          onDidDismiss={() => setShowToast(false)}
        />  



        {/* Category Merge Modal */}
        <IonModal 
          isOpen={isMergeModalOpen} 
          onDidDismiss={() => {
            setIsMergeModalOpen(false);
            setAgreedToMerge(false); // Reset the toggle state here
          }}
        >
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonButtons slot="start">
                {/* Changed back button to close the modal */}
                <IonButton onClick={() => setIsMergeModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={arrowBackOutline} className='close-modal'></IonIcon>
                </IonButton>  
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          
          <IonContent className="ion-padding">
            {/* Modal title */}
            <div className='attention-modal-title'>
              <h2>
                {t('categories.merge')} {categoryName}
              </h2>
            </div>

            <section>
              <p>
                <Trans
                  i18nKey="categories.merge_confirm"
                  values={{ categoryName }}
                  components={[
                    <span key="0" className="dotted-underlined" />
                  ]}
                />
              </p>
            </section>

            <section>
              <h6 className="section-title">{t('categories.what_happens_merge')}</h6>
              <ul className='attention-modal-list'>
                <li>
                  <Trans
                    i18nKey="categories.what_happens_merge_1"
                    values={{ expensesCount }}
                    components={[<b key="0" />]}
                  />
                </li>
                <li>{t('categories.what_happens_merge_2')}</li>
                <li>{t('categories.what_happens_no_undone')}</li>
              </ul>
            </section>

            {/* Select target category */}
            <section>
              <h6 className="section-title">{t('categories.select_target_cat')}</h6>

              <div className="parent-input" onClick={() => setIsOpenCategoryMergeModal(true)}>
                <div className="input-container" >
                  <input
                    type="text"
                    value={targetName}
                    maxLength={20}
                    disabled={true}
                    placeholder={t('categories.select_target')}
                    className='input capitalize'
                  />
                </div>
                <button>
                  <IonIcon icon={searchOutline}/>
                </button>
              </div>
            </section>
            

            {/* I Understad toggle */}
            <section>
              <h6 className="section-title">{t('common.confirmation')}</h6>

              <div className='flex ion-align-items-center mt-20'>
                <IonToggle
                  checked={agreedToMerge} 
                  disabled={targetCategoryId === null || targetCategoryId === categoryIdNum} 
                  onIonChange={(e) => setAgreedToMerge(e.detail.checked)}                  
                  color="danger"
                  className='mr-10'
                />
                <span className={`ion-text-wrap ${targetCategoryId === null ? 'disabled' : ''}`}>
                  {t('categories.i_have_read')}
                </span>
              </div>

              <IonNote className='mt-10'>
                <Trans
                  i18nKey={key}
                  values={{ categoryName, targetName }}
                  components={[
                    <span key="0" className="dotted-underlined" />,
                    <span key="1" className="dotted-underlined" />
                  ]}
                /> 
                <Trans
                    i18nKey="categories.what_happens_merge_1"
                    values={{ expensesCount }}
                    components={[<b key="0" />]}
                  />           
              </IonNote>   
            </section>

            {/* Buttons */}
            <div className="flex ion-justify-content-between ion-margin-top">
              <IonButton 
                  fill='outline'
                  color='medium'
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setAgreedToMerge(false); // Reset the toggle state here
                  }}
              >
                {t('common.cancel')}
              </IonButton>
              <IonButton
                onClick={mergeCategory}
                disabled={!agreedToMerge || targetCategoryId === null || targetCategoryId === categoryIdNum} 
                color="danger"
              >
                {t('categories.merge')}
              </IonButton>
            </div>

          </IonContent>
        </IonModal>


        {/* Category picker modal for merge */}
        <IonModal isOpen={isOpenCategoryMergeModal}>
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setIsOpenCategoryMergeModal(false)}>
                  <IonIcon aria-hidden="true" icon={arrowBackOutline} className='close-modal'></IonIcon>
                </IonButton>  
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {/* Modal title */}
            <div className='attention-modal-title'>
              <h2>
                {t('categories.merge')} {categoryName}
              </h2>
            </div>

            <CategoryPicker
              selectedCategory={targetCategoryId ?? undefined} // Use the new target state
              selectedSubcategory={undefined} // Not relevant for this context
              onCategorySelect={handleTargetCategorySelect} // Use the new handler
              currentCategoryId={categoryIdNum} 
            />
          </IonContent>
        </IonModal>


        {/* Category Deletion Confirmation Modal */}
        <IonModal 
          isOpen={showDeleteModal} 
          onDidDismiss={() => setShowDeleteModal(false)}
        >
          <IonHeader className='page-header ion-no-border'>
            <IonToolbar>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDeleteModal(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {/* Modal title */}
            <div className='attention-modal-title'>
              <h2>
                {t('categories.delete_category')}
              </h2>
            </div>

            {/* Modal text and item */}
            <section>
              <p>
                <Trans
                  i18nKey="categories.delete_confirm"
                  values={{ categoryName }}
                  components={[
                    <span key="0" className="dotted-underlined" />
                  ]}
                />
              </p>
            </section>

            <section>
              <h6 className="section-title">{t('categories.what_happens_delete')}</h6>
              <ul className='attention-modal-list'>
                <li>
                  <Trans
                    i18nKey="categories.what_happens_delete_1"
                    values={{ expensesCount }}
                    components={[
                      <b key="0" />, 
                      <span key="1" className="dotted-underlined" />
                    ]}
                  />
                </li>
                <li>{t('categories.what_happens_delete_2')}</li>
                <li>{t('categories.what_happens_no_undone')}</li>
              </ul>
            </section>

            {/* I Understad toggle */}
            <section>
              <h6 className="section-title">{t('common.confirmation')}</h6>

              <div className='flex ion-align-items-center mt-20'>
                <IonToggle
                  checked={agreedToDelete}
                  onIonChange={(e) => setAgreedToDelete(e.detail.checked)}
                  color="danger"
                  className='mr-10'
                />
                <span className='ion-text-wrap'>
                  {t('categories.i_have_read')}
                </span>
              </div>

              <IonNote className='mt-10'>
                {t('categories.delete_toggle_confirm')} <span className='dotted-underlined'>{categoryName}</span>.
              </IonNote>
            </section>
            

            {/* Buttons */}
            <div className="flex ion-justify-content-between ion-margin-top">
              <IonButton 
                  fill='outline'
                  color='medium'
                  onClick={() => setShowDeleteModal(false)}
              >
                  {t('common.cancel')}
              </IonButton>
              <IonButton
                  onClick={handleFinalDelete}
                  disabled={!agreedToDelete} 
                  color="danger"
              >
                {t('common.delete_perm')}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default EditCategory;