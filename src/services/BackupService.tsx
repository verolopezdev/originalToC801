import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import Dexie from 'dexie';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { db, setIsSeeding, getLiveRecordCount, TABLE_NAMES } from '../db';

export const CHANGE_COUNT_KEY = 'unsaved_change_count';
export const BACKUP_TIME_KEY = 'last_system_backup';

export interface BackupCounts {
  totalRecords: number;
  tableCounts: Record<string, number>;
  fileName: string;
  createdAt: number;
}

let isRestoringInProgress = false;


export interface ValidationResult {
  success: boolean;
  error?: string;
}



// Every time you add, update, or delete, increment the counter.
/**
 * INCREMENT CHANGE COUNT
 * This function implements a simple "auto-backup every 5 changes" mechanism and includes protection against multiple backups running at the same time.
 * This function should be called every time the database changes.
 */
/*let isBackupRunning = false;

export const incrementChangeCount1 = async () => {
  const { value } = await Preferences.get({ key: CHANGE_COUNT_KEY });

  const count = parseInt(value || '0') + 1;

  if (count >= 5) {
    await Preferences.set({
      key: CHANGE_COUNT_KEY,
      value: '0',
    });

    setTimeout(async () => {
      if (isBackupRunning) return;

      isBackupRunning = true;

      try {
        const fileName = await backupDatabase(db);

        console.log('Backup saved as:', fileName);
      } catch (err) {
        console.error(err);
      } finally {
        isBackupRunning = false;
      }
    }, 0);

  } else {
    await Preferences.set({
      key: CHANGE_COUNT_KEY,
      value: count.toString(),
    });
  }
};
*/


/**
 * Prevents multiple backups from running simultaneously.
 * A backup can take several seconds, so we only allow one at a time.
 */
let isBackupRunning = false;

/**
 * Set to true when a backup should run after the current one finishes.
 *
 * Example:
 * - Backup A is running
 * - User makes 5 more changes
 * - Backup B is requested
 * - Instead of starting immediately, we mark it as pending
 * - When Backup A finishes, Backup B starts automatically
 */
let backupPending = false;

/**
 * Executes a database backup.
 *
 * Safety features:
 * 1. Only one backup can run at a time.
 * 2. If another backup is requested while one is running,
 *    it will be queued via backupPending.
 */
const runBackup = async (): Promise<void> => {
  // A backup is already running.
  // Remember that another backup is needed later.
  if (isBackupRunning) {
    backupPending = true;
    return;
  }

  // Acquire backup lock.
  isBackupRunning = true;

  try {
    const fileName = await backupDatabase(db);

    console.log('Backup saved as:', fileName);
  } catch (err) {
    console.error('Backup failed:', err);
  } finally {
    // Always release the lock, even if the backup fails.
    isBackupRunning = false;

    /**
     * Changes may have accumulated while the backup was running.
     *
     * Example:
     * - Backup starts
     * - User makes another 5 changes
     * - backupPending becomes true
     *
     * When the current backup finishes, immediately run another one.
     */
    if (backupPending) {
      backupPending = false;

      // Schedule on next event loop tick to avoid recursion issues.
      setTimeout(() => {
        void runBackup();
      }, 0);
    }
  }
};

/**
 * Tracks database changes and triggers an automatic backup
 * every 5 tracked modifications.
 *
 * The count is stored in Capacitor Preferences so it survives
 * app restarts. This ensures that:
 *
 * Day 1: 2 changes
 * Day 2: 2 changes
 * Day 3: 1 change
 *
 * still results in a backup after the 5th total change.
 */
export const incrementChangeCount = async (): Promise<void> => {
  // Read current persisted change counter.
  const { value } = await Preferences.get({
    key: CHANGE_COUNT_KEY,
  });

  // Increment count. Default to 0 if key doesn't exist.
  const count = parseInt(value || '0', 10) + 1;

  /**
   * Backup threshold reached.
   *
   * We reset the counter BEFORE starting the backup so new
   * changes can continue being counted immediately.
   */
  if (count >= 5) {
    await Preferences.set({
      key: CHANGE_COUNT_KEY,
      value: '0',
    });

    /**
     * Schedule backup asynchronously.
     *
     * Using setTimeout prevents the database operation that
     * triggered this hook from waiting for the backup to finish.
     *
     * Without this, the UI could feel sluggish if backups
     * take several seconds.
     */
    setTimeout(() => {
      void runBackup();
    }, 0);
  } else {
    // Persist updated count for future app launches.
    await Preferences.set({
      key: CHANGE_COUNT_KEY,
      value: count.toString(),
    });
  }
};


/**
 * Creates a complete backup of the application's database and preferences.
 *
 * What gets backed up:
 * - All Dexie tables
 * - All Capacitor Preferences
 * - A SHA-256 checksum for integrity validation
 *
 * What happens after a successful backup:
 * - Backup file is written to disk
 * - Backup metadata is updated
 * - Mutation/change counter is reset
 * - Old backup files are pruned
 *
 * Returns:
 * - The generated backup file name
 */
export const backupDatabase = async (
  db: Dexie
): Promise<string> => {
  try {
    console.log('STEP 1: Get backup data from db...');
    /**
     * Single timestamp used throughout the entire backup process.
     *
     * Using one timestamp guarantees:
     * - filename matches metadata
     * - createdAt value is consistent everywhere
     * - easier debugging and recovery
     */
    const backupTimestamp = Date.now();

    /**
     * Backup filename.
     *
     * Example:
     * backup-1749471835000.json
     */
    const fileName = `backup-${backupTimestamp}.json`;

    /**
     * Container for all table contents.
     *
     * Example:
     * {
     *   expenses: [...],
     *   accounts: [...],
     *   categories: [...]
     * }
     */
    const backup: Record<string, any[]> = {};

    /**
     * Record counts are stored separately so that
     * restore validation can later verify that the
     * restored database contains exactly the same
     * number of records as the backup.
     */
    const tableCounts: Record<string, number> = {};

    /**
     * Total record count across all user-data tables.
     * Used as a quick integrity check after restore.
     */
    let totalRecords = 0;

    /**
     * Read all tables inside a single read transaction.
     *
     * Benefits:
     * - Consistent snapshot
     * - Prevents partial reads while data is changing
     * - Ensures all tables are captured from the same point in time
     */
    await db.transaction('r', db.tables, async () => {
      for (const table of db.tables) {
        const records = await table.toArray();

        /**
         * Store the table contents in the backup object.
         */
        backup[table.name] = records;

        /**
         * Metadata is intentionally excluded from
         * integrity counting because:
         *
         * - Metadata can change between backups
         * - Metadata is not user-generated data
         * - Restore validation should focus on actual user records
         */
        if (table.name !== 'metadata') {
          tableCounts[table.name] = records.length;
          totalRecords += records.length;
        }
      }
    });

    console.log('Backup counts:', {
      totalRecords,
      tableCounts,
    });

    console.log('STEP 2: Get preferences...');

    /**
     * Export all Capacitor Preferences.
     *
     * This ensures application settings can be restored
     * alongside database records.
     */
    const preferences = await getAllPreferences();

    console.log('STEP 3: Create json...');

    /**
     * Main backup payload.
     *
     * Checksum is temporarily empty because we must
     * calculate it from the contents first.
     */
    const backupObject = {
      databaseName: db.name,
      createdAt: backupTimestamp,
      version: db.verno,
    
      data: backup,
      preferences,
    
      checksum: '',
    };

    /**
     * Generate checksum from backup contents.
     *
     * Important:
     * The checksum field itself must NOT be included
     * in the checksum calculation, otherwise the hash
     * would change every time it is generated.
     */
    const checksum = await generateSHA256(
      JSON.stringify(
        buildChecksumPayload(backupObject)
      )
    );
    
    /**
     * Store checksum inside backup.
     *
     * During restore this checksum will be recomputed
     * and compared to detect:
     *
     * - file corruption
     * - incomplete writes
     * - accidental modification
     * - tampering
     */
    backupObject.checksum = checksum;

    /**
     * Convert final backup object into JSON
     * ready for disk storage.
     */
    const jsonBackup = JSON.stringify(
      backupObject
    );



    console.log('STEP 4: Write to file...');

    /**
     * Persist backup to the filesystem.
     *
     * recursive: true
     * automatically creates the backups folder
     * if it does not already exist.
     */
    await Filesystem.writeFile({
      path: `backups/${fileName}`,
      data: jsonBackup,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });


    /**
     * Only create/update backup metadata AFTER
     * the file has been successfully written.
     *
     * This prevents situations where metadata says
     * a backup exists but the file write failed.
     */
    const backupCounts: BackupCounts = {
      totalRecords,
      tableCounts,
      fileName,
      createdAt: backupTimestamp,
    };

    /**
     * Update backup-related metadata.
     *
     * Promise.all is safe here because these operations
     * are independent and can run in parallel.
     */
    await Promise.all([
      /**
       * Records when the latest successful
       * backup completed.
       */
      Preferences.set({
        key: BACKUP_TIME_KEY,
        value: backupTimestamp.toString(),
      }),

      /**
       * Reset mutation counter.
       *
       * Since we now have a fresh backup,
       * there are zero outstanding changes
       * that need backing up.
       */
      Preferences.set({
        key: CHANGE_COUNT_KEY,
        value: '0',
      }),

      /**
       * Save record counts used later
       * for restore verification.
       */
      Preferences.set({
        key: 'latestBackupCounts',
        value: JSON.stringify(backupCounts),
      }),
    ]);

    console.log('STEP 5: Prune old backups...');

    /**
     * Remove older backups according to
     * the application's retention policy.
     *
     * Helps control storage usage.
     */
    await pruneOldBackups();

    console.log('Backup success');

    return fileName;
  } catch (error: any) {
    /**
     * Log as much detail as possible.
     *
     * Backup failures are critical because they
     * affect disaster recovery, so verbose logging
     * is useful during debugging.
     */
    console.error('FULL BACKUP ERROR');
    console.error(error);
    console.error(JSON.stringify(error, null, 2));

    /**
     * Re-throw so callers can:
     * - show UI errors
     * - retry
     * - trigger fallback behavior
     */
    throw error;
  }
};



/**
 * Deletes old backup files and keeps only the 3 most recent backups.
 *
 * Backup files are expected to follow this naming convention:
 *   backup-<timestamp>.json
 *
 * Example:
 *   backup-1750012345678.json
 *
 * The timestamp embedded in the filename is used to determine
 * which backups are newer and which can be safely removed.
 */
export const pruneOldBackups = async () => {
  try {
    /**
     * Read the contents of the backups directory.
     *
     * This returns metadata for every file stored in:
     * Directory.Data/backups
     */
    const folder = await Filesystem.readdir({
      path: 'backups',
      directory: Directory.Data,
    });

    /**
     * Filter only valid backup files and sort them
     * from newest to oldest.
     *
     * Example result after sorting:
     * [
     *   backup-1750012345678.json, // newest
     *   backup-1750012000000.json,
     *   backup-1750011000000.json,
     *   backup-1750009000000.json  // oldest
     * ]
     */
    const backupFiles = folder.files
      .filter(file =>
        file.name.startsWith('backup-') &&
        file.name.endsWith('.json')
      )
      .sort((a, b) => {
        /**
         * Extract the timestamp from each filename.
         *
         * Example:
         *   backup-1750012345678.json
         *              ↓
         *      1750012345678
         */
        const aTime = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const bTime = parseInt(b.name.match(/\d+/)?.[0] || '0');

        /**
         * Descending sort:
         * Newest backups first.
         */
        return bTime - aTime;
      });

     /**
     * Keep only the first 3 backups.
     *
     * slice(3) returns everything after index 2,
     * which are the backups we want to delete.
     */
    const toDelete = backupFiles.slice(3);

    console.log(
      `Found ${backupFiles.length} backups. ` +
      `${toDelete.length} will be deleted.`
    );

    /**
     * Delete each old backup file.
     *
     * We await each deletion to ensure filesystem
     * operations complete before moving to the next file.
     */
    for (const file of toDelete) {
      await Filesystem.deleteFile({
        path: `backups/${file.name}`,
        directory: Directory.Data,
      });

      console.log(`Pruned old backup: ${file.name}`);
    }
    console.log('Backup pruning completed.');
  } catch (error) {
    /**
     * Failure here is not critical to app functionality.
     *
     * The worst case is that old backups remain on disk,
     * consuming some extra storage space.
     */
    console.error('Error pruning old backups:', error);
  }
};



/**
 * Reads every key/value pair stored in Capacitor Preferences
 * and returns them as a plain JavaScript object.
 *
 * Example return value:
 * {
 *   user: '{"id":"123","name":"John"}',
 *   theme: 'dark',
 *   selectedTripId: 'abc123'
 * }
 *
 * This is primarily used during backup creation so all
 * application settings can be included in the backup file.
 */
export const getAllPreferences = async () => {
  // Get a list of every key currently stored in Preferences.
  const { keys } = await Preferences.keys();

  // Object that will hold the final key/value pairs.
  const prefs: Record<string, string | null> = {};
  
  // Preferences API does not provide a "getAll" method,
  // so we must read each key individually.
  for (const key of keys) {
    const { value } = await Preferences.get({ key });

    // Store the value under its original key.
    // Values can be null if the key exists but has no value.
    prefs[key] = value;
  }

  // Return all preferences as a plain object.
  return prefs;
};




/**
 * Checks whether at least one backup file exists in the backups folder.
 *
 * Returns:
 * - true  -> one or more backup files were found
 * - false -> no backup files exist, or the folder itself doesn't exist
 */
const checkBackupsExist = async (): Promise<boolean> => {
  try {
    // Read all files inside the app's Data/backups directory.
    // If the folder does not exist, Capacitor will throw.
    const folder = await Filesystem.readdir({
      path: 'backups',
      directory: Directory.Data,
    });

    // Look for files that match our backup naming convention:
    // backup-<timestamp>.json
    //
    // Example:
    // backup-1717987200000.json
    const hasBackups = folder.files.some(file => 
      file.name.startsWith('backup-') && file.name.endsWith('.json')
    );

    // Return true as soon as at least one matching file is found.
    return hasBackups;
  } catch (error) {
    // readdir() throws when:
    // - the backups folder doesn't exist yet
    // - the folder cannot be accessed
    // - an unexpected filesystem error occurs
    //
    // For this use case, we simply treat any failure as
    // "no backups available" rather than crashing.
    return false;
  }
};



/**
 * Runs when the app starts.
 *
 * Responsibilities:
 * 1. Detect first install scenarios.
 * 2. Detect lost Capacitor Preferences.
 * 3. Detect IndexedDB recreation/wipe.
 * 4. Detect possible partial database corruption.
 * 5. Initialize version metadata if missing.
 *
 * The recovery strategy is based on comparing:
 * - Backup existence
 * - Installation ID stored in IndexedDB
 * - Installation ID stored in Capacitor Preferences
 */
export const handleStartupRecovery = async () => {
  // Give IndexedDB a brief moment to finish initialization.
  // This helps avoid race conditions during startup.
  await new Promise(res => setTimeout(res, 100));

  // Check if at least one backup file exists.
  const backupFileExists = await checkBackupsExist();

  /**
   * Read installation ID stored inside IndexedDB.
   *
   * This ID is created once and should survive app restarts.
   * If it changes unexpectedly, it usually means the database
   * was deleted and recreated.
   */
  const installationIdRecord = await db.metadata.get(
    "installationId"
  );

  const dbInstallationId =
    installationIdRecord?.value ?? null;

  /**
   * Read installation ID stored in Capacitor Preferences.
   *
   * Preferences are stored separately from IndexedDB.
   * Comparing both values helps determine which storage
   * was lost or recreated.
   */
  const { value: capacitorInstallationId } =
    await Preferences.get({
      key: "installationId",
    });

  console.log("DB installationId:", dbInstallationId);
  console.log(
    "Capacitor installationId:",
    capacitorInstallationId
  );

  /**
   * =====================================================
   * CASE 1: Fresh install
   * =====================================================
   *
   * Example:
   * backupFileExists = false
   * dbInstallationId = ABC
   * capacitorInstallationId = null
   *
   * No backup exists yet, so recovery is impossible and
   * unnecessary.
   *
   * If Preferences don't yet contain the installation ID,
   * initialize them from the database.
   */
  if (!backupFileExists) {
    if (!capacitorInstallationId && dbInstallationId) {
      await Preferences.set({
        key: "installationId",
        value: dbInstallationId,
      });

      console.log(
        "Initialized installationId in Capacitor Preferences."
      );
    }

    console.log(
      "No backup found, fresh install, skipping recovery."
    );

    return;
  }

  /**
   * =====================================================
   * CASE 2: Preferences were lost
   * =====================================================
   *
   * Example:
   * backupFileExists = true
   * dbInstallationId = ABC
   * capacitorInstallationId = null
   *
   * IndexedDB is still healthy because it contains the
   * original installation ID.
   *
   * Instead of restoring the whole database, simply rebuild
   * Preferences from the latest backup.
   */
  if (!capacitorInstallationId && dbInstallationId) {
    console.warn(
      "Preferences appear to be missing. Recovering preferences from backup."
    );
  
    await restorePreferencesOnly();
  
    return;
  }

  /**
   * =====================================================
   * CASE 3: IndexedDB was recreated
   * =====================================================
   *
   * Example:
   * dbInstallationId = XYZ
   * capacitorInstallationId = ABC
   *
   * CASE 4: installationId missing from metadata
   *
   * Example:
   * dbInstallationId = null
   * capacitorInstallationId = ABC
   *
   * These values should always match.
   *
   * If they differ, it strongly suggests IndexedDB was
   * deleted and recreated, so restore the latest backup.
   */
  if (dbInstallationId !== capacitorInstallationId) {
    console.warn(
      "Database appears to have been recreated. Starting recovery."
    );

    await restoreLatestBackup();
    return;
  }

  /**
   * =====================================================
   * CASE 5: Detect partial data loss
   * =====================================================
   *
   * Even when installation IDs match, corruption can still
   * occur if some records disappear unexpectedly.
   *
   * Compare current record counts against the latest backup.
   */
  const backupCounts = await getLatestBackupCounts();

  if (backupCounts) {
    const liveCounts = await getLiveRecordCount();

    console.log('Live counts:', liveCounts);
    console.log('Backup counts:', backupCounts);
    
    /**
     * Overall record count difference.
     * Mostly useful for diagnostics/logging.
     */
    const totalDiff = Math.abs(
      liveCounts.totalRecords -
      backupCounts.totalRecords
    );
    
    console.log('Total record difference:', totalDiff);

    let corruptionDetected = false;

    /**
     * Compare each table individually.
     *
     * A large discrepancy may indicate:
     * - Partial database corruption
     * - Failed migration
     * - Unexpected data deletion
     *
     * Small differences are tolerated because the backup
     * may not be perfectly up-to-date.
     */
    for (const tableName of Object.keys(
      backupCounts.tableCounts
    )) {
      const liveCount =
        liveCounts.tableCounts[tableName] ?? 0;

      const backupCount =
        backupCounts.tableCounts[tableName];

      const diff = Math.abs(
        liveCount - backupCount
      );

      /**
       * Threshold of 5 records:
       *
       * This prevents normal user activity occurring after
       * the last backup from triggering a false recovery.
       */
      if (diff > 5) {
        console.warn(
          `Possible data loss in ${tableName}. ` +
          `Live=${liveCount}, Backup=${backupCount}`
        );

        corruptionDetected = true;
        break;
      }
    }

    /**
     * Restore if corruption was detected.
     */
    if (corruptionDetected) {
      await restoreLatestBackup();
      return;
    }
  }

  /**
   * =====================================================
   * Version metadata initialization
   * =====================================================
   *
   * Store the version/build that originally created the
   * database.
   *
   * This can be useful later for:
   * - Migration debugging
   * - Upgrade diagnostics
   * - Support investigations
   */
  const versionRecord = await db.metadata.get(
    "createdWithVersion"
  );

  if (!versionRecord) {
    let version = import.meta.env.VITE_APP_VERSION;;
    let build = "web";
  
    // Native platforms provide actual version/build numbers.
    if (Capacitor.isNativePlatform()) {
      const appInfo = await App.getInfo();
      version = appInfo.version;
      build = appInfo.build;
    }
  
    await db.metadata.bulkPut([
      {
        key: "createdWithVersion",
        value: version,
      },
      {
        key: "createdWithBuild",
        value: build,
      },
    ]);
  }

  /**
   * If execution reaches this point:
   * - Installation IDs match
   * - No corruption was detected
   * - Metadata is initialized
   *
   * Database is considered healthy.
   */
  console.log("Database integrity check passed.");
};




export const restoreLatestBackup = async (
  selectedBackupData?: any
): Promise<boolean> => {
  // Prevent concurrent restores.
  // A second restore while one is already running could corrupt state.
  if (isRestoringInProgress) {
    console.warn("Restore already in progress.");
    return false;
  }

  console.log("--- Starting restoreLatestBackup ---");

  try {
    // Disable backup change tracking while restoring.
    setIsSeeding(true);
    isRestoringInProgress = true;
    let restoredFileName: string | null = null;
    let masterBackup: any;

    // ============================================================
    // 1. ACQUIRE BACKUP DATA
    // ============================================================

    if (selectedBackupData) {
      // User selected a specific backup file.
      masterBackup = selectedBackupData;
    } else {
      // Load the most recent automatic backup.
      let folder;

      try {
        folder = await Filesystem.readdir({
          path: "backups",
          directory: Directory.Data,
        });
      } catch (dirError: any) {
        // No backups folder means nothing to restore.
        if (
          dirError.message?.includes("does not exist") ||
          dirError.code === "ENOENT"
        ) {
          console.log("Backups folder missing.");
          return false;
        }

        throw dirError;
      }

      const backupFiles = folder.files
        .filter(
          file =>
            file.name.startsWith("backup-") &&
            file.name.endsWith(".json")
        )
        .sort((a, b) => b.name.localeCompare(a.name));

      if (backupFiles.length === 0) {
        console.log("No backup files found.");
        return false;
      }

      restoredFileName = backupFiles[0].name;

      const fileResult = await Filesystem.readFile({
        path: `backups/${restoredFileName}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      const rawData =
        typeof fileResult.data === "string"
          ? fileResult.data
          : "";

      if (!rawData) {
        throw new Error("Backup file empty.");
      }

      masterBackup = JSON.parse(rawData);
    }

    // ============================================================
    // 2. VALIDATE BACKUP STRUCTURE
    // ============================================================

    /*
      if (!masterBackup?.data) {
        throw new Error("Invalid backup structure.");
      }

      console.log("Validating backup tables...");

      validateBackupStructure(masterBackup);

      validateBackupTables(masterBackup);

      await validateBackupChecksum(
        masterBackup
      );
    */

      if (
        !validateBackupStructure(
          masterBackup
        )
      ) {
        throw new Error(
          'Wrong backup structure.'
        );
      }
      
      if (
        !validateBackupTables(
          masterBackup
        )
      ) {
        throw new Error(
          'Missing backup data.'
        );
      }
      
      const checksumValid =
        await validateBackupChecksum(
          masterBackup
        );
      
      if (!checksumValid) {
        throw new Error(
          'The backup file appears to have been modified or corrupted.'
        );
      }


    // ============================================================
    // 3. RESTORE DATABASE
    // ============================================================

    console.log("Restoring database...");

    await db.transaction("rw", db.tables, async () => {
      // Clear all existing records first.
      for (const table of db.tables) {
        await table.clear();
      }

      // Restore each table from backup.
      for (const table of db.tables) {
        const tableData = masterBackup.data?.[table.name];

        if (
          Array.isArray(tableData) &&
          tableData.length > 0
        ) {
          console.log(
            `Restoring ${table.name}: ${tableData.length} rows`
          );

          await table.bulkPut(tableData);
        }
      }
    });

    // VERIFY RESTORE

    const liveCounts = await getLiveRecordCount();

    let expectedTotal = 0;

    for (const tableName of TABLE_NAMES) {
      expectedTotal +=
        masterBackup.data?.[tableName]?.length ?? 0;
    }

    if (
      liveCounts.totalRecords !== expectedTotal
    ) {
      throw new Error(
        `Restore verification failed. ` +
        `Expected ${expectedTotal} records, ` +
        `found ${liveCounts.totalRecords}.`
      );
    }

    // ============================================================
    // 4. RESTORE PREFERENCES
    // ============================================================

    if (masterBackup.preferences) {
      console.log("Restoring preferences...");
      await restorePreferences(masterBackup.preferences);
    }

    // Reset change counter after a successful restore.
    await Preferences.set({
      key: CHANGE_COUNT_KEY,
      value: "0",
    });

    // ============================================================
    // 5. UPDATE BACKUP METADATA
    // ============================================================

    const backupCounts: BackupCounts = {
      totalRecords: liveCounts.totalRecords,
      tableCounts: liveCounts.tableCounts,
      fileName: restoredFileName ?? "unknown",
      createdAt: Date.now(),
    };

    await Promise.all([
      Preferences.set({
        key: CHANGE_COUNT_KEY,
        value: "0",
      }),

      Preferences.set({
        key: "latestBackupCounts",
        value: JSON.stringify(backupCounts),
      }),
    ]);


    // ============================================================
    // 6. RELOAD APPLICATION
    // ============================================================

    console.log(
      "Restore complete. Reloading application state..."
    );

    setTimeout(() => {
      window.location.reload();
    }, 150);

    return true;
  } catch (error: any) {
    console.error("Critical restore error:", error);
  
    if (error instanceof DOMException) {
      console.error(
        `DOMException [${error.name}]: ${error.message}`
      );
    }
  
    throw error;
  } finally {
    setIsSeeding(false);
    isRestoringInProgress = false;
  }
};




const restorePreferences = async (
  preferences: Record<string, string | null>
) => {
  for (const [key, value] of Object.entries(preferences)) {
    if (value === null) {
      await Preferences.remove({ key });
    } else {
      await Preferences.set({
        key,
        value,
      });
    }
  }
};




export const getLatestBackupCounts = async (): Promise<BackupCounts | null> => {
  try {
    const { value } = await Preferences.get({
      key: 'latestBackupCounts',
    });

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value);

    if (
      typeof parsed.totalRecords !== 'number' ||
      typeof parsed.fileName !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }

    return parsed as BackupCounts;
  } catch (error) {
    console.error(
      'Failed to read latest backup counts:',
      error
    );

    return null;
  }
};




const restorePreferencesOnly = async () => {
  const backupTimestamp = Date.now();

  const folder = await Filesystem.readdir({
    path: "backups",
    directory: Directory.Data,
  });

  const backupFiles = folder.files
    .filter(
      file =>
        file.name.startsWith("backup-") &&
        file.name.endsWith(".json")
    )
    .sort((a, b) => b.name.localeCompare(a.name));

  if (backupFiles.length === 0) {
    return false;
  }

  const fileResult = await Filesystem.readFile({
    path: `backups/${backupFiles[0].name}`,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });

  const backup = JSON.parse(fileResult.data as string);

  validateBackupStructure(backup);
  validateBackupTables(backup);
  await validateBackupChecksum(backup);

  if (backup.preferences) {
    await restorePreferences(
      backup.preferences
    );

    const liveCounts = await getLiveRecordCount();

    const backupCounts: BackupCounts = {
      totalRecords: liveCounts.totalRecords,
      tableCounts: liveCounts.tableCounts,
      fileName: backupFiles[0].name,
      createdAt: Date.now(),
    };

    await Promise.all([
      Preferences.set({
        key: BACKUP_TIME_KEY,
        value: backupTimestamp.toString(),
      }),

      Preferences.set({
        key: CHANGE_COUNT_KEY,
        value: '0',
      }),

      Preferences.set({
        key: 'latestBackupCounts',
        value: JSON.stringify(backupCounts),
      }),
    ]);
  }

  console.log(
    "Preferences restored from backup. Reloading app..."
  );

  window.location.reload();

  return true;
};




export const buildChecksumPayload = (
  backup: any
) => ({
  databaseName: backup.databaseName,
  createdAt: backup.createdAt,
  version: backup.version,
  data: backup.data,
  preferences: backup.preferences,
  checksum: '',
});




export const generateSHA256 = async (
  text: string
): Promise<string> => {
  const encoder = new TextEncoder();

  const data = encoder.encode(text);

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    data
  );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer)
  );

  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};




export const validateBackupChecksum1 =
  async (backup: any) => {

    if (
      typeof backup.checksum !== 'string' ||
      !backup.checksum
    ) {
      throw new Error(
        'Backup checksum missing'
      );
    }

    const recalculated =
      await generateSHA256(
        JSON.stringify(
          buildChecksumPayload(backup)
        )
      );

    if (
      recalculated !== backup.checksum
    ) {
      throw new Error(
        'Backup checksum validation failed'
      );
    }
  };

  export const validateBackupChecksum =
  async (
    backup: any
  ): Promise<boolean> => {

    try {

      if (
        typeof backup.checksum !== 'string' ||
        !backup.checksum
      ) {
        return false;
      }

      const recalculated =
        await generateSHA256(
          JSON.stringify(
            buildChecksumPayload(backup)
          )
        );

      return (
        recalculated ===
        backup.checksum
      );

    } catch (error) {

      console.error(
        'Checksum validation failed:',
        error
      );

      return false;
    }
  };




  export const validateBackupStructure1 = (
    backup: any
  ) => {
    if (!backup) {
      throw new Error('Backup is empty');
    }
  
    if (typeof backup.databaseName !== 'string') {
      throw new Error('Missing database name');
    }
  
    if (typeof backup.createdAt !== 'number') {
      throw new Error('Missing backup timestamp');
    }
  
    if (typeof backup.version !== 'number') {
      throw new Error('Missing database version');
    }
  
    if (
      !backup.data ||
      typeof backup.data !== 'object'
    ) {
      throw new Error('Missing backup data');
    }
  };

  export const validateBackupStructure = (
    backup: any
  ): boolean => {
    try {
      if (!backup) return false;
  
      if (typeof backup.databaseName !== 'string') {
        return false;
      }
  
      if (typeof backup.createdAt !== 'number') {
        return false;
      }
  
      if (typeof backup.version !== 'number') {
        return false;
      }
  
      if (
        !backup.data ||
        typeof backup.data !== 'object'
      ) {
        return false;
      }
  
      return true;
  
    } catch (error) {
      console.error(
        'Backup structure validation failed:',
        error
      );
  
      return false;
    }
  };


  // Validate required tables
  export const validateBackupTables1 = (
    backup: any
  ) => {
    for (const table of TABLE_NAMES) {
      if (!(table in backup.data)) {
        throw new Error(
          `Missing table: ${table}`
        );
      }
  
      if (!Array.isArray(backup.data[table])) {
        throw new Error(
          `Invalid table format: ${table}`
        );
      }
    }
  };
  

  export const validateBackupTables = (
    backup: any
  ): boolean => {
    try {
      for (const table of TABLE_NAMES) {
  
        if (!(table in backup.data)) {
          return false;
        }
  
        if (
          !Array.isArray(
            backup.data[table]
          )
        ) {
          return false;
        }
      }
  
      return true;
  
    } catch (error) {
      console.error(
        'Backup table validation failed:',
        error
      );
  
      return false;
    }
  };