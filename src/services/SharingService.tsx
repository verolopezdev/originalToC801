import { db } from "../db";
import type { User } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

/* TEST AREA */



/* END OF TEST AREA */



export interface SharedRealm {
  realmId: string;
  name?: string;
  represents?: string;
  owner?: string;
}




export const shareAccountWithGuest = async (
  user: User,
  email: string
): Promise<void> => {

  let sharedRealmId = user.sharedRealmId;

  if (!sharedRealmId) {
    sharedRealmId = await createSharedRealm();

    await moveAllDataToSharedRealm(sharedRealmId);

    // Update the user record in Dexie.
    await db.users.update(user.userId, {
      realmId: sharedRealmId,
      sharedRealmId,
      sharingRole: "admin",
      sharingStatus: "active",
    });
  }

  await inviteGuest(sharedRealmId, email);
};




/**
 * Creates a new shared realm for the expense tracker.
 */
export const createSharedRealm = async (): Promise<string> => {

  const realmId = await db.realms.add({
    name: "Expense Tracker",
    represents: "a shared expense tracker",
  });

  return realmId;
};





/**
 * Moves all data that should be shared with the guest
 * into the specified shared realm.
 *
 * The owner of each record is NOT changed.
 * Only the realmId is changed.
 */
export const moveAllDataToSharedRealm = async (
  sharedRealmId: string
): Promise<void> => {

  await db.transaction(
    "rw",
    [
      db.users,
      db.accounts,
      db.accountPreferences,
      db.categories,
      db.subcategories,
      db.expenses,
      db.trips,
      db.historicCurrencyList,
      db.alternativeCurrencies, 
      db.recurringSeries,
    ],
    async () => {
      await db.users.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.accounts.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.accountPreferences.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.categories.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.subcategories.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.expenses.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.trips.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.historicCurrencyList.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.alternativeCurrencies.toCollection().modify({
        realmId: sharedRealmId,
      });

      await db.recurringSeries.toCollection().modify({
        realmId: sharedRealmId,
      });
    }
  );

};





/**
 * Invite one guest to the shared Expense Tracker realm.
 *
 * @param sharedRealmId The shared Expense Tracker realm ID.
 * @param guestEmail Email address of the guest.
 */
export const inviteGuest = async (
  sharedRealmId: string,
  guestEmail: string
): Promise<void> => {
  const email = guestEmail.trim().toLowerCase();

  if (!email) {
    throw new Error('Guest email is required.');
  }

  // Check whether this email has already been invited
  // to this shared realm.
  const existingMember = await db.members
    .where('[email+realmId]')
    .equals([email, sharedRealmId])
    .first();

  if (existingMember) {
    throw new Error('This email has already been invited.');
  }

  // Create the guest invitation.
  await db.members.add({
    realmId: sharedRealmId,
    email,
    invite: true,

    permissions: {
      add: [
        'expenses',
        'users',
        'accounts',
        'accountPreferences',
        'categories',
        'trips',
        'currencies',
        'historicCurrencyList',
        'alternativeCurrencies',
        'recurringSeries',
      ],
      update: {
        categories: '*', // Grants full update access for categories
      },
      manage: ['categories'], // 👈 Required in Dexie Cloud to delete categories owned by other users
    },
  });
};



export const useHasGuest = (sharedRealmId?: string) => {
  const hasGuest = useLiveQuery(
    async () => {
      if (!sharedRealmId) {
        return false;
      }

      const members = await db.members
        .where('realmId')
        .equals(sharedRealmId)
        .toArray();

      return members.some(member => member.email);
    },
    [sharedRealmId]
  );

  return hasGuest ?? false;
};



//  THIS WORKS BUT DOESN'T EXPULSE GUEST FROM SEAT
export async function deactivateGuest(
  sharedRealmId: string,
  memberUserId: string
) {
  try {
    
    // 1. Find the guest's application User record.
    const guest = await db.users
      .where("realmId")
      .equals(sharedRealmId)
      .filter(
        (item) =>
          item.email === memberUserId &&
          item.sharingRole === "guest"
      )
      .first();

    if (!guest) {
      throw new Error(
        `Guest User record not found: ${memberUserId}`
      );
    }

    // 2. Mark the guest as inactive.
    // Keep the User record because it contains
    // the guest's identity and historical relationship
    // with the shared account.
    await db.users.update(guest.userId, {
      sharingStatus: "inactive",
    });

    // 3. Find the guest's active Dexie Cloud membership.
    const member = await db.members
      .where("realmId")
      .equals(sharedRealmId)
      .filter(
        (item) =>
          item.userId === memberUserId &&
          item.userId !== item.owner
      )
      .first();

    // 4. Remove the active membership.
    // This removes the guest's access to the shared realm,
    // but does NOT delete their expenses.
    if (member?.id) {
      await db.members.delete(member.id);
    }

    console.log(
      "🚫 Guest deactivated:",
      memberUserId
    );
  } catch (error) {
    console.error(
      "❌ Failed to deactivate guest:",
      error
    );

    throw error;
  }
}


/*
export async function deactivateGuest(
  sharedRealmId: string,
  memberUserId: string
) {
  try {
    console.log("🧨 memberUserId: ", memberUserId);
    console.log("🧨 sharedRealmId: ", sharedRealmId);

    // 1. Mark application-level status in local db.users
    const guest = await db.users
      .where("realmId")
      .equals(sharedRealmId)
      .filter(
        (item) => item.email === memberUserId && item.sharingRole === "guest"
      )
      .first();

    if (guest) {
      await db.users.update(guest.userId, { sharingStatus: "inactive" });
    }

    // 2. Delete local app membership record
    const member = await db.members
      .where("realmId")
      .equals(sharedRealmId)
      .filter(
        (item) => item.userId === memberUserId && item.userId !== item.owner
      )
      .first();

    if (member?.id) {
      await db.members.delete(member.id);
    }

    // 3. Notify your secure backend to free the seat
    await notifyBackendToFreeSeat(memberUserId, sharedRealmId);

    // 4. Force immediate synchronization
    await db.cloud.sync();

    console.log("🚫 Guest deactivated and expulsed:", memberUserId);
  } catch (error) {
    console.error("❌ Failed to deactivate guest:", error);
    throw error;
  }
}


// 1. La función que actúa como puente hacia tu backend seguro
export async function notifyBackendToFreeSeat(memberUserId: string, sharedRealmId: string) {
  // URL de tu servidor / función serverless (Node.js, Firebase, Vercel, etc.)
  const BACKEND_URL = "https://tu-api.com/api/deactivate-user"; 

  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Si tu backend requiere que el admin esté autenticado con tu propia app, 
      // puedes pasar un token de sesión tuyo aquí:
      // 'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ 
      userId: memberUserId, 
      realmId: sharedRealmId 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al comunicarse con el servidor seguro.');
  }

  return await response.json();
}



export async function checkGuestMembership(
  userId: string
): Promise<boolean> {
  const member = await db.members
    .where("userId")
    .equals(userId)
    .first();

  return !!member && member.userId !== member.owner;
}
  */