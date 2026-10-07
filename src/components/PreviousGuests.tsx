import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { shareAccountWithGuest } from '../services/SharingService';
import { db } from '../db';

import {
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
} from '@ionic/react';
import { ellipse } from 'ionicons/icons';

interface UserRecord {
  userId: string;
  name?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  sharingRole?: string;
  sharingStatus?: string;
}

interface PreviousGuestsProps {
  previousGuests: UserRecord[];
  isAdmin: boolean;
  onReinvite?: (userId: string) => void;
}

const PreviousGuests: React.FC<PreviousGuestsProps> = ({
  previousGuests,
  isAdmin,
  onReinvite,
}) => {
  const { t } = useTranslation();
  const { user } = useUser();

  if (!previousGuests || previousGuests.length === 0) {
    return null;
  }

  // Add string type to email
  const handleInvite = async (userId: string, email: string) => {
    if (!email) {
      console.warn('⚠️ Cannot reinvite: email is missing');
      return;
    }
  
    try {
      // 1. Issue invitation request via SharingService
      await shareAccountWithGuest(user, email); 
  
      // 2. Check if the user record already exists in Dexie
      const existingGuest = await db.users
        .where('userId')
        .equals(userId)
        .or('email')
        .equals(email)
        .first();
  
      if (existingGuest) {
        // REINVITE: Update existing record to 'pending' / 'active'
        await db.users.update(existingGuest.userId, {
          sharingStatus: 'pending',
          sharingRole: 'guest',
          guestInitializedFromAdmin: false,
        });
        console.log('🔄 Existing guest status updated to pending:', existingGuest.userId);
      }
  
      onReinvite?.(userId);
    } catch (error) {
      console.error('❌ Failed to invite guest:', error);
    }
  };


  
  return (
    <section>
      <h6 className="section-title">
        {t('members.previous_guests', 'PREVIOUS GUESTS')}
      </h6>

      <div>
        {previousGuests.map((guest) => {
          const name =
            guest.name ||
            guest.email ||
            guest.userId ||
            t('common.default_user_name');

          const lastName = guest.lastName || '';
          const emailToUse = guest.email || guest.userId || '';
          const avatar = guest.avatar;

          return (
            <IonItem key={guest.userId}>
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
                      {name.charAt(0).toUpperCase()}
                      {lastName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="profile-name">
                    <p>
                      {name} {lastName}
                    </p>

                    {emailToUse && emailToUse !== name && <p>{emailToUse}</p>}

                    <div className="flex">
                      <IonIcon
                        icon={ellipse}
                        style={{
                          color: 'var(--ion-color-medium)',
                          marginRight: '5px',
                        }}
                      />
                      <IonNote>
                        {t('members.inactive', 'INACTIVE')}
                      </IonNote>
                    </div>
                  </div>
                </div>
              </IonLabel>

              {isAdmin && (
                <IonButtons slot="end">
                  <button
                    type="button"
                    onClick={async () => {
                      // Trigger internal handler
                      await handleInvite(guest.userId, emailToUse);
                      // Optional callback notification to parent page
                      onReinvite?.(guest.userId);
                    }}
                  >
                    {t('members.reinvite', 'REINVITE')}
                  </button>
                </IonButtons>
              )}
            </IonItem>
          );
        })}
      </div>
    </section>
  );
};

export default PreviousGuests;