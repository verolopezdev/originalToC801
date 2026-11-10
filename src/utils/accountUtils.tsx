// accountUtils.ts
import { db } from '../db'; // Import your global db instance

interface User {
  owner?: string;
  userId?: string;
}

export async function fetchAndSortAccounts(user: User) {
  const allAccounts = await db.accounts.toArray();

  // Guard against missing user identifiers
  if (!user.owner || !user.userId) {
    return { availableAccounts: allAccounts, notAvailableAccounts: [] };
  }

  const preferences = await db.accountPreferences
    .where('userId')
    .equals(user.userId)
    .toArray();


  // Create a lookup map for fast performance: { accountId: sortOrder }
  const sortMap = new Map(preferences.map(p => [p.accountId, p.sortOrder]));

  const available: any[] = [];
  const notAvailable: any[] = [];

  // Categorize accounts according to requirements 1, 2, and 4
  allAccounts.forEach(account => {
    const isCurrentOwner = account.owner === user.owner;
    const isSharedByOther = account.owner !== user.owner && Boolean(account.sharedAccount);

    if (isCurrentOwner || isSharedByOther) {
      available.push(account);
    } else {
      notAvailable.push(account);
    }
  });

  // Sort available accounts using accountPreferences with stable fallbacks
  available.sort((a, b) => {
    const orderA = sortMap.get(a.accountId);
    const orderB = sortMap.get(b.accountId);

    if (orderA !== undefined && orderB !== undefined) {
      if (orderA !== orderB) {
        return orderA - orderB;
      }
    }

    if (orderA !== undefined && orderB === undefined) return -1;
    if (orderA === undefined && orderB !== undefined) return 1;

    const aIsOwner = a.owner === user.owner ? 1 : 2;
    const bIsOwner = b.owner === user.owner ? 1 : 2;
    if (aIsOwner !== bIsOwner) {
      return aIsOwner - bIsOwner;
    }

    return (a.accountId || '').localeCompare(b.accountId || '');
  });

  notAvailable.sort((a, b) => (a.accountId || '').localeCompare(b.accountId || ''));

  return { availableAccounts: available, notAvailableAccounts: notAvailable };
}


export async function fetchAvailableAccounts(user: User) {
  const allAccounts = await db.accounts.toArray();

  // Guard against missing user identifiers
  if (!user.owner || !user.userId) {
    return allAccounts.filter(account => account.activeAccount !== false);
  }

  const preferences = await db.accountPreferences
    .where('userId')
    .equals(user.userId)
    .toArray();

  // Create a lookup map for fast performance: { accountId: sortOrder }
  const sortMap = new Map(preferences.map(p => [p.accountId, p.sortOrder]));

  const available: any[] = [];

  // Categorize accounts ensuring they are active own accounts or active shared accounts
  allAccounts.forEach(account => {
    const isActive = account.activeAccount !== false;
    const isCurrentOwner = account.owner === user.owner;
    const isSharedByOther = account.owner !== user.owner && Boolean(account.sharedAccount);

    if (isActive && (isCurrentOwner || isSharedByOther)) {
      available.push(account);
    }
  });

  // Sort available accounts using accountPreferences with stable fallbacks
  available.sort((a, b) => {
    const orderA = sortMap.get(a.accountId);
    const orderB = sortMap.get(b.accountId);

    if (orderA !== undefined && orderB !== undefined) {
      if (orderA !== orderB) {
        return orderA - orderB;
      }
    }

    if (orderA !== undefined && orderB === undefined) return -1;
    if (orderA === undefined && orderB !== undefined) return 1;

    const aIsOwner = a.owner === user.owner ? 1 : 2;
    const bIsOwner = b.owner === user.owner ? 1 : 2;
    if (aIsOwner !== bIsOwner) {
      return aIsOwner - bIsOwner;
    }

    return (a.accountId || '').localeCompare(b.accountId || '');
  });

  return available;
}