import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '../db';
import { useUser } from '../context/UserContext';

const Members: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  // Get all members belonging to the shared Expense Tracker realm.
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

  // Get the User records belonging to the same shared realm.
  // These records contain profile information such as name,
  // last name, email and avatar.
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
        <h6 className="section-title">
          {t('members.title')}
        </h6>

        <IonList lines="inset" className="no-padding">
          <IonItem>
            <IonSpinner />
          </IonItem>
        </IonList>
      </section>
    );
  }

  return (
    <section>
      <h6 className="section-title">
        {t('members.title')}
      </h6>

      <IonList lines="inset" className="no-padding">
        {members.map((member) => {
          // Find the application's User record corresponding
          // to this Dexie Cloud member.
          const memberUser = users.find(
            (item) => item.userId === member.userId
          );

          // The owner member represents the administrator.
          const isAdministrator =
            member.userId === member.owner;

          // Prefer profile information from the User record.
          // Fall back to information available on the member record.
          const name =
            memberUser?.name ||
            member.name ||
            member.email ||
            member.userId ||
            t('common.default_user_name');

          const lastName =
            memberUser?.lastName || '';

          const email =
            memberUser?.email ||
            member.email ||
            member.userId ||
            '';

          const avatar = memberUser?.avatar;

          // Determine the role/status from the member record.
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

                    {email && email !== name && (
                      <p>
                        {email}
                      </p>
                    )}

                    <IonNote>
                      {role}
                    </IonNote>
                  </div>

                </div>
              </IonLabel>
            </IonItem>
          );
        })}
      </IonList>
    </section>
  );
};

export default Members;