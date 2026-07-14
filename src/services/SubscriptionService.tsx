import { db } from '../db';


export async function refreshSubscription() {
  const user = await db.users.get('1');

  if (!user) return;

  console.log(
    "%cSubscription plan:",
    "background: blue; color: white;",
    user.subscriptionPlan
  );

  const now = new Date();

  let isPremium = false;
  let expiration: string | null = null;

  switch (user.subscriptionPlan) {
    case "monthly": {
      isPremium = true;
      const date = new Date(now);
      date.setMonth(date.getMonth() + 1);
      expiration = date.toISOString();
      break;
    }

    case "quarterly": {
      isPremium = true;
      const date = new Date(now);
      date.setMonth(date.getMonth() + 3);
      expiration = date.toISOString();
      break;
    }

    case "yearly": {
      isPremium = true;
      const date = new Date(now);
      date.setFullYear(date.getFullYear() + 1);
      expiration = date.toISOString();
      break;
    }

    case "free":
    default: {
      isPremium = false;
      expiration = null;
      break;
    }
  }

  await db.users.update('1', {
    isPremium,
    subscriptionExpirationDate: expiration,
  });
}
/**
 * Have one place that translates RevenueCat → your app

For example:

function mapProductToPlan(productId: string): SubscriptionPlan {
    switch (productId) {
        case "premium_monthly":
            return "monthly";

        case "premium_3months":
            return "quarterly";

        case "premium_yearly":
            return "yearly";

        default:
            return "free";
    }
}

If you ever rename products in RevenueCat, you change one function.
 */