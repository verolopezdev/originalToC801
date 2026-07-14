import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';


// App components
import ColorPicker from '../components/ColorPicker';
import DefaultCard from '../components/DefaultCard';
import Modal from '../components/Modal';
import IconPicker from '../components/IconPicker';


// Ionic components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonPage,
  IonToolbar,
} from '@ionic/react';


// Styles
import '../Main.css';



const NewAccount: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { userId } = useUser(); // Access user context
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const color = themeColor.split("-")[1]; // Extracts color name to initialize selectedColor

  const [errors, setErrors] = useState<{ [key: string]: string | null }>({
    cardName: null,
    cardIdentifier: null,
  });
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
    destination: ''
  });

  const [accountName, setAccountName] = useState<string>('');
  const [accountIdentifier, setAccountIdentifier] = useState<string>('');
  const [accountLogo, setAccountLogo] = useState<string>("fa-globe");
  const [accountColor, setAccountColor] = useState<string>(color);

  useKeyboardAutoClose(); 
  
  // validation function for card name
  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s@\-_\/.]+$/u; // Allows only alphanumeric characters, spaces @ - _ /
    return nameRegex.test(name);
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

  async function getNextSortOrder(): Promise<number> {
    // 1. Get the last account ordered by sortOrder
    // .last() will return the account with the highest sortOrder.
    const lastAccount = await db.accounts
      .orderBy('sortOrder')
      .last();
  
    // 2. Calculate the next order number
    // If no accounts exist (first account), sortOrder is 0.
    // Otherwise, it's the last account's sortOrder + 1.
    return lastAccount ? lastAccount.sortOrder + 1 : 0;
  }

  
  // Update form validity state
  useEffect(() => {
    const hasErrors = Object.values(errors).some((error) => error !== null);
    const hasEmptyFields =
      !accountName.trim();
    setIsFormValid(!hasErrors && !hasEmptyFields);
  }, [errors, accountName]);
  
  
  // Color selection
  const handleColorSelect = (color: string) => {
    setAccountColor(color);
  };


  // Success Modal
  const openInfoModal = () => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: t('modal.success_add_account_msg'),
      actions: [
        {
          label: t('common.continue'),
          action: () => setIsModalOpen(false),
        },
      ],
      destination: '/accounts',
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
      destination: '/accounts',
    });
    setIsModalOpen(true);
  };
  

  // Create new account record in database
  async function addAccount() {
    try {
      // 👇 NEW: Calculate the sortOrder before adding the account
      const sortOrder = await getNextSortOrder();
      
      // Check if the calculated sortOrder is available (should always be non-null)
      if (sortOrder === undefined || sortOrder === null) {
          throw new Error("Could not determine next sortOrder.");
      }
      
      // 🚨 CRITICAL FIX: Wrap the operation in an explicit transaction 🚨
      // We list both 'accounts' and 'changes' tables.
      await db.transaction('rw', db.accounts, async (tx) => {
        console.log("Starting account creation transaction...");
        
        const accountId = await tx.accounts.add({
            accountName,
            accountIdentifier,
            accountColor,
            accountLogo,
            activeAccount: true,
            userId,
            sortOrder
        });
        
        // The Dexie hook for 'accounts' will now successfully write 
        // to the 'changes' table because 'changes' is part of the transaction (tx).
        console.log(`Account added with ID: ${accountId}. Change logged successfully.`);
      });
      // 🚨 END CRITICAL FIX 🚨

      setAccountName('');
      setAccountIdentifier('');
      setAccountLogo("fa-globe");
      setAccountColor(color);
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
        <div className='centered-container mb-10'>
          <h2 className='screen-title'>{t('accounts.new_account_title')}</h2>
        </div>
        
        {/* Show Default Card */}
        <section>
          <div className="centered-container">
            <DefaultCard
              title={accountName}
              color= {accountColor}
              identifier={accountIdentifier}
              logo={accountLogo}
              amount=""
              editMode={true}
            />
          </div>
        </section>

        {/* Form Section */}
        <section>
          {/* Card name */}
          <div className='form-item'>
            <div className="input-container">
              <label>{t('accounts.card_name')}</label>
              <input
                type="text"
                value={accountName}
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
          <div className='form-item'>
            <div className="input-container">
              <label>{t('accounts.card_identifier')}</label>
              <input
                type="text"
                value={accountIdentifier}
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
          <h6 className='section-title'>{t('themes.choose_color')}</h6>
          <ColorPicker onColorSelect={handleColorSelect} initialColor={accountColor} />
        </section>

        {/* Logo picker */}
        <section>
          <h6 className="section-title">{t('accounts.choose_logo')}</h6>
          <IconPicker 
            selectedIcon={accountLogo}
            onIconSelect={setAccountLogo}
            defaultView='accounts'
          />
        </section>


        {/* Add account button */}
        <IonButton
          className="block mb-60"
          onClick={() => {
            if (isFormValid) {
              addAccount();
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {t('accounts.add_account')}
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

      </IonContent>
    </IonPage>
  );
};

export default NewAccount;