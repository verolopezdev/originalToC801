import React from 'react';
import { IonIcon, useIonRouter } from '@ionic/react';
import { cloudUploadOutline } from 'ionicons/icons';
import './SubscribeSlider.css';

export interface SubscribeCardProps {
  title: string;
  description: string;
  icon?: string;
  route: string;
  cardGradientVar: string;
}

const SubscribeCard: React.FC<SubscribeCardProps> = ({
  title,
  description,
  icon = cloudUploadOutline,
  route,
  cardGradientVar
}) => {
  const router = useIonRouter();

  const handleClick = () => {
    router.push(route, 'forward');
  };

  return (
    <div
      className="subscribe-card"
      style={{ '--card-accent': cardGradientVar } as React.CSSProperties}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
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