import { TABLE_NAMES } from "../db";

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




// checksum validation helper
export const validateBackupChecksum = async (
  backup: any
) => {
  const storedChecksum =
    backup?.metadata?.checksum;

  if (!storedChecksum) {
    throw new Error('Missing checksum');
  }

  // clone object
  const backupClone =
    structuredClone(backup);

  // remove checksum before hashing
  backupClone.metadata.checksum = '';

  const recalculated =
    await generateSHA256(
      JSON.stringify(backupClone)
    );

  if (recalculated !== storedChecksum) {
    throw new Error(
      'Backup checksum validation failed'
    );
  }
};




// Validate metadata
export const validateBackupMetadata = (
  backup: any
) => {
  const metadata = backup?.metadata;

  if (!metadata) {
    throw new Error('Missing metadata');
  }

  if (!metadata.backupFormatVersion) {
    throw new Error(
      'Unsupported backup format'
    );
  }

  if (!metadata.createdAt) {
    throw new Error(
      'Missing backup date'
    );
  }

  if (typeof metadata.totalRecords !== 'number') {
    throw new Error(
      'Invalid record count'
    );
  }
};




// Validate required tables
export const validateBackupTables = (
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



// Validate record counts
export const validateRecordCounts = (
  backup: any
) => {
  const expected =
    backup.metadata.recordCounts;

  for (const tableName of Object.keys(expected)) {
    const actual =
      backup.data?.[tableName]?.length ?? 0;

    if (actual !== expected[tableName]) {
      throw new Error(
        `Record count mismatch in ${tableName}`
      );
    }
  }
};