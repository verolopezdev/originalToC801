
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

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
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';

import {
  closeOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  airplaneOutline,
  cashOutline,
  repeatOutline,
  peopleOutline,
  pricetagsOutline,
  statsChartOutline,
  documentTextOutline,
  cloudDoneOutline,
  chevronDownOutline,
} from 'ionicons/icons';

import './PremiumFeaturesModal.css';


export interface PremiumFeatureItem {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  icon: string;
  accentColor: string;
}

const FEATURES: PremiumFeatureItem[] = [
  {
    id: 'travel-mode',
    title: 'Travel Mode',
    summary: 'Keep vacation spending organized.',
    highlights: [
      'Separate expenses for each trip',
      'Track spending in destination currency',
      'Keep travel finances independent',
    ],
    icon: airplaneOutline,
    accentColor: '#cd1c18',
  },
  {
    id: 'multi-currency',
    title: 'Multi-Currency',
    summary: 'Manage expenses in different currencies.',
    highlights: [
      'Support for multiple currencies',
      'Automatic exchange rate conversion',
      'Choose your preferred currencies',
    ],
    icon: cashOutline,
    accentColor: '#FF6A00',
  },
  {
    id: 'recurrent-expenses',
    title: 'Recurring Expenses',
    summary: 'Automate your regular payments.',
    highlights: [
      'Create repeating expenses',
      'Set weekly, monthly or yearly intervals',
      'Keep track of ongoing commitments',
    ],
    icon: repeatOutline,
    accentColor: '#ffc600',
  },
  {
    id: 'shared-subscription',
    title: 'Shared Subscription',
    summary: 'Share Premium with another person.',
    highlights: [
      'Invite one other person',
      'Access shared financial information',
      'Keep individual expense ownership',
    ],
    icon: peopleOutline,
    accentColor: '#008800',
  },
  {
    id: 'unlimited-categories',
    title: 'Unlimited Categories & Subcategories',
    summary: 'Organize expenses without limits.',
    highlights: [
      'Create unlimited categories',
      'Create unlimited subcategories',
      'Customize your expense organization',
    ],
    icon: pricetagsOutline,
    accentColor: '#4682B4',
  },
  {
    id: 'statistics',
    title: 'Advanced Statistics',
    summary: 'Understand your spending patterns.',
    highlights: [
      'Pie charts',
      'Doughnut charts',
      'Bar charts',
      'Line charts',
    ],
    icon: statsChartOutline,
    accentColor: '#00509d',
  },
  {
    id: 'exports',
    title: 'PDF & CSV Exports',
    summary: 'Take your financial data anywhere.',
    highlights: [
      'Export reports to PDF or CSV',
      'Organize reports by category',
      'Export expenses chronologically',
    ],
    icon: documentTextOutline,
    accentColor: '#692A97',
  },
  {
    id: 'cloud-sync',
    title: 'Automatic Cloud Sync',
    summary: 'Keep your data synchronized automatically.',
    highlights: [
      'Automatic synchronization with Dexie Cloud',
      'Access your data across connected devices',
      'No manual transfers required',
    ],
    icon: cloudDoneOutline,
    accentColor: '#a04b90',
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
  const history = useHistory();
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const toggleFeature = (id: string) => {
    setExpandedFeature((current) => current === id ? null : id);
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={() => {
        setExpandedFeature(null);
        onDidDismiss();
      }}
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
          Everything you need to take control of your finances.
        </p>

        <div className="premium-features-list">
          {FEATURES.map((feature) => {
            const isExpanded = expandedFeature === feature.id;

            return (
              <div
                key={feature.id}
                className={`premium-feature-accordion ${isExpanded ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="premium-feature-row"
                  onClick={() => toggleFeature(feature.id)}
                  aria-expanded={isExpanded}
                >
                  <div
                    className="premium-feature-icon-wrap"
                    style={{
                      '--feature-accent': feature.accentColor,
                    } as React.CSSProperties}
                  >
                    <IonIcon icon={feature.icon} />
                  </div>

                  <div className="premium-feature-info">
                    <h4 className="premium-feature-title">
                      {feature.title}
                    </h4>

                    <p className="premium-feature-summary">
                      {feature.summary}
                    </p>
                  </div>

                  <IonIcon
                    icon={chevronDownOutline}
                    className="premium-feature-chevron"
                  />
                </button>

                {isExpanded && (
                  <div className="premium-feature-details">
                    {feature.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        className="premium-feature-highlight"
                      >
                        <IonIcon
                          icon={checkmarkCircleOutline}
                          color="success"
                        />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </IonContent>

      <IonFooter className="ion-no-border premium-modal-footer">
        <IonButton
          expand="block"
          shape="round"
          className="premium-subscribe-cta"
          onClick={() => {
            onDidDismiss();
            history.push('/app/getpremium');
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