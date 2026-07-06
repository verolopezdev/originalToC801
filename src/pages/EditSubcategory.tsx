import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';


// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop';
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';
import { useExpense } from '../context/ExpenseContext';


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
  IonNote,
  IonPage, 
  IonPopover,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar, 
} from '@ionic/react';

// Ionic icons
import { 
  arrowBackOutline,
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
import CategoryIcon from '../components/CategoryIcon';
import CategoryPicker from '../components/CategoryPicker';
import CategoryPreview from '../components/CategoryPreview';
import ColorPicker from '../components/ColorPicker';
import IconPicker from '../components/IconPicker';
import Modal from '../components/Modal';

// Styles
import '../Main.css';


function useParentCategory(parentCategoryId?: number) {
  return useLiveQuery(async () => {
    if (!parentCategoryId) return undefined;
    return db.categories.get(parentCategoryId); // Fetch parent category by its ID
  }, [parentCategoryId]);
}


const EditSubcategory: React.FC = () => {
  const CATEGORYLESS_ID = 1; 
  const contentRef = useScrollToTop(); // use the custom hook 
  const { checkExpense } = useExpense();
  const { t } = useTranslation();
  
  const { themeColor } = useTheme();
  const color = themeColor.split("-")[1]; // Extracts color name to initialize selectedColor

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  
  const { categoryId } = useParams<{ categoryId: string }>(); // category id to fill the form

  // Fetch subcategory by ID
  const subcategory = useLiveQuery(() => db.subcategories.get(Number(categoryId)), [categoryId]);
  const subcategoryId = Number(categoryId); // Convert to number

  // Fetch parent category using subcategory's parentCategoryId 
  const parentCategory = useParentCategory(subcategory?.parentCategoryId);  
  
  // Get total expenses for this subcategory
  const expensesCount = useLiveQuery(() => 
    db.expenses
      .where('subcategoryId')
      .equals(subcategoryId)
      .count(), // Returns only the count as a number
    [categoryId]
  );

  const handleParentSelect = ({ categoryId, subcategoryId }: { categoryId: number; subcategoryId: number }) => {  
    setParentCategoryId(categoryId); // Update the parent category ID
    setIsOpenParentModal(false); // Close the modal
  };
  
  const [subcategoryColor, setSubcategoryColor] = useState<string>(color);
  const [subcategoryIcon, setSubcategoryIcon] = useState<string>("fa-house");
  const [subcategoryName, setSubcategoryName] = useState<string>('');
  const [parentCategoryId, setParentCategoryId] = useState<number>(0);
  const [parentColor, setParentColor] = useState<string>(color);
  const [parentIcon, setParentIcon] = useState<string>("fa-house");
  const [parentName, setParentName] = useState<string>('');
  const [isActiveSubcategory, setIsActiveSubcategory] = useState<boolean>(true);
  const [isFavouriteSubcategory, setIsFavouriteSubcategory] = useState<boolean>(false);
  const [isFormValid, setIsFormValid] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpenCategoryModal, setIsOpenCategoryModal] = useState(false);
  const [isOpenParentModal, setIsOpenParentModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
    destination: ''
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
  useBackButtonModalReset(isOpenParentModal, setIsOpenParentModal);

  useKeyboardAutoClose();

  // Initialize variables when subcategory is available
  useEffect(() => {
    if (subcategory) {
      setSubcategoryName(subcategory.subcategoryName);
      setSubcategoryColor(subcategory.subcategoryColor);
      setSubcategoryIcon(subcategory.subcategoryIcon);
      setParentCategoryId(subcategory.parentCategoryId);
      setIsActiveSubcategory(subcategory.activeSubcategory);
      setIsFavouriteSubcategory(subcategory.favouriteSubcategory);
    }
  }, [subcategory]); // Update state when `subcategory` is available


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


  // validation function for card name
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


  // Color selection
  const handleColorSelect = (color: string) => {
    setSubcategoryColor(color);
  };


  // Success Modal
  const openInfoModal = (config: { content: string, destination: string }) => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: config.content,
      actions: [{ label: t('common.continue'), action: () => setIsModalOpen(false) }],
      destination: `/editcategory/${parentCategoryId}`
    });
    setIsModalOpen(true);
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
      destination: `/editcategory/${parentCategoryId}`
    });
    setIsModalOpen(true);
  };
  

  // Update record
  async function updateSubcategory(subcategoryId: number) {
    try {
      // Check if category exists
      const existingSubcategory = await db.subcategories.get(subcategoryId);
      if (!existingSubcategory) {
        openFailureModal();
        return;
      }

      // Update the category record
      await db.transaction(
        'rw', 
        db.subcategories,
        async (tx) => {
          await tx.subcategories.update(subcategoryId, {
            subcategoryName,
            subcategoryColor,
            subcategoryIcon,
            activeSubcategory: true,
            parentCategoryId: parentCategoryId
          });
        }
      );
      
      setSubcategoryName('');
      setSubcategoryColor(color);
      setSubcategoryIcon("fa-house");
      openInfoModal({
        content: t('categories.subcat_merge_success', {
          target: targetName
        }),
  
        destination: '/categories' // Assuming this navigates to the main list
      });

    } catch (error) {
      openFailureModal();
    }
  }

  // Update activeCategory
  const changeActiveSubcategory = async (subcategoryId: number, activeSubcategory: boolean) => {

    if (!subcategoryId) return;

    // Toggle activeCategory state
    const newActiveState = !activeSubcategory;

    // Update category's active state
    await db.transaction(
      'rw', 
      db.subcategories,
      async (tx) => {
        await tx.subcategories.update(subcategoryId, { activeSubcategory: newActiveState });   
      }
    );

       
  };


  // Favourite category
  const handleFavourite = async (subcategoryId: number, favouriteSubcategory: boolean) => {
    if (!categoryId) return;

    // Toggle favouriteCategory state
    const newFavState = !favouriteSubcategory;

    setToastMessage(newFavState ? t('categories.added_to_favs') : t('categories.removed_from_favs'));
    setShowToast(true);

    // Update category's fav state
    await db.transaction(
      'rw', 
      db.subcategories,
      async (tx) => {
        await tx.subcategories.update(subcategoryId, { favouriteSubcategory: newFavState });
      }
    );

  }
    

  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };


  const closePopover = () => {
    setIsPopoverOpen(false);
  };


  const handleTargetCategorySelect = (selection: { categoryId: number; categoryName: string; subcategoryId: number; subcategoryName: string; }) => {
    // We only care about the categoryId for the merge operation
    setTargetCategoryId(selection.categoryId); 
    console.log("target category: ", selection.categoryId);
    
    if (selection.subcategoryId > 0) {
      // Case: User selected a SUBcategory
      setTargetSubcategoryId(selection.subcategoryId);
      // Display name includes the parent category for context
      setTargetName(`${selection.categoryName} / ${selection.subcategoryName}`); 
      console.log("target subcategory: ", selection.subcategoryId);
    } else {
      // Case: User selected a main CATEGORY
      setTargetSubcategoryId(0); 
      setTargetName(selection.categoryName); 
    }  
  
    setIsOpenCategoryMergeModal(false);
  };
  

  // Function to handle the actual merge
  const mergeSubcategory = async () => {
    
    // 1. Validate target IDs
    if (!targetCategoryId) {
      setToastMessage(t('merge.invalid_target_category'));
      setShowToast(true);
      return;
    }
    
    // Check if the source subcategory is the same as the target subcategory (prevent merging onto itself)
    if (subcategoryId === targetSubcategoryId) {
        setToastMessage(t('merge.same_subcategory'));
        setShowToast(true);
        return;
    }

    try {
      // Define the tables as an array of table objects/names
      const tablesToLock = [
        db.expenses, 
        db.categories, 
        db.subcategories, 
        db.recurringSeries, 
      ];
      // 2. Start a Dexie Transaction for atomicity
      await db.transaction('rw', tablesToLock, async (tx) => {
        
        // A. Reassign Expenses:
        // Update all expenses linked to the source subcategory.
        // We set the new categoryId (targetCategoryId) and the new subcategoryId (targetSubcategoryId).
        await tx.expenses
          .where('subcategoryId')
          .equals(subcategoryId)
          .modify({ 
            categoryId: targetCategoryId, 
            subcategoryId: targetSubcategoryId // Use 0 if merging into parent category
          });

        // Check recurrences: Update all recurrences from the current category to Categoryless (ID 1)
        await tx.recurringSeries
          .where('categoryId')
          .equals(parentCategoryId)
          .modify({ categoryId: targetCategoryId, subcategoryId: targetSubcategoryId }); // Update to new category and reset subcategory 
        
        
        // B. Delete Source Subcategory:
        // Delete the original subcategory that was merged.
        await tx.subcategories
          .where('subcategoryId')
          .equals(subcategoryId) // Use the composite key if you have it, otherwise just the 'id'
          .delete();
            
        // NOTE: Unlike category merge, we don't delete the parent category here (unless it becomes empty).

        // C. Check and Update Parent Category:
        // 1. Check if any other subcategories exist for this parent
        const moreSubcategories = await db.subcategories
          .where('parentCategoryId')
          .equals(parentCategoryId)
          .first(); 

        // 2. Update the parent category's 'subcategories' field if none remain
        if (!moreSubcategories) {
          await tx.categories
            .where('categoryId') // Use the correct key for your parent Category table
            .equals(parentCategoryId)
            .modify({ 
              subcategories: false // Set the boolean field to false
            });
        }
      });
      
      // 3. Post-transaction cleanup and UI updates
      checkExpense();
      setIsMergeModalOpen(false);
      openInfoModal({
        content: t('categories.subcat_merge_success', {
          target: targetName
        }),
  
        destination: '/categories' // Assuming this navigates to the main list
      });
      
    } catch (error) {
      console.error("Subcategory merge failed:", error);
      openFailureModal();
    }
  };  


  // DELETE SUBCATEGORY
  // Function to handle the category deletion modal open
  const openDeleteModal = () => {
    // Check if category is available and not the system category
    if (!subcategory) {
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
        deleteSubcategory(); 
    }
  };


  // The final database transaction to execute the deletion
  const deleteSubcategory = async () => {
  
    try {
      // Define the tables as an array of table objects/names
      const tablesToLock = [
        db.expenses, 
        db.categories, 
        db.subcategories, 
        db.recurringSeries, 
      ];
      
      // 1. Start a Dexie Transaction for atomicity
      await db.transaction('rw', tablesToLock, async (tx) => {
        // 2. Reassign Expenses: Move all expenses from the current subcategory to Categoryless (ID 1)
        await tx.expenses
          .where('subcategoryId')
          .equals(subcategoryId)
          .modify({ categoryId: CATEGORYLESS_ID, subcategoryId: 0 }); // Move to new category and reset subcategory

        // 3. Check recurrences: Update all recurrences from the current category to Categoryless (ID 1)
        await tx.recurringSeries
          .where('categoryId')
          .equals(parentCategoryId)
          .modify({ categoryId: CATEGORYLESS_ID, subcategoryId: 0 }); // Update to new category and reset subcategory 
    
        // 4. Delete Source Subcategory
        await tx.subcategories.delete(subcategoryId);
      });
  
      checkExpense(); // Re-sync expense context/totals
      
      // 5. Success Feedback and Navigation
      openInfoModal({
        content: t('categories.subcategory_deleted', {
          source: subcategoryName,
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
    ? "categories.merge_toggle_confirm_with_target_subcat"
    : "categories.merge_toggle_confirm_subcat";


  

  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          {/* Back button */}
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/editcategory/${parentCategoryId}`} />
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
                  {isActiveSubcategory ? (
                    <>
                      {/* Merge */}
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

                      {/* Disable */}
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover(); // First, close the popover
                          setTimeout(() => changeActiveSubcategory(subcategoryId, isActiveSubcategory), 100); // Then update state after a brief delay
                        }}
                      >
                        <IonIcon icon={eyeOffOutline} />
                        {t('common.disable')}
                      </li>
                    </>
                  ) : (
                    /* Enable */
                    <li 
                      className="item" 
                      onClick={() => {
                        closePopover(); // Close the popover first
                        setTimeout(() => changeActiveSubcategory(subcategoryId, isActiveSubcategory), 100); // Delay state change
                      }}
                    >
                      <IonIcon icon={eyeOutline} /> 
                      {t('common.enable')}
                    </li>
                  )}
                    {/* Delete */}
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
                </ul>
              </IonContent>
            </IonPopover>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        {/* Screen Header */}
        <div className='centered-container'>
          <h2 className='screen-title'>{t('categories.edit_subcategory')}</h2>  
        </div>

        {/* Show Category Design */}
        <section>
          <div className="centered-container mt-20">
            <CategoryPreview
              categoryColor= {isActiveSubcategory ? subcategoryColor : "neutral"}
              categoryIcon={subcategoryIcon}
            />
          </div>
        </section>

        {/* Subcategory name and Favourite */}
        <section>
          <div className="parent-input">
            <div className="input-container">
              <input
                type="text"
                value={subcategoryName}
                disabled={!isActiveSubcategory}
                maxLength={20}
                onChange={(e) => handleInputChange(e.target.value) }
                placeholder={t('categories.subcat_name')}
                className={`input capitalize ${error ? 'invalid' : ''} ${!isActiveSubcategory ? 'disabled' : ''}`}
              />
              {error && <p className="error-text">{error}</p>}
            </div>
            <button 
              id="open-toast"
              disabled={!isActiveSubcategory}
              className={`${!isActiveSubcategory ? 'disabled' : ''}`}
              onClick={() => handleFavourite(subcategoryId, isFavouriteSubcategory)}
            >
              {isFavouriteSubcategory ? <IonIcon icon={heart} /> : <IonIcon icon={heartOutline} />}
            </button>
          </div>
        </section>

        {/* Color picker */}
        <section>
          <h6 className='section-title'>{t('themes.choose_color')}</h6>
          <ColorPicker 
            onColorSelect={handleColorSelect} 
            initialColor={subcategoryColor} 
            isDisabled={!isActiveSubcategory}
          />
        </section>

        {/* Icon picker */}
        <section>
          <h6 className="section-title">{t('categories.choose_icon')}</h6>
          <div className='mt-10'>
          <IonItem 
            button 
            onClick={() => setIsOpenCategoryModal(true)}
            disabled={!isActiveSubcategory}
          >
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
          </div>
        </section>

        {/* Parent Category */}
        <section>
          <h6 className="section-title">{t('categories.parent_category')}</h6>
          {parentCategory ? (
            <div 
              className={`category-container centered-container mt-20 ${
                isActiveSubcategory ? "active-category" : "inactive-category"
              }`}
              onClick={isActiveSubcategory ? () => setIsOpenParentModal(true) : undefined}
              style={isActiveSubcategory ? {} : { opacity: 0.5, cursor: "not-allowed" }}
            >
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
        </section>

        
        {/* Update category button */}
        <IonButton
          className="block mb-20"
          onClick={() => {
            if (isFormValid) {
              updateSubcategory(subcategoryId);
            }
          }}
          disabled={!isFormValid || !isActiveSubcategory} // Disable the button if the form is invalid
        >
          {t('categories.update_subcategory')}
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
            selectedIcon={subcategoryIcon}
            onIconSelect={(icon) => {
              setSubcategoryIcon(icon); // Update the selected category
              setIsOpenCategoryModal(false); // Close the modal
            }}
          />
          </IonContent>
        </IonModal>


        {/* Parent Category picker modal */}
        <IonModal isOpen={isOpenParentModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('categories.select_parent_cat')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsOpenParentModal(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <CategoryPicker
              selectedCategory={parentCategoryId} 
              onCategorySelect={handleParentSelect} // Updated to use the handler
              excludeFirst={true}
              onlyCategories={true}
            />
          </IonContent>
        </IonModal>


        {/* Subcategory Merge Modal */}
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
                {t('categories.merge_subcat')}
              </h2>
            </div>

            <section>
              <p>
                <Trans
                  i18nKey="categories.merge_confirm_subcat"
                  values={{ subcategoryName }}
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
                <li>{t('categories.what_happens_subcat_merge_2')}</li>
                <li>{t('categories.what_happens_no_undone')}</li>
              </ul>
            </section>

            {/* Select target category */}
            <section>
            <h6 className="section-title">{t('categories.select_target_cat')}</h6>
              <div className="parent-input">
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
                <button onClick={() => setIsOpenCategoryMergeModal(true)}>
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
                  disabled={targetCategoryId === null || targetCategoryId === subcategoryId} 
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
                  values={{ subcategoryName, targetName }}
                  components={[
                    <span key="0" className="dotted-underlined" />,
                    <span key="1" className="dotted-underlined" />
                  ]}
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
                onClick={mergeSubcategory}
                disabled={!agreedToMerge || targetCategoryId === null || targetCategoryId === subcategoryId} 
                color="danger"
              >
                  Merge
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
                {t('categories.merge')} {subcategoryName}
              </h2>
            </div>

            <CategoryPicker
              selectedCategory={targetCategoryId ?? undefined} // Use the new target state
              selectedSubcategory={undefined} // Not relevant for this context
              onCategorySelect={handleTargetCategorySelect} // Use the new handler
              currentCategoryId={parentCategoryId} 
              currentSubcategoryId={subcategoryId}
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
                {t('categories.delete_subcategory')}
              </h2>
            </div>

            {/* Modal text and item */}
            <section>
              <p>
                <Trans
                  i18nKey="categories.delete_confirm_subcat"
                  values={{ subcategoryName }}
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
                <li>{t('categories.what_happens_delete_2_subcat')}</li>
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
                {t('categories.delete_toggle_confirm')} <span className='dotted-underlined'>{subcategoryName}</span>.
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
        


        {/* Updated Favourite */}
        <IonToast
          isOpen={showToast}
          message={toastMessage}
          icon={isFavouriteSubcategory ? heart : heartOutline}
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
        
        
      </IonContent>
    </IonPage>
  );
};

export default EditSubcategory;