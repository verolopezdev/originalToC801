import { db } from '../db';
import { Preferences } from '@capacitor/preferences';


export async function saveAppMetadata(key: string, value: string) {

  await db.transaction('rw', db.appmetadata, async () => {
    const existing = await db.appmetadata
      .where('key')
      .equals(key)
      .first();

    if (existing) {
      await db.appmetadata.update(existing.id, { value });
      console.log("OOOO Record updated: ", key, " at ", new Date());
    } else {
      await db.appmetadata.add({
        id: crypto.randomUUID(),
        key,
        value,
      });
      console.log("OOOO New record added: ", key, " at ", new Date());
    }
  });
}


export async function getAppMetadata(key: string): Promise<string | undefined> {
  const item = await db.appmetadata.get(key);
  return item?.value;
}


export async function restoreAllSyncedPreferences() {
  const items = await db.appmetadata.toArray();

  for (const item of items) {
    if (
      item.key === 'installationId' ||
      item.key === 'createdAt'
    ) {
      continue;
    }

    await Preferences.set({
      key: item.key,
      value: item.value,
    });
  }
}