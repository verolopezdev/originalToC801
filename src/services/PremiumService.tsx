import { db } from "../db";


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
  
    // 1. Perform login first — Dexie Cloud acquires JWT tokens & user context
    await db.cloud.login();


  } catch (error: any) {
    console.error("🔴 Causa exacta del REJECTED:", error);
    // Unblock UI gracefully on error
    throw error;
  }
}

