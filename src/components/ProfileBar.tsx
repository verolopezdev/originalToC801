import React from 'react';
import {
  IonItem,
  IonLabel,
  IonList,
  IonNote,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

interface ProfileBarProps {
  name: string;
  lastName: string;
  email?: string;
  avatar?: string;
}

const ProfileBar: React.FC<ProfileBarProps> = ({
  name,
  lastName,
  email,
  avatar,
}) => {
  const { t } = useTranslation();

  return (
    <IonList className="profile-settings">
      <IonItem
        detail={true}
        routerLink="/app/profile"
        lines="none"
        className="no-padding"
      >
        <IonLabel>
          <div className="profile-avatar-bar">
            {avatar ? (
              <img
                src={avatar}
                alt={`${name}'s Avatar`}
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar">
                {name.charAt(0)}
                {lastName.charAt(0)}
              </div>
            )}

            <div className="profile-name">
              <p>
                {name} {lastName}
              </p>

              {email ? (
                <IonNote>{email}</IonNote>
              ) : (
                <IonNote>{t('settings.add_email')}</IonNote>
              )}
            </div>
          </div>
        </IonLabel>
      </IonItem>
    </IonList>
  );
};

export default ProfileBar;