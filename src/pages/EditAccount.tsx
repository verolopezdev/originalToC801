import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';
import { useHasGuest } from '../services/SharingService';


// App components
import ColorPicker from '../components/ColorPicker';
import DefaultCard from '../components/DefaultCard';
import Modal from '../components/Modal';
import IconPicker from '../components/IconPicker';

// Ionic's components
import { 
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonPage,
  IonPopover, 
  IonToggle,
  IonToolbar,
} from '@ionic/react';

// Ionic icons
import { 
  ellipsisVertical, 
  eyeOffOutline, 
  eyeOutline, 
  trashOutline 
} from 'ionicons/icons';


const EditAccount: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { user } = useUser();
  const hasActiveGuest = useHasGuest(user.sharedRealmId);
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | null>(null);
  
  const { accountId } = useParams<{ accountId: string }>();
  const account = useLiveQuery(() => db.accounts.get(accountId), [accountId]);
  const passedAccountId = accountId;
  const [accountName, setAccountName] = useState<string>('');
  const [accountIdentifier, setAccountIdentifier] = useState<string>('');
  const [accountLogo, setAccountLogo] = useState<string>("");
  const [accountColor, setAccountColor] = useState<string>('');
  const [accountOwner, setAccountOwner] = useState<string>('');
  const [isActiveAccount, setIsActiveAccount] = useState<boolean>(true);
  const [sharedAccount, setSharedAccount] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  
  const [hasExpenses, setHasExpenses] = useState<boolean>(false);


  const [errors, setErrors] = useState<{ [key: string]: string | null }>({
    cardName: null,
    cardIdentifier: null,
  });
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
  });

  // Modal variables
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  
  
  useKeyboardAutoClose();

  // Initialize variables when account is available
  useEffect(() => {
    if (account) {
      setAccountName(account.accountName);
      setAccountIdentifier(account.accountIdentifier);
      setAccountColor(account.accountColor);
      setAccountLogo(account.accountLogo);
      setIsActiveAccount(account.activeAccount);
      setSharedAccount(account.sharedAccount);
      account.owner && setAccountOwner(account.owner);

      if(account.owner === user.owner) setIsOwner(true);
    }
  }, [account]); // Update state when `account` is available

  useEffect(() => {
    if (!passedAccountId) return;
  
    let isMounted = true;
  
    async function check() {
      const exists = await hasExpensesOrRecurrencesForAccount(passedAccountId);
      
      if (isMounted) setHasExpenses(exists);
    }
  
    check();
  
    return () => { isMounted = false };
  }, [passedAccountId]);
  
  
  async function hasExpensesOrRecurrencesForAccount(accountId: string): Promise<boolean> {
    // 1. Check RecurringSeries first
    const hasRecurrence = await db.recurringSeries
      .where("accountId")
      .equals(accountId)
      .first();
  
    if (hasRecurrence) return true;
  
    // 2. Check Expenses if no recurrence found
    const hasExpense = await db.expenses
      .where("accountId")
      .equals(accountId)
      .first();
  
    return !!hasExpense;
  }  

  // validation function for card name
  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s@\-_\/.]+$/u; // Allows only alphanumeric characters, spaces @ - _ /
    return nameRegex.test(name);
  };

  // Update form validity state
  useEffect(() => {
    const hasErrors = Object.values(errors).some((error) => error !== null);
    const hasEmptyFields =
      !accountName.trim();
    setIsFormValid(!hasErrors && !hasEmptyFields);
  }, [errors, accountName]);
    
    
	// Success Modal
	const openSuccessModal = (message: string) => {
		setModalConfig({
			icon: 'success',
			title: t('modal.success_modal_title'),
			content: message,
			actions: [
				{
					label: 'Continue',
					action: () => {
						setIsConfirmationModalOpen(false);
						history.back(); // This works like <IonBackButton />
					},
				},
			],
		});
		setIsConfirmationModalOpen(true);
	};
  

	// Failure Modal
	const openFailureModal = (message: string) => {
		setModalConfig({
			icon: 'failure',
			title: t('modal.failure_modal_title'),
			content: message,
			actions: [
				{
					label: t('common.try_again'),
					action: () => {
						setIsConfirmationModalOpen(false);
					},
					style: 'fail-btn', // Optional CSS class
				},
			],
		});
		setIsConfirmationModalOpen(true);
	};
  
  
  const handleInputChange = (
    field: string,
    value: string,
    setFieldValue: React.Dispatch<React.SetStateAction<string>>,
    validationFn: (value: string) => boolean,
    errorMessage: string
  ) => {
    setFieldValue(value);

    // Validate input
    if (!value.trim()) {
      // Set error to null if the field is empty and it's not 'cardIdentifier'
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: field === 'cardIdentifier' ? null : t('common.empty_field'),
      }));
    } else if (!validationFn(value)) {
      setErrors((prevErrors) => ({ ...prevErrors, [field]: errorMessage }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, [field]: null }));
    }
  };


  async function updateAccount(accountId: string) {
    try {
      // Check if account exists
      const existingAccount = await db.accounts.get(accountId);
      if (!existingAccount) {
        console.error('Account not found');
        openFailureModal(t('accounts.account_not_found'));
        return;
      }

      await db.transaction(
        'rw', // Read-write mode
        db.accounts, 
        async (tx) => {           
          // Update the account record
          await db.accounts.update(accountId, {
            accountName,
            accountIdentifier,
            accountColor,
            accountLogo,
            userId: user.userId,
            sharedAccount,
          });
        }
      ); 

  
      openSuccessModal(t('accounts.account_updated_successfully')); // Success feedback
  
    } catch (error) {
      console.error('Failed to update account:', error);
      openFailureModal(t('accounts.failed_to_update'));
    }
  }

// Enable or disable account
  const changeActiveAccount = async (accountId: string, activeAccount: boolean) => {
    if (!accountId || !user?.userId) return;

    const newActiveState = !activeAccount;

    try {
      await db.transaction('rw', db.accounts, db.accountPreferences, async () => {
        // 1. Update the account's active state
        await db.accounts.update(accountId, { 
            activeAccount: newActiveState 
        });

        // 2. Fetch all accounts and current user's preferences
        const allAccounts = await db.accounts.toArray();
        const userPreferences = await db.accountPreferences
          .where('userId')
          .equals(user.userId)
          .toArray();
        
        const prefMap = new Map(userPreferences.map(p => [p.accountId, p.sortOrder]));
        
        // 3. Sort accounts: Active accounts first (ordered by preference), then disabled accounts
        const sortedAccounts = allAccounts.sort((a, b) => {
            if (a.activeAccount !== b.activeAccount) {
                return Number(b.activeAccount) - Number(a.activeAccount);
            }
            const orderA = prefMap.get(a.accountId) ?? 9999;
            const orderB = prefMap.get(b.accountId) ?? 9999;
            return orderA - orderB;
        });

        // 4. Re-assign contiguous sortOrder (0, 1, 2...) for active accounts in accountPreferences
        let activeIndex = 0;
        for (let i = 0; i < sortedAccounts.length; i++) {
          const acc = sortedAccounts[i];
          const compoundKey = [user.userId, acc.accountId];

          if (acc.activeAccount) {
            const newSortOrder = activeIndex++;
            
            const existingPref = await db.accountPreferences
              .where('[userId+accountId]')
              .equals(compoundKey)
              .first();

            if (existingPref) {
              await db.accountPreferences.update(existingPref.id!, { sortOrder: newSortOrder });
            } else {
              await db.accountPreferences.add({
                id: `${user.userId}_${acc.accountId}`,
                userId: user.userId,
                accountId: acc.accountId,
                sortOrder: newSortOrder,
              });
            }
          } else {
            // If disabled, remove its preference record (or handle as needed)
            const existingPref = await db.accountPreferences
              .where('[userId+accountId]')
              .equals(compoundKey)
              .first();

            if (existingPref && existingPref.id) {
              await db.accountPreferences.delete(existingPref.id);
            }
          }
        }
      });
      
    } catch (error) {
      console.error(`Failed to change account status or re-index preferences:`, error);
      openFailureModal(t('accounts.failed_to_update'));
    } 
  };

  // Open secondary menu
  const openPopover = (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    setPopoverEvent(event.nativeEvent); // Capture the click event
    setIsPopoverOpen(true);
  };

  // Close secondary menu
  const closePopover = () => {
    setIsPopoverOpen(false);
  };


  // Delete account
  const handleDeleteAccount = async (accountId: string) => {
    if (!user?.userId) return;

    try {
      await db.transaction(
        'rw', 
        db.accounts, 
        db.accountPreferences,
        async () => {           
          // 1. Delete the account record
          await db.accounts.where('accountId').equals(accountId).delete();
          
          // 2. Delete the associated preference record for this user
          await db.accountPreferences
            .where('[userId+accountId]')
            .equals([user.userId, accountId])
            .delete();
          
          // 3. Re-index remaining active accounts' preferences
          const remainingAccounts = await db.accounts.where('activeAccount').equals(1).toArray();
          const userPreferences = await db.accountPreferences
            .where('userId')
            .equals(user.userId)
            .toArray();
          
          const prefMap = new Map(userPreferences.map(p => [p.accountId, p.sortOrder]));

          remainingAccounts.sort((a, b) => (prefMap.get(a.accountId) ?? 9999) - (prefMap.get(b.accountId) ?? 9999));

          for (let i = 0; i < remainingAccounts.length; i++) {
            const acc = remainingAccounts[i];
            const compoundKey = [user.userId, acc.accountId];
            const newSortOrder = i;

            const existingPref = await db.accountPreferences
              .where('[userId+accountId]')
              .equals(compoundKey)
              .first();

            if (existingPref) {
              if (existingPref.sortOrder !== newSortOrder) {
                await db.accountPreferences.update(existingPref.id!, { sortOrder: newSortOrder });
              }
            } else {
              await db.accountPreferences.add({
                id: `${user.userId}_${acc.accountId}`,
                userId: user.userId,
                accountId: acc.accountId,
                sortOrder: newSortOrder,
              });
            }
          }
        }
      ); 

      openSuccessModal(t('accounts.account_deleted'));
    } catch (error) {
      openFailureModal(t('accounts.error_deleting'));
      console.error('Error deleting account:', error);
    }
  };  
  


  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>

          {/* Secondary menu for this account */}
          {isOwner && (
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
                    {isActiveAccount ? (
                      <>
                        <li 
                          className="item" 
                          onClick={() => {
                            closePopover(); // First, close the popover
                            setTimeout(() => changeActiveAccount(passedAccountId, isActiveAccount), 100); // Then update state after a brief delay
                          }}
                        >
                          <IonIcon icon={eyeOffOutline} /> {t('common.disable')}
                        </li>
                      </>
                    ) : (
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover(); // Close the popover first
                          setTimeout(() => changeActiveAccount(passedAccountId, isActiveAccount), 100); // Delay state change
                        }}
                      >
                        <IonIcon icon={eyeOutline} /> {t('common.enable')}
                      </li>
                    )}
                    {!hasExpenses && (
                      <li 
                        className="item" 
                        onClick={() => {
                          closePopover();
                          setTimeout(() => {
                            handleDeleteAccount(passedAccountId);
                          }, 100);
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
          )}
        </IonToolbar>
      </IonHeader>
    
      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <div className="page-container">
          <div className={!isOwner ? 'disabled' : ''}>
            {/* Screen Header */}
            <div className='centered-container mb-20'>
              <h2 className='screen-title'>{t('accounts.edit_account_title')}</h2>
            </div>
    
            {/* Show Default Card */}
            <section className="centered-container">
              <DefaultCard
                title={accountName}
                color= {isActiveAccount ? accountColor : "slateGray"}
                identifier={accountIdentifier}
                logo={accountLogo}
                amount=""
                editMode={isOwner}
                showOwner={hasActiveGuest}
                owner={hasActiveGuest ? accountOwner : ''}
              />
            </section>

            {/* Form Section */}
            <section>
              {/* Card name */}
              <div className={`form-item ${!isActiveAccount || !isOwner ? 'disabled': ''}`}>
                <div className='input-container'>
                  <label>{t('accounts.card_name')}</label>
                  <input
                    type="text"
                    value={accountName}
                    disabled={!isActiveAccount || !isOwner}
                    maxLength={30}
                    onChange={(e) =>
                      handleInputChange(
                        'cardName',
                        e.target.value,
                        setAccountName,
                        validateName,
                        t('common.invalid_name')
                      )
                    }
                    placeholder={t('accounts.card_name_placeholder')}
                    className={`input capitalize ${errors.cardName ? 'invalid' : ''}`}
                  />
                  {errors.cardName && <p className="error-text">{errors.cardName}</p>}
                </div>
              </div>

              {/* Card identifier */}
              <div className={`form-item ${!isActiveAccount || !isOwner ? 'disabled': ''}`}>
                <div className="input-container">
                  <label>{t('accounts.card_identifier')}</label>
                  <input
                    type="text"
                    value={accountIdentifier}
                    disabled={!isActiveAccount || !isOwner}
                    maxLength={30}
                    onChange={(e) =>
                      handleInputChange(
                        'cardIdentifier',
                        e.target.value,
                        setAccountIdentifier,
                        validateName,
                        t('common.invalid_name')
                      )
                    }
                    placeholder={t('accounts.card_identifier_placeholder')}
                    className={`input ${errors.cardIdentifier ? 'invalid' : ''}`}
                  />
                  {errors.cardIdentifier && <p className="error-text">{errors.cardIdentifier}</p>}
                </div>
              </div>
            </section>

            {/* Color picker */}
            <section>
              <div className="section-header">
                <h6 className='section-title'>{t('themes.choose_color')}</h6>
              </div>
              <ColorPicker 
                onColorSelect={setAccountColor} 
                initialColor={accountColor} 
                isDisabled={!isActiveAccount || !isOwner}
              />
            </section>


            {/* Logo picker */}
            <section>
              <h6 className="section-title">{t('accounts.choose_logo')}</h6>
              <IconPicker 
                selectedIcon={accountLogo}
                onIconSelect={setAccountLogo}
                isDisabled={!isActiveAccount || !isOwner}
                defaultView='accounts'
              />
            </section>


            {/* Share account if there's a guest */}
            {hasActiveGuest && (
              <section>
                <div
                  className='toggle-row'
                  onClick={() => {
                      isOwner && setSharedAccount(prev => !prev);
                  }}
                >
                  <IonToggle
                    checked={sharedAccount}
                    disabled={!isOwner || !isActiveAccount}
                  />
                  <span className={!isOwner || !isActiveAccount ? 'disabled' : ''}>Shared account</span>
                </div>
              </section>
            )}
            


            {/* Add account button */}
            <IonButton
              className="block mb-20"
              onClick={() => {
                if (isFormValid) {
                  updateAccount(passedAccountId);
                }
              }}
              disabled={!isFormValid || !isActiveAccount || !isOwner} // Disable the button if the form is invalid
            >
              {t('accounts.update_account')}
            </IonButton>
          </div>

          {/* Confirmation Modal */}
          <Modal
            isOpen={isConfirmationModalOpen}
            icon={modalConfig.icon}
            title={modalConfig.title}
            content={modalConfig.content}
            closeModal={() => setIsConfirmationModalOpen(false)}
            actions={modalConfig.actions}
          />
        </div>
      </IonContent>
    </IonPage>
    
  );
};

export default EditAccount;
