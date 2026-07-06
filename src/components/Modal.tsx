import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

// Ionic components
import { 
  IonButton, 
  IonButtons, 
  IonHeader, 
  IonIcon, 
  IonModal, 
  IonToolbar 
} from '@ionic/react';

// Ionic Icons
import { 
  alertCircleOutline, 
  checkmarkOutline,
  closeOutline,
  informationCircleOutline,
} from 'ionicons/icons';

import '../Main.css';

interface ModalProps {
  isOpen: boolean;
  icon: string;
  title: string;
  content: string;
  closeModal: () => void;
  actions?: { label: string; action: () => void; style?: string }[]; // Dynamic actions
  destination?: string; // Destination route
}

const Modal: React.FC<ModalProps> = ({ isOpen, icon, title, content, closeModal, actions, destination }) => {
  const history = useHistory();
  
  const handleButtonClick = (action?: () => void) => {
    if (action) action(); // Call custom action if provided
    closeModal(); // Close modal

    setTimeout(() => {
      if (destination) {
        history.push(destination); // Navigate only after modal has fully closed
      }
    }, 300); // Adjust this delay as needed
  };

  const selectedIcon = (() => {
    switch (icon) {
      case 'alert':
        return alertCircleOutline;
      case 'info':
        return informationCircleOutline;
      case 'success':
        return checkmarkOutline;
      case 'failure':
        return closeOutline;
      default:
        return '';
    }
  })();

  return (
    <IonModal isOpen={isOpen} onDidDismiss={closeModal} className="small-modal">
      <IonHeader className="ion-no-border">
        <IonToolbar className='transparent'>
          <IonButtons slot="end">
            <IonButton onClick={closeModal}>
              <IonIcon aria-hidden="true" icon={closeOutline} className="close-modal" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <div className="modal-content">
        {selectedIcon && (
          <IonIcon icon={selectedIcon} className={`modal-prompt-icon ${icon === 'failure' ? 'fail-text' : ''}`}></IonIcon>
        )}

        <h3 className="mb-20">{title}</h3>
        <p className="mb-20">{content}</p>
        <div className="modal-btns">
          {actions?.map((action, index) => (
            <IonButton
              key={index}
              className={`small-btn ${action.style || ''}`}
              onClick={() => handleButtonClick(action.action)}
            >
              {action.label}
            </IonButton>
          ))}
        </div>
      </div>
    </IonModal>
  );
};

export default Modal;
