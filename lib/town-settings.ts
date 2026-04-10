import 'server-only';

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_TOWNS, getTownById, type Town } from '@/config/towns';
import { getFirestoreAdmin, isFirestoreConfigured } from '@/lib/firestore-admin';

type TownSettingRecord = {
  townId: string;
  enabled: boolean;
  updatedAt?: string;
};

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'town-settings.json');
const COLLECTION_NAME = 'townSettings';

function getDefaultTownMap(): Map<string, Town> {
  return new Map(DEFAULT_TOWNS.map((town) => [town.id, town]));
}

function mergeTownSettings(records: TownSettingRecord[]): Town[] {
  const overrides = new Map(records.map((record) => [record.townId, record.enabled]));

  return DEFAULT_TOWNS.map((town) => ({
    ...town,
    enabled: overrides.get(town.id) ?? town.enabled,
  }));
}

async function readFileStore(): Promise<TownSettingRecord[]> {
  try {
    const content = await readFile(DATA_FILE_PATH, 'utf8');
    const parsed = JSON.parse(content) as TownSettingRecord[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((record) => typeof record?.townId === 'string' && typeof record?.enabled === 'boolean');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeFileStore(records: TownSettingRecord[]): Promise<void> {
  await writeFile(DATA_FILE_PATH, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

async function getFirestoreTownSettings(): Promise<TownSettingRecord[]> {
  const snapshot = await getFirestoreAdmin().collection(COLLECTION_NAME).get();

  return snapshot.docs
    .map((document) => {
      const data = document.data() as Partial<TownSettingRecord>;
      if (typeof data.enabled !== 'boolean') {
        return null;
      }

      return {
        townId: document.id,
        enabled: data.enabled,
      };
    })
    .filter((record): record is TownSettingRecord => Boolean(record));
}

async function getTownSettingRecords(): Promise<TownSettingRecord[]> {
  if (!isFirestoreConfigured()) {
    return readFileStore();
  }

  try {
    return await getFirestoreTownSettings();
  } catch (error) {
    console.error('Falling back to local town settings after Firestore read failed.', error);
    return readFileStore();
  }
}

export async function getManagedTowns(): Promise<Town[]> {
  const records = await getTownSettingRecords();
  return mergeTownSettings(records);
}

export async function getEnabledTowns(): Promise<Town[]> {
  const towns = await getManagedTowns();
  return towns.filter((town) => town.enabled);
}

export async function getEnabledTownById(townId: string): Promise<Town | null> {
  const towns = await getManagedTowns();
  return towns.find((town) => town.id === townId && town.enabled) ?? null;
}

export async function isTownEnabled(townId: string): Promise<boolean> {
  return Boolean(await getEnabledTownById(townId));
}

export async function updateTownEnabled(townId: string, enabled: boolean): Promise<Town[]> {
  if (!getTownById(townId)) {
    throw new Error('Unsupported town.');
  }

  if (!isFirestoreConfigured()) {
    const defaultTownMap = getDefaultTownMap();
    const records = await readFileStore();
    const nextRecords = records.filter((record) => record.townId !== townId);
    const defaultTown = defaultTownMap.get(townId);

    if (!defaultTown) {
      throw new Error('Unsupported town.');
    }

    if (enabled !== defaultTown.enabled) {
      nextRecords.push({
        townId,
        enabled,
        updatedAt: new Date().toISOString(),
      });
    }

    await writeFileStore(nextRecords);
    return mergeTownSettings(nextRecords);
  }

  try {
    await getFirestoreAdmin().collection(COLLECTION_NAME).doc(townId).set(
      {
        enabled,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return getManagedTowns();
  } catch (error) {
    console.error('Falling back to local town settings after Firestore write failed.', error);
    const defaultTownMap = getDefaultTownMap();
    const records = await readFileStore();
    const nextRecords = records.filter((record) => record.townId !== townId);
    const defaultTown = defaultTownMap.get(townId);

    if (!defaultTown) {
      throw new Error('Unsupported town.');
    }

    if (enabled !== defaultTown.enabled) {
      nextRecords.push({
        townId,
        enabled,
        updatedAt: new Date().toISOString(),
      });
    }

    await writeFileStore(nextRecords);
    return mergeTownSettings(nextRecords);
  }
}