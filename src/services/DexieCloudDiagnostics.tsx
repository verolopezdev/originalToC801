import { db } from "../db";

export const diagnoseDexieCloud = async () => {
  console.log("========== DEXIE CLOUD DIAGNOSTICS ==========");

  console.log("REALMS:", await db.realms.toArray());
  console.log("MEMBERS:", await db.members.toArray());
  console.log("ROLES:", await db.roles.toArray());

  console.log("ACCOUNTS:", await db.accounts.toArray());

  console.log("USERS:", await db.users.toArray());

  console.log("========== END DIAGNOSTICS ==========");
};