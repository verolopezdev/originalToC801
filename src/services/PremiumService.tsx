import { db } from "../db";


/* export async function activatePremium(    
  userId: string,
  plan: "monthly" | "yearly",
  expirationDate: string
) {
  try {
  
    // 1. Perform login first — Dexie Cloud acquires JWT tokens & user context
    await db.cloud.login();

    await db.users.update(userId, {
      isPremium: true,
      subscriptionPlan: plan,
      subscriptionExpirationDate: expirationDate,
    });


  } catch (error: any) {
    console.error("🔴 Causa exacta del REJECTED:", error);
    // Unblock UI gracefully on error
    throw error;
  }
}
 */


export async function activatePremium(
  userId: string,
  plan: "monthly" | "yearly",
  expirationDate: string
) {
  try {

    // 1. Perform login first — Dexie Cloud acquires JWT tokens & user context
    await db.cloud.login();

    // 2. Get the current Dexie Cloud authenticated user
    const dexieUser = db.cloud.currentUser.value;

    console.log("🔐 Dexie Cloud user:", dexieUser);
    console.log("🆔 Dexie Cloud userId:", dexieUser?.userId);

    // With Dexie Cloud's default email OTP authentication,
    // userId is normally the user's verified email.
    const email = dexieUser?.userId;

    // 3. Get our application's User record
    const user = await db.users.get(userId);

    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    // 4. Build the update
    const updates: Partial<typeof user> = {
      isPremium: true,
      subscriptionPlan: plan,
      subscriptionExpirationDate: expirationDate,
    };

    // 5. Save the email only if it hasn't already been saved
    if (!user.email && email) {
      updates.email = email;
      console.log("📧 Saving user email:", email);
    }

    await db.users.update(userId, updates);

    console.log("✅ Premium activated");

  } catch (error: any) {
    console.error("🔴 Causa exacta del REJECTED:", error);
    throw error;
  }
}