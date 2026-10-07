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
      db.categories,
      db.subcategories,
      db.expenses,
      db.trips,
      db.historicCurrencyList,
      db.alternativeCurrencies,
    ],
    async () => {
      await db.users.toCollection().modify({
        realmId: sharedRealmId,
      });

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

};





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
      add: ['expenses', 'users'],
      update: {},
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




export async function deactivateGuest(
  sharedRealmId: string,
  memberUserId: string
) {
  try {
    console.log("🧨 memberUserId: ", memberUserId);
    console.log("🧨 sharedRealmId: ", sharedRealmId);
    
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




export async function checkGuestMembership(
  userId: string
): Promise<boolean> {
  const member = await db.members
    .where("userId")
    .equals(userId)
    .first();

  return !!member && member.userId !== member.owner;
}