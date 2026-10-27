import React, { useCallback, useEffect, useState } from 'react';
import { db, Account, AccountPreference } from "../db";
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

  // 1. 🔑 Rewritten main function: Fetches accounts, filters/categorizes available vs not available, and sorts securely
  const accountData = useLiveQuery(async () => {
    const allAccounts = await db.accounts.toArray();
    console.log("1. Raw allAccounts from DB:", allAccounts);

    // Guard against missing user identifiers
    if (!user.owner || !user.userId) {
      return { availableAccounts: allAccounts, notAvailableAccounts: [] };
    }

    const preferences = await db.accountPreferences
      .where('userId')
      .equals(user.userId)
      .toArray();

    console.log("2. Fetched preferences for user:", preferences);

    // Create a lookup map for fast performance: { accountId: sortOrder }
    const sortMap = new Map(preferences.map(p => [p.accountId, p.sortOrder]));

    const available: Account[] = [];
    const notAvailable: Account[] = [];

    // Categorize accounts according to requirements 1, 2, and 4
    allAccounts.forEach(account => {
      const isCurrentOwner = account.owner === user.owner;
      const isSharedByOther = account.owner !== user.owner && Boolean(account.sharedAccount);

      if (isCurrentOwner || isSharedByOther) {
        // Point 1 & 2: Current user's accounts + accounts shared by the other user
        available.push(account);
      } else {
        // Point 4: Other user's unshared accounts (Not available for reordering)
        notAvailable.push(account);
      }
    });

    // Point 3: Sort available accounts using accountPreferences with stable fallbacks
    available.sort((a, b) => {
      const orderA = sortMap.get(a.accountId);
      const orderB = sortMap.get(b.accountId);

      // If both have explicit user-defined preferences, sort by order
      if (orderA !== undefined && orderB !== undefined) {
        if (orderA !== orderB) {
          return orderA - orderB;
        }
      }

      // If only one has a preference, prioritize it
      if (orderA !== undefined && orderB === undefined) return -1;
      if (orderA === undefined && orderB !== undefined) return 1;

      // Stable default grouping fallback if no preferences are saved yet
      const aIsOwner = a.owner === user.owner ? 1 : 2;
      const bIsOwner = b.owner === user.owner ? 1 : 2;
      if (aIsOwner !== bIsOwner) {
        return aIsOwner - bIsOwner;
      }

      return (a.accountId || '').localeCompare(b.accountId || '');
    });

    // Sort not available accounts alphabetically
    notAvailable.sort((a, b) => (a.accountId || '').localeCompare(b.accountId || ''));

    console.log("3. Final sorted availableAccounts:", available.map(a => ({ id: a.accountId, owner: a.owner, shared: a.sharedAccount })));

    return { availableAccounts: available, notAvailableAccounts: notAvailable };
  }, [user.owner, user.userId]);

 
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(() => user.showDisabledAccounts);
  
  // 2. 🎣 States for filtered lists currently being displayed and reordered
  const [availableItems, setAvailableItems] = useState<Account[]>([]);
  const [notAvailableItems, setNotAvailableItems] = useState<Account[]>([]);

  // 3. 📝 State for the reorder mode toggle
  const [isReordering, setIsReordering] = useState(false);

  // 4. 🔑 State to force the visual component reset
  const [resetKey, setResetKey] = useState(0); 
  
  // Show helpful tip
  const [showInfo, setShowInfo] = useState<boolean>(false);
  
  // Check if there are any inactive categories across all accounts
  const allLoadedAccounts = [...(accountData?.availableAccounts || []), ...(accountData?.notAvailableAccounts || [])];
  const hasInactiveAccounts = allLoadedAccounts.some(account => account.activeAccount === false);

  useIonViewWillLeave(() => {
    setIsReordering(false);
  });
  
  // 5. 🔄 Initialize/Update display items when source data or filters change
  useEffect(() => {
    if (accountData && !isReordering) {
      let filteredAvailable = accountData.availableAccounts;
      let filteredNotAvailable = [...accountData.notAvailableAccounts];

      if (!showInactiveAccounts) {
        // Hide inactive accounts entirely
        filteredAvailable = filteredAvailable.filter(account => account.activeAccount);
        filteredNotAvailable = filteredNotAvailable.filter(account => account.activeAccount);
      } else {
        // Extract inactive accounts from both lists (or just available/not available depending on your data structure)
        // and push them into the end of notAvailableItems so they appear last.
        const inactiveAvailable = filteredAvailable.filter(account => !account.activeAccount);
        const inactiveNotAvailable = filteredNotAvailable.filter(account => !account.activeAccount);

        // Keep only active ones in their respective primary slots
        filteredAvailable = filteredAvailable.filter(account => account.activeAccount);
        filteredNotAvailable = filteredNotAvailable.filter(account => account.activeAccount);

        // Combine inactive accounts at the tail end of notAvailableItems
        filteredNotAvailable = [...filteredNotAvailable, ...inactiveNotAvailable, ...inactiveAvailable];
      }
      
      setAvailableItems([...filteredAvailable]);
      setNotAvailableItems([...filteredNotAvailable]);
    }
  }, [accountData, isReordering, showInactiveAccounts]);


  
  // 6. 🔄 Handler to manage local reordering for available items only
  const handleReorder = useCallback((event: CustomEvent<ItemReorderEventDetail>) => {
    const newOrderedItems = event.detail.complete([...availableItems]) as Account[];
    console.log("4. After drag-and-drop reorder:", newOrderedItems.map((item: Account) => item.accountId));
    setAvailableItems(newOrderedItems);
  }, [availableItems]);

  
  // 7. ✅ Handler for the "Done" button (Persists exact sort orders sequentially)
  const handleDone = async () => {
    const currentUserId = user.userId;
    const currentOwner = user.owner;
    
    if (!currentUserId || !currentOwner) return;

    try {
      await db.transaction(
        'rw', 
        db.accountPreferences,
        async () => {
          const updates = await Promise.all(
            availableItems.map(async (item, index) => {
              const prefId = `${currentUserId}_${item.accountId}`;
              const existingPref = await db.accountPreferences.get(prefId);

              return existingPref
                ? { ...existingPref, sortOrder: index }
                : {
                    id: prefId,
                    userId: currentUserId,
                    accountId: item.accountId,
                    sortOrder: index,
                    owner: currentOwner
                  };
            })
          );

          await db.accountPreferences.bulkPut(updates);
        }
      );

      setIsReordering(false);
    } catch (error) {
      console.error("Transaction failed during handleDone:", error);
    }
  };

  // 8. ❌ Handler for the "Cancel" button
  const handleCancel = () => {
    setIsReordering(false);

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
    setShowInactiveAccounts(checked);
    updateUser({ showDisabledAccounts: checked });
  };

  // Translate footer menu items
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));

  // Open secondary menu
  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent);
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
          {(availableItems.length > 1 || hasInactiveAccounts) && (
            <IonButtons slot="end">
              <IonButton onClick={openPopover}>
                <IonIcon icon={ellipsisVertical} />
              </IonButton>

              <IonPopover 
                isOpen={isPopoverOpen} 
                event={popoverEvent} 
                onDidDismiss={closePopover} 
                side="bottom" 
                alignment="end" 
                className='secondary-menu'
              >
                <IonContent class="ion-no-padding">
                  <ul className='list'>
                  {availableItems.length > 1 && (
                    <li 
                      className={`item ${isReordering ? 'disabled' : ''}`} 
                      onClick={() => {
                        if (!isReordering) {
                          closePopover();
                          startReorder();
                        }
                      }}
                    >
                      <IonIcon 
                        icon={swapVerticalOutline} 
                        className={`icon ${isReordering ? 'disabled' : ''}`}
                        style={{ marginRight: "15px" }} 
                      />
                      {t('accounts.reorder')}
                    </li>
                  )}
                  {hasInactiveAccounts && (
                    <li 
                      className={`item ${isReordering ? 'disabled' : ''}`} 
                      onClick={() => {
                        if(!isReordering) {
                          closePopover(); 
                          showDisabledAccounts(!showInactiveAccounts); 
                        }
                      }}
                    >
                      <IonIcon 
                        icon={showInactiveAccounts ? eyeOffOutline : eyeOutline} 
                        className="icon"
                        style={{ marginRight: "15px" }} 
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
        <div className="page-container">
          <div className="centered-container mb-20">
            <h2 className='screen-title'>{t('accounts.accounts_title')}</h2>
          </div>

          <div className="section-header">
            <div className="flex-top ml-20">
              <h6 className='section-title'>{t('accounts.manage_accounts')}</h6>   
              <IonIcon 
                icon={informationCircleOutline} 
                className="info-icon"
                onClick={() => setShowInfo(true)}
              />
            </div>

            {isReordering && (
              <div className='icon-menu-bar mr-5'>
                <IonIcon 
                  icon={closeOutline} 
                  onClick={handleCancel}
                  className='medium-icon-btn danger'
                />

                <IonIcon 
                  icon={checkmarkOutline}
                  onClick={handleDone} 
                  className='medium-icon-btn success'
                />
              </div>
            )}
          </div>
        
          <div className='centered-container mb-60'>
            {/* 1. Reorderable Available Accounts */}
            <IonList lines="none" className='account-list' key={resetKey}>
              <IonReorderGroup 
                disabled={!isReordering} 
                onIonItemReorder={handleReorder}
              >           
                {availableItems?.map((item) => (
                  <IonItem 
                    key={item.accountId} 
                    lines="none" 
                    detail={false} 
                    className={`reorder-item-wrapper ${isReordering ? 'is-reordering' : ''}`}   
                  >
                    <div className="reorder-item-content"> 
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
                          amount='' 
                          editMode={false}
                          isShared={item.sharedAccount}
                          isActive={item.activeAccount}
                        />
                      </IonRouterLink>
                    </div>

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

            {/* 2. Non-Available Accounts - Displayed at the bottom outside the reorder group */}
            {notAvailableItems.length > 0 && (
              <IonList lines="none" className='account-list'>
                {notAvailableItems.map((item) => {
                  return (
                    <IonItem 
                      key={item.accountId} 
                      lines="none" 
                      detail={false} 
                      className="reorder-item-wrapper"   
                    >
                      <div className="reorder-item-content disabled"> 
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
                            amount='' 
                            editMode={false}
                            isShared={item.sharedAccount}
                            isActive={false}
                          />
                        </IonRouterLink>
                      </div>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </div>
        </div>
      </IonContent>

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