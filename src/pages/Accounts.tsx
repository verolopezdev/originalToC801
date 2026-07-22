import React, { useCallback, useEffect, useState } from 'react';
import { db, Account } from "../db";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from 'react-i18next';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook


// App components
import DefaultCard from '../components/DefaultCard';
import Footer from '../components/Footer'


// Ionic components
import { 
  IonAlert,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonPopover,
  IonReorderGroup, 
  IonReorder,
  IonRouterLink, 
  IonToolbar,
  ItemReorderEventDetail,
  useIonViewWillLeave
} from '@ionic/react';


// icons
import { 
  add,
  cashOutline, 
  checkmarkOutline, 
  closeOutline, 
  ellipsisVertical,
  eyeOffOutline,
  eyeOutline,
  homeOutline,
  informationCircleOutline,
  layers,
  swapVerticalOutline, 
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './Accounts.css';
import '../components/DefaultCard.css';


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/app/accounts', icon: layers },
  { title: 'Add', url: '/app/newaccount', icon: add },
  { title: 'activity', url: '/app/activity', icon: cashOutline }
];




const Accounts: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { user, updateUser } = useUser(); // Access user context
  // Open and close secondary menu
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);

  // 1. 🔑 Fetch and sort accounts from DB
  const accounts: Account[] | undefined = useLiveQuery(
    () => db.accounts.orderBy('sortOrder').toArray()
  );
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(() => user.showDisabledAccounts);
  
  // 2. 🎣 State for the list currently being displayed and reordered
  const [items, setItems] = useState<Account[]>([]);

  // 3. 📝 State for the reorder mode toggle
  const [isReordering, setIsReordering] = useState(false);

  // 4. 🔑 State to force the visual component reset
  const [resetKey, setResetKey] = useState(0); 
  
  // Show helpfull tip
  const [showInfo, setShowInfo] = useState<boolean>(false);
  
  // Check if there are any inactive categories
  const hasInactiveAccounts = accounts?.some(account => account.activeAccount === false);

  useIonViewWillLeave(() => {
    setIsReordering(false);
  });
  
  
  // 5. 🔄 Initialize/Update 'items' when 'accounts' (Source of Truth) changes
  useEffect(() => {
    // Only update if 'accounts' is defined (i.e., the query has returned data)
    // AND we are NOT currently in reordering mode.
    if (accounts && !isReordering) {
      let filteredAccounts: Account[];

      if (!showInactiveAccounts) {
        // If showInactiveAccounts is FALSE, filter to show only active accounts (activeAccount: true)
        filteredAccounts = accounts.filter(account => account.activeAccount);
      } else {
        // If showInactiveAccounts is TRUE, show all accounts (active and inactive)
        filteredAccounts = accounts;
      }
      
      // Use a defensive copy of the filtered data.
      setItems([...filteredAccounts]);
    }
  }, [accounts, isReordering, showInactiveAccounts]); 

  
  // 6. 🔄 Handler to manage local reordering (remains mostly the same)
  const handleReorder = useCallback((event: CustomEvent<ItemReorderEventDetail>) => {
    const newOrderedItems = event.detail.complete([...items]);
    setItems(newOrderedItems);
  }, [items]);


  // 7. ✅ Handler for the "Done" button (Persistence logic)
  const handleDone = async () => {
    // 1. Calculate the updates needed before starting the transaction
    const updates = items.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    try {
      // 2. Wrap the DB operations in a transaction
      await db.transaction(
        'rw', 
        db.accounts,
        async (tx) => {
          await tx.accounts.bulkPut(updates);
        }
      );

      // 3. Exit reorder mode *only* after the transaction successfully commits
      setIsReordering(false);
    } catch (error) {
      console.error("Transaction failed during handleDone (Rollback initiated):", error);
    }
  };

  // 8. ❌ Handler for the "Cancel" button
  const handleCancel = () => {
    // 1. Exit reordering mode (must be first)
    setIsReordering(false);

    // 2. Discard local changes: The `useEffect` will handle resetting `items`
    //    to the persistent `accounts` data when `isReordering` becomes false.

    // 3. 💥 Force Visual Reset
    setTimeout(() => {
        setResetKey(prevKey => prevKey + 1);
    }, 0);
  };
  

  // 9. 🔄 Handler for starting reorder mode
  const startReorder = () => {
    setIsReordering(true);
  };
  
  
  // Update showDisabledAccounts in user context
  const showDisabledAccounts = (checked: boolean) => {
    setShowInactiveAccounts(checked); // Update local state
    updateUser({ showDisabledAccounts: checked }); // Update context
  };

 
  // Translate footer menu items
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));


  // Open secondary menu
  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };


  // Close secondary menu
  const closePopover = () => {
    setIsPopoverOpen(false);
  };


  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          {/* Secondary menu */}
          {(items.length > 1 || hasInactiveAccounts) && (
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
                  {items.length > 1 && (
                    <li 
                      className={`item ${isReordering ? 'disabled' : ''}`} 
                      onClick={() => {
                        // Only execute the logic if isReordering is FALSE
                        if (!isReordering) {
                          closePopover();
                          startReorder(); // Assuming clicking "Reorder" sets it to true
                        }
                      }}
                    >
                      <IonIcon 
                        icon={swapVerticalOutline} 
                        className={`icon ${isReordering ? 'disabled' : ''}`}
                        style={{ marginRight: "15px" }} // Optional spacing
                      />
                      {t('accounts.reorder')}
                    </li>
                  )}
                  {hasInactiveAccounts && (
                    <li 
                      className={`item ${isReordering ? 'disabled' : ''}`} 
                      onClick={() => {
                        if(!isReordering) {
                          closePopover(); // First, close the popover
                          showDisabledAccounts(!showInactiveAccounts); // Then update state after a brief delay
                        }
                      }}
                    >
                      <IonIcon 
                        icon={showInactiveAccounts ? eyeOffOutline : eyeOutline} 
                        className="icon"
                        style={{ marginRight: "15px" }} // Optional spacing
                      />
                      {showInactiveAccounts ? t('common.hide_inactive') : t('common.show_inactive')}
                    </li>
                  )}
                </ul>

                </IonContent>
              </IonPopover>
            </IonButtons>
          )}
        </IonToolbar> 
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
         {/* Screen title */}
        <div className="centered-container mb-20">
          <h2 className='screen-title'>{t('accounts.accounts_title')}</h2>
        </div>

        {/* Subtitle, info and Cancel/Done buttons */}
        <div className="section-header">
          {/* Subtitle and info */}
          <div className="flex-top ml-20">
            <h6 className='section-title'>{t('accounts.manage_accounts')}</h6>   
            <IonIcon 
              icon={informationCircleOutline} 
              className="info-icon"
              onClick={() => setShowInfo(true)}
            />
          </div>

          {/* Cancel / Done buttons */}
          {isReordering && (
            <div className='icon-menu-bar mr-5'>
              {/* Cancel button */}
              <IonIcon 
                icon={closeOutline} 
                onClick={handleCancel}
                className='medium-icon-btn danger'
              />

              {/* Done button */}
              <IonIcon 
                icon={checkmarkOutline}
                onClick={handleDone} 
                className='medium-icon-btn success'
              />
            </div>
          )}
        </div>
        
        {/* Accounts list */}
        <div className='centered-container mb-60'>
          <IonList lines="none" className='account-list' key={resetKey}>
            <IonReorderGroup 
              disabled={!isReordering} // Only allow reordering when mode is active
              onIonItemReorder={handleReorder}
            >           
              {items?.map((item) => (
                <IonItem 
                  key={item.accountId} 
                  lines="none" 
                  detail={false} 
                  // Add a class to the IonItem to target the content later
                  className={`reorder-item-wrapper ${isReordering ? 'is-reordering' : ''}`}   
                >
                  
                  {/* This is the new content wrapper for the animation */}
                  <div className='reorder-item-content'> 
                    <IonRouterLink
                      routerLink={`/app/editaccount/${item.accountId}`} 
                      routerDirection="forward"
                      className='default-card-router-link'
                    >
                      <DefaultCard  
                        title={item.accountName}
                        color={item.activeAccount ? item.accountColor : "slateGray"}
                        identifier={item.accountIdentifier}
                        logo={item.accountLogo}
                        amount='' // don't show amount in this screen
                        editMode={false}
                      />
                    </IonRouterLink>
                  </div>

                  {/* Only render IonReorder for this account if reordering is ON and the account is active */}
                  {isReordering && item.activeAccount && (
                    <IonReorder 
                      slot="end" 
                      className='reorder-handle' 
                    />
                  )}
                </IonItem>
              ))}
            </IonReorderGroup>     
          </IonList>
        </div>
      </IonContent>

      {/* Info alert for this screen */}
      <IonAlert
        isOpen={showInfo}
        className='custom-alert'
        onDidDismiss={() => setShowInfo(false)}
        header={t('accounts.about_accounts')}
        message={t('accounts.about_accounts_message')}
        buttons={['OK']}
      />
      
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default Accounts;
