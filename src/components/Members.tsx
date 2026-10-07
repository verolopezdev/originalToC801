import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '../db';
import { useUser } from '../context/UserContext';
import { deactivateGuest } from '../services/SharingService';

import { closeCircleOutline, ellipse } from 'ionicons/icons';

const Members: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  const members = useLiveQuery(
    async () => {
      if (!user?.sharedRealmId) return [];

      return db.members
        .where('realmId')
        .equals(user.sharedRealmId)
        .toArray();
    },
    [user?.sharedRealmId],
    []
  );

  const users = useLiveQuery(
    async () => {
      if (!user?.sharedRealmId) return [];

      return db.users
        .where('realmId')
        .equals(user.sharedRealmId)
        .toArray();
    },
    [user?.sharedRealmId],
    []
  );


  if (members === undefined || users === undefined) {
    return (
      <section>
        <h6 className="section-title">{t('members.title')}</h6>
        <IonList lines="inset" className="no-padding">
          <IonItem>
            <IonSpinner />
          </IonItem>
        </IonList>
      </section>
    );
  }

  const handleDeactivateGuest = async (memberUserId: string) => {
    if (!user?.sharedRealmId) return;

    try {
      await deactivateGuest(user.sharedRealmId, memberUserId);
      console.log('🚫 Guest deactivated:', memberUserId);
    } catch (error) {
      console.error('❌ Error deactivating guest:', error);
    }
  };

  return (
    <section>
      <h6 className="section-title">{t('members.title')}</h6>

      <div>
        {members.map((member) => {
          const memberUser = users.find(
            (item) => item.userId === member.userId
          );

          const memberUserId = member.userId || member.email;
          if (!memberUserId) return null;

          const isAdministrator = member.userId === member.owner;
          const isCurrentUser = member.userId === user.email;

          const dotColor = isCurrentUser
            ? 'var(--ion-color-primary)'
            : 'var(--ion-color-medium)';

          const name =
            memberUser?.name ||
            member.name ||
            member.email ||
            member.userId ||
            t('common.default_user_name');

          const lastName = memberUser?.lastName || '';
          const email =
            memberUser?.email || member.email || member.userId || '';
          const avatar = memberUser?.avatar;

          const role = isAdministrator
            ? t('members.administrator')
            : member.invite
            ? member.accepted
              ? t('members.guest')
              : t('members.invitation_pending')
            : t('members.guest');

          return (
            <IonItem key={member.id}>
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

                    {email && email !== name && <p>{email}</p>}

                    <div className="flex">
                      <IonIcon
                        icon={ellipse}
                        style={{
                          color: dotColor,
                          marginRight: '5px',
                        }}
                      />

                      <IonNote>{role}</IonNote>
                    </div>
                  </div>
                </div>
              </IonLabel>

              {!isAdministrator && user.sharingRole === 'admin' && (
                <IonButtons slot="end">
                  <IonIcon
                    className="medium-icon-btn danger"
                    icon={closeCircleOutline}
                    onClick={() => handleDeactivateGuest(memberUserId)}
                  />
                </IonButtons>
              )}
            </IonItem>
          );
        })}
      </div>
    </section>
  );
};

export default Members;