import { db, enableDexieCloud } from "../db";


export async function activatePremium(
  userId: string,
  plan: "monthly" | "yearly",
  expirationDate: string
) {
  try {
    await db.users.update(userId, {
      isPremium: true,
      subscriptionPlan: plan,
      subscriptionExpirationDate: expirationDate,
    });
  
    enableDexieCloud();
    // 1. Perform login first — Dexie Cloud acquires JWT tokens & user context
    await db.cloud.login();

    const currentUser = db.cloud.currentUser.getValue();

    if (currentUser && currentUser.isLoggedIn) {
      // 2. Fetch local expenses that don't belong to a realm yet
      const unauthExpenses = await db.expenses
        .filter(item => item.realmId === 'unauthorized' || !item.realmId)
        .toArray();

      if (unauthExpenses.length > 0) {
        // 3. Update records without manually altering restricted owner fields:
        // Dexie Cloud automatically maps new local writes to the active user session!
        await db.transaction('rw', db.expenses, async () => {
          for (const expense of unauthExpenses) {
            // Delete the old "unauthorized" key reference and re-insert
            // OR update using clear realm assignment:
            await db.expenses.put({
              ...expense,
              realmId: currentUser.userId // Uses the active user's string ID (e.g. email or user ID)
            });
          }
        });
      }

      // 4. Perform push sync with wait: true
      await db.cloud.sync({ purpose: 'push', wait: true });
    }
  } catch (error) {
    console.error("Upgrade sync error:", error);
    // Unblock UI gracefully on error
    throw error;
  }
}

