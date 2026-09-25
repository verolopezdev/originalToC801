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
  console.log("** 1 ** Sharing account with guest...");

  let sharedRealmId = user.sharedRealmId;

  if (!sharedRealmId) {
    sharedRealmId = await createSharedRealm();

    await moveAllDataToSharedRealm(sharedRealmId);

    // Update the user record in Dexie.
    await db.users.update(user.userId, {
      sharedRealmId,
      sharingRole: "admin",
    });
  }

  await inviteGuest(sharedRealmId, email);
};




/**
 * Creates a new shared realm for the expense tracker.
 */
export const createSharedRealm = async (): Promise<string> => {
  console.log("** 2 ** Creating shared realm id...");

  const realmId = await db.realms.add({
    name: "Expense Tracker",
    represents: "a shared expense tracker",
  });

  console.log("✅ Shared realm created:", realmId);

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
  console.log("** 3 ** Moving all data to shared realm...");

  await db.transaction(
    "rw",
    [
      db.accounts,
      db.categories,
      db.subcategories,
      db.expenses,
      db.trips,
      db.historicCurrencyList,
      db.alternativeCurrencies,
    ],
    async () => {

      await db.accounts.toCollection().modify({
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
    }
  );

  console.log("✅ All shared data moved to:", sharedRealmId);
};





/**
 * Complete sharing flow:
 *
 * 1. Create shared realm
 * 2. Move shared data into that realm
 * 3. Invite guest
 
export const shareExpenseTracker = async (
  guestEmail: string
): Promise<string> => {

  const normalizedEmail = guestEmail.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Guest email is required.");
  }

  // 1. Create the shared realm.
  const sharedRealmId = await createSharedRealm();

  // 2. Move the existing admin data into the shared realm.
  await moveAllDataToSharedRealm(sharedRealmId);

  // 3. Invite the guest.
  await inviteGuest(sharedRealmId, normalizedEmail);

  console.log("✅ Expense tracker shared successfully.");

  return sharedRealmId;
};
*/




/**
 * Invite one guest to the shared Expense Tracker realm.
 *
 * The guest will:
 * - Have access to the shared realm after accepting the invitation.
 * - Be able to add expenses.
 * - Be able to update expenses.
 * - Be able to delete expenses.
 *
 * The guest will NOT have mutation permissions for:
 * - accounts
 * - categories
 * - trips
 * - currencies
 *
 * @param sharedRealmId The shared Expense Tracker realm ID.
 * @param guestEmail Email address of the guest.
 */
export const inviteGuest = async (
  sharedRealmId: string,
  guestEmail: string
): Promise<void> => {
  console.log("** 4 ** Inviting guest...");
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
      add: ['expenses'],
      update: {
        expenses: '*',
      },
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