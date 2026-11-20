import React from 'react';
import { IonIcon } from '@ionic/react';
import { cloudUploadOutline } from 'ionicons/icons';
import './SubscribeSlider.css';

export interface SubscribeCardProps {
  title: string;
  description: string;
  icon?: string;
  accentColor?: string;
  onClick?: () => void;
  cardGradientVar: string;
}

const SubscribeCard: React.FC<SubscribeCardProps> = ({
  title,
  description,
  icon = cloudUploadOutline,
  accentColor = '#3880ff',
  onClick,
  cardGradientVar
}) => {
  return (
    <div
      className="subscribe-card"
      style={{ '--card-accent': cardGradientVar } as React.CSSProperties}
    >      
      <div className="subscribe-card-content">
        <div className="subscribe-text-section">
          <h3 className="subscribe-title">{title}</h3>
          <p className="subscribe-desc">{description}</p>
        </div>

        <div className="subscribe-graphic-section">
          <div className="subscribe-glow-ring ring-outer" />
          <div className="subscribe-glow-ring ring-inner" />
          <div className="subscribe-badge">
            <IonIcon
              icon={icon}
              className="subscribe-badge-icon"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribeCard;