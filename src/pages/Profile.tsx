import React, { useState, useRef, useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { useTranslation } from 'react-i18next';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useKeyboardAutoClose } from '../hooks/useKeyboardAutoClose';
import { useUser } from '../context/UserContext'; // Import the useUser hook


// App components
import OptionIcon from '../components/OptionIcon';
import Modal from '../components/Modal';


// Ionic components
import { 
  IonBackButton,
  IonButton, 
  IonButtons, 
  IonContent,
  IonIcon,
  IonItem,
  IonHeader,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonPage, 
  IonToolbar,
} from '@ionic/react';


// Ionic icons
import { 
  cameraOutline, 
  imageOutline 
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './Profile.css';


// Main function
const Profile: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { user, updateUser } = useUser(); // Access user context
  const { avatar } = user; // Extract the subscribed property
  const modal = useRef<HTMLIonModalElement>(null); // Modal for profile photo
  const { t } = useTranslation();

  const [userName, setUserName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({
    userName: null,
    userLastName: null,
    userEmail: null,
  });
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  // Message modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    icon: '',
    title: '',
    content: '',
    actions: [] as { label: string; action: () => void; style?: string }[],
    destination: '',
  });
  
  useKeyboardAutoClose(); 

  useEffect (() => {
    if(user) {
      setUserName(user.name || t('common.default_user_name'));
      setUserLastName(user.lastName);
      setUserEmail(user.email);
    }
  }, [user]);


  const handleCamera = async () => {
    try {
      // Use the new dedicated takePhoto method
      const image = await Camera.takePhoto({
        quality: 90,
      });

      // On native platforms, you can use webPath for immediate rendering, 
      // or use thumbnail for a base64 string.
      const avatarPath = image.webPath || image.thumbnail;

      if (avatarPath) {
        updateUser({ avatar: avatarPath });
        modal.current?.dismiss();
      }
    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  const handleGallery = async () => {
    try {
      // Use the new dedicated chooseFromGallery method
      const gallery = await Camera.chooseFromGallery({
        allowMultipleSelection: false, // ensures single selection like getPhoto
        limit: 1,
      });

      // Grab the first selected item from the results array
      if (gallery.results && gallery.results.length > 0) {
        const image = gallery.results[0];
        const avatarPath = image.webPath || image.thumbnail;

        if (avatarPath) {
          updateUser({ avatar: avatarPath });
          modal.current?.dismiss();
        }
      }
    } catch (error) {
      console.error("Gallery error:", error);
    }
  };

  // validation function for first and last name
  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s]+$/u; // Allows only alphanumeric characters and spaces
    return nameRegex.test(name);
  };
  
  // Validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
      setErrors((prevErrors) => ({ ...prevErrors, [field]: t('common.empty_field') }));
    } else if (!validationFn(value)) {
      setErrors((prevErrors) => ({ ...prevErrors, [field]: errorMessage }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, [field]: null }));
    }
  };

  // Update form validity state
  useEffect(() => {
    const hasErrors = Object.values(errors).some((error) => error !== null);
    const hasEmptyFields =
      !userName.trim() || !userLastName.trim() || !userEmail.trim() || userName === t('common.user');
    setIsFormValid(!hasErrors && !hasEmptyFields);
  }, [errors, userName, userLastName, userEmail]);
  
  const openInfoModal = () => {
    setModalConfig({
      icon: 'success',
      title: t('modal.success_modal_title'),
      content: t('modal.success_data_change'),
      actions: [
        {
          label: t('common.continue'),
          action: () => setIsModalOpen(false),
        },
      ],
      destination: '/dashboard'
    });
    setIsModalOpen(true);
  };


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
        <div className="centered-container mb-20">
          <h2 className='screen-title'>{t('profile.profile_title')}</h2>
        </div>
        {/* Profile */}
        <section>
          <div className="centered-container">
            <div className="profile-container" id="open-modal">
              {avatar ? (
                // Display the avatar image if it exists
                <img
                  src={avatar}
                  alt={`${userName}'s Avatar`}
                  className="avatar-profile-image"
                />
              ) : (
                // Display initials if no avatar is set
                <div className="avatar-profile">
                  {userName.charAt(0)}
                  {userLastName && userLastName.charAt(0)}
                </div>
              )}
              <IonIcon
                icon={cameraOutline}
                className="icon-lower-right"
              />
            </div>
            <h3>{userName} {userLastName}</h3>
            {userEmail ? (
              <IonNote>{userEmail}</IonNote>
            ) : (
              <IonNote>{t('profile.your_email')}</IonNote>
            )}
            
          </div>
        </section>

        {/* Form Section */}
        <section>
          <div className="section-header">
            <h6 className="section-title">{t('profile.user_info')}</h6>
          </div>
            {/* User's name */}
            <div className='form-item'>
              <div className="input-container"> 
                <label>{t('profile.first_name')}</label>
                <input
                  type="text"
                  value={userName === t('common.default_user_name') ? '' : userName}
                  maxLength={20}
                  onChange={(e) =>
                    handleInputChange(
                      'userName',
                      e.target.value,
                      setUserName,
                      validateName,
                      t('common.invalid_name')
                    )
                  }
                  placeholder={t('profile.type_name')}
                  className={`input ${errors.userName ? 'invalid' : ''}`} 
                />
                {errors.userName && <p className="error-text">{errors.userName}</p>}
              </div>
            </div>  

            {/* User's last name */}
            <div className='form-item'>
              <div className="input-container">
                <label>{t('profile.last_name')}</label>
                <input
                  type="text"
                  value={userLastName}
                  maxLength={20}
                  onChange={(e) =>
                    handleInputChange(
                      'userLastName',
                      e.target.value,
                      setUserLastName,
                      validateName,
                      t('common.invalid_name')
                    )
                  }
                  placeholder={t('profile.type_last_name')}
                  className={`input ${errors.userLastName ? 'invalid' : ''}`}
                />
                {errors.userLastName && <p className="error-text">{errors.userLastName}</p>}
              </div>
            </div>

            {/* User's email */}
            <div className='form-item'>
              <div className="input-container">
                <label>Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) =>
                    handleInputChange(
                      'userEmail',
                      e.target.value,
                      setUserEmail,
                      validateEmail,
                      t('profile.invalid_email')
                    )
                  }
                  placeholder={t('profile.type_email')}
                  className={`input ${errors.userEmail ? 'invalid' : ''}`}
                />
                  {errors.userEmail && <p className="error-text">{errors.userEmail}</p>}
              </div>
            </div>

        </section>
        
        {/* Save changes button */}
        <IonButton
          className="block"
          onClick={() => {
            if (isFormValid) {
              updateUser({ name: userName, lastName: userLastName, email: userEmail });
              openInfoModal();
            }
          }}
          disabled={!isFormValid} // Disable the button if the form is invalid
        >
          {t('common.save_changes')}
        </IonButton>

        {/* Modal for profile photo */}
        <IonModal
          ref={modal}
          trigger="open-modal"
          initialBreakpoint={1}
          breakpoints={[0, 1]}
          backdropDismiss={true}
          className="sheet-modal"
        >
          <IonList lines="none" className='modal-list'>
            <IonListHeader>
              <IonLabel className='modal-title'>{t('profile.modal_title')}</IonLabel>
            </IonListHeader>
            <IonItem button onClick={handleCamera}>
              <OptionIcon icon={cameraOutline} />
              <IonLabel>{t('profile.take_photo')}</IonLabel>
            </IonItem>
            <IonItem button onClick={handleGallery}>
              <OptionIcon icon={imageOutline} />
              <IonLabel>{t('profile.choose_gallery')}</IonLabel>
            </IonItem>
          </IonList>
        </IonModal>

        {/* Success Confirmation Modal */}
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

export default Profile;
