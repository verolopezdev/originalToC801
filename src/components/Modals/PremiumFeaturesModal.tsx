import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
} from '@ionic/react';
import { airplaneOutline, cashOutline, closeOutline, peopleOutline, repeatOutline, sparklesOutline } from 'ionicons/icons';
import './PremiumFeaturesModal.css';

export interface PremiumFeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
}

const FEATURES: PremiumFeatureItem[] = [
  {
    id: 'travel-mode',
    title: 'Travel Mode',
    description: 'Keep your vacation spending organized in a dedicated space while on the go.',
    icon: airplaneOutline,
    accentColor: '#2b8cff',
  },
  {
    id: 'multi-currency',
    title: 'Multi-Currency',
    description: 'Manage expenses in different currencies with automatic, up-to-date conversion.',
    icon: cashOutline,
    accentColor: '#34c759',
  },
  {
    id: 'recurrent-expenses',
    title: 'Recurring Expenses',
    description: 'Automate your monthly fixed bills and never miss a payment in your budget.',
    icon: repeatOutline,
    accentColor: '#ff9500',
  },
  {
    id: 'shared-subscription',
    title: 'Shared Subscription',
    description: 'Share premium benefits with the person you split your expenses with.',
    icon: peopleOutline,
    accentColor: '#af52de',
  },
];


interface PremiumFeaturesModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
}

const PremiumFeaturesModal: React.FC<PremiumFeaturesModalProps> = ({
  isOpen,
  onDidDismiss,
}) => {
  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      className="premium-features-modal"
    >
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Premium Features</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss} aria-label="Close">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p className="premium-modal-subtitle">
          Everything you unlock to manage your finances with full control.
        </p>

        <ul className="premium-features-list">
          {FEATURES.map((feature : any) => (
            <li key={feature.id} className="premium-feature-row">
              <div
                className="premium-feature-icon-wrap"
                style={
                  { '--feature-accent': feature.accentColor } as React.CSSProperties
                }
              >
                <IonIcon icon={feature.icon} />
              </div>

              <div className="premium-feature-info">
                <h4 className="premium-feature-title">{feature.title}</h4>
                <p className="premium-feature-desc">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </IonContent>

      <IonFooter className="ion-no-border premium-modal-footer">
        <IonButton
          expand="block"
          shape="round"
          className="premium-subscribe-cta"
          onClick={() => {
            onDidDismiss();
          }}
        >
          <IonIcon slot="start" icon={sparklesOutline} />
          Unlock Premium
        </IonButton>
      </IonFooter>
    </IonModal>
  );
};

export default PremiumFeaturesModal;