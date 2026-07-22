import { db, enableDexieCloud } from "../db";

export async function activatePremium(
  userId: string,
  plan: "monthly" | "yearly",
  expirationDate: string
) {
  await db.users.update(userId, {
    isPremium: true,
    subscriptionPlan: plan,
    subscriptionExpirationDate: expirationDate,
  });

  enableDexieCloud();

  await db.cloud.login();
  await db.cloud.sync();
}