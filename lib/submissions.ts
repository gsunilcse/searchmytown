import 'server-only';

import { readFile, writeFile } from 'fs/promises';
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import path from 'path';
import { getModuleDefinition, isHelperCategory, MODULE_KEYS, type DirectoryModuleKey, type HelperCategory } from '@/config/modules';
import { getTownById } from '@/config/towns';
import { getFirestoreAdmin, isFirestoreConfigured } from '@/lib/firestore-admin';
import { isTownEnabled } from '@/lib/town-settings';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type ListingRecord = {
  id: string;
  moduleKey: DirectoryModuleKey;
  townId: string;
  townName: string;
  status: SubmissionStatus;
  approved: boolean;
  title: string;
  summary: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  helperCategory?: HelperCategory;
  helperLocality: string;
  phoneClickCount: number;
  lastPhoneClickAt: string | null;
  availability: Record<string, 'available' | 'booked'> | null;
  submittedByEmail: string;
  submittedByName: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  lastRenewedAt: string | null;
  moderationNote: string;
};

export type ListingInput = {
  moduleKey: DirectoryModuleKey;
  townId: string;
  title: string;
  summary: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  helperCategory?: string;
  helperLocality?: string;
  submittedByEmail: string;
  submittedByName: string;
};

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'town-submissions.json');
const DEFAULT_HELPER_VALIDITY_DAYS = 30;
const DEFAULT_LISTING_VALIDITY_DAYS = 90;

function canUseLocalMutableFallback(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function assertWritablePersistentStore(action: string): void {
  if (!canUseLocalMutableFallback()) {
    throw new Error(`${action} requires Firestore in production. Configure valid FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIRESTORE_DATABASE_ID values for the deployed app.`);
  }
}

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return new Date().toISOString();
}

function addDaysToIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function getListingExpiryState(record: ListingRecord, nowIso = new Date().toISOString()): {
  expired: boolean;
  expiresAt: string | null;
} {
  if (record.moduleKey !== 'helpers' || record.status !== 'approved') {
    return { expired: false, expiresAt: record.validUntil };
  }

  if (!record.validUntil) {
    return { expired: true, expiresAt: null };
  }

  return {
    expired: new Date(record.validUntil).getTime() <= new Date(nowIso).getTime(),
    expiresAt: record.validUntil,
  };
}

function normalizeRecord(id: string, raw: Partial<ListingRecord>): ListingRecord {
  const status = raw.status ?? 'pending';
  const approved = typeof raw.approved === 'boolean' ? raw.approved : status === 'approved';

  return {
    id,
    moduleKey: raw.moduleKey!,
    townId: raw.townId!,
    townName: raw.townName!,
    status,
    approved,
    title: raw.title ?? '',
    summary: raw.summary ?? '',
    description: raw.description ?? '',
    contactName: raw.contactName ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    address: raw.address ?? '',
    website: raw.website ?? '',
    helperCategory: raw.helperCategory,
    helperLocality: raw.helperLocality ?? '',
    phoneClickCount: typeof raw.phoneClickCount === 'number' ? raw.phoneClickCount : 0,
    lastPhoneClickAt: raw.lastPhoneClickAt ? toIsoString(raw.lastPhoneClickAt) : null,
    availability: typeof raw.availability === 'object' && raw.availability !== null ? raw.availability : null,
    submittedByEmail: raw.submittedByEmail?.trim().toLowerCase() ?? '',
    submittedByName: raw.submittedByName ?? '',
    submittedAt: toIsoString(raw.submittedAt),
    updatedAt: toIsoString(raw.updatedAt),
    reviewedAt: raw.reviewedAt ? toIsoString(raw.reviewedAt) : null,
    validFrom: raw.validFrom ? toIsoString(raw.validFrom) : null,
    validUntil: raw.validUntil ? toIsoString(raw.validUntil) : null,
    lastRenewedAt: raw.lastRenewedAt ? toIsoString(raw.lastRenewedAt) : null,
    moderationNote: raw.moderationNote ?? '',
  };
}

function normalizeFirestoreDocument(document: QueryDocumentSnapshot<DocumentData>): ListingRecord {
  const data = document.data() as Partial<ListingRecord>;
  return normalizeRecord(document.id, data);
}

function getCollectionName(moduleKey: DirectoryModuleKey): string {
  const moduleDefinition = getModuleDefinition(moduleKey);
  if (!moduleDefinition) {
    throw new Error('Unsupported module.');
  }

  return moduleDefinition.collectionName;
}

async function validateInput(input: ListingInput) {
  const town = getTownById(input.townId);
  if (!town) {
    throw new Error('Unsupported town.');
  }

  if (!(await isTownEnabled(input.townId))) {
    throw new Error('That town is not enabled for public submissions.');
  }

  const moduleDefinition = getModuleDefinition(input.moduleKey);
  if (!moduleDefinition) {
    throw new Error('Unsupported module.');
  }

  if (!input.title.trim() || !input.summary.trim() || !input.contactName.trim()) {
    throw new Error('Title, summary, and contact name are required.');
  }

  if (!input.phone.trim() && !input.email.trim()) {
    throw new Error('Provide at least a phone number or email address.');
  }

  if (!input.submittedByEmail.trim()) {
    throw new Error('A signed-in publisher account is required.');
  }

  if (input.moduleKey === 'helpers') {
    if (!input.helperCategory || !isHelperCategory(input.helperCategory)) {
      throw new Error('Select a valid helper category.');
    }
  }

  return town;
}

async function readFileStore(): Promise<ListingRecord[]> {
  try {
    const content = await readFile(DATA_FILE_PATH, 'utf8');
    const parsed = JSON.parse(content) as Partial<ListingRecord>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => normalizeRecord(item.id ?? `local-${index + 1}`, item))
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeFileStore(items: ListingRecord[]): Promise<void> {
  await writeFile(DATA_FILE_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

async function getFirestoreListings(): Promise<ListingRecord[]> {
  const database = getFirestoreAdmin();
  const snapshots = await Promise.all(
    MODULE_KEYS.map((moduleKey) => database.collection(getCollectionName(moduleKey)).get())
  );

  return snapshots
    .flatMap((snapshot) => snapshot.docs.map(normalizeFirestoreDocument))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

async function getFirestoreApprovedListingsByTown(
  townId: string,
  moduleKey: DirectoryModuleKey
): Promise<ListingRecord[]> {
  const snapshot = await getFirestoreAdmin()
    .collection(getCollectionName(moduleKey))
    .where('townId', '==', townId)
    .get();

  return snapshot.docs
    .map(normalizeFirestoreDocument)
    .filter((item) => {
      if (!item.approved) {
        return false;
      }

      if (item.moduleKey !== 'helpers') {
        return true;
      }

      return !getListingExpiryState(item).expired;
    })
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

async function getListingsWithFallback(): Promise<ListingRecord[]> {
  if (!isFirestoreConfigured()) {
    return readFileStore();
  }

  try {
    return await getFirestoreListings();
  } catch (error) {
    console.error('Falling back to local submission store after Firestore read failed.', error);
    return readFileStore();
  }
}

export async function getAllListings(): Promise<ListingRecord[]> {
  return getListingsWithFallback();
}

export async function getApprovedListings(townId: string, moduleKey: DirectoryModuleKey): Promise<ListingRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      return await getFirestoreApprovedListingsByTown(townId, moduleKey);
    } catch (error) {
      console.error('Falling back to full submission read after Firestore town query failed.', error);
    }
  }

  const allItems = await getListingsWithFallback();

  return allItems
    .filter((item) => {
      if (!(item.townId === townId && item.moduleKey === moduleKey && item.approved)) {
        return false;
      }

      if (item.moduleKey !== 'helpers') {
        return true;
      }

      return !getListingExpiryState(item).expired;
    })
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

export async function getListingsBySubmitter(email: string): Promise<ListingRecord[]> {
  const normalizedEmail = email.trim().toLowerCase();
  const allItems = await getListingsWithFallback();

  return allItems.filter(
    (item) =>
      item.submittedByEmail === normalizedEmail ||
      (!item.submittedByEmail && item.email.trim().toLowerCase() === normalizedEmail)
  );
}

export async function getListingById(moduleKey: DirectoryModuleKey, id: string): Promise<ListingRecord | null> {
  if (isFirestoreConfigured()) {
    try {
      const snapshot = await getFirestoreAdmin().collection(getCollectionName(moduleKey)).doc(id).get();
      if (!snapshot.exists) {
        return null;
      }

      return normalizeRecord(snapshot.id, snapshot.data() as Partial<ListingRecord>);
    } catch (error) {
      console.error('Falling back to full submission read after Firestore direct lookup failed.', error);
    }
  }

  const items = await getListingsWithFallback();
  return items.find((item) => item.id === id && item.moduleKey === moduleKey) ?? null;
}

export async function createListing(input: ListingInput): Promise<ListingRecord> {
  const town = await validateInput(input);
  const now = new Date().toISOString();
  const normalizedSubmittedByEmail = input.submittedByEmail.trim().toLowerCase();
  const shouldUpsertMovieListing = input.moduleKey === 'movies';
  const record: ListingRecord = {
    id: crypto.randomUUID(),
    moduleKey: input.moduleKey,
    townId: input.townId,
    townName: town.name,
    status: 'pending',
    approved: false,
    title: input.title.trim(),
    summary: input.summary.trim(),
    description: input.description.trim(),
    contactName: input.contactName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    website: input.website.trim(),
    helperCategory: input.moduleKey === 'helpers' && input.helperCategory && isHelperCategory(input.helperCategory)
      ? input.helperCategory
      : undefined,
    helperLocality: input.moduleKey === 'helpers' ? (input.helperLocality ?? '').trim() : '',
    phoneClickCount: 0,
    lastPhoneClickAt: null,
    availability: null,
    submittedByEmail: normalizedSubmittedByEmail,
    submittedByName: input.submittedByName.trim(),
    submittedAt: now,
    updatedAt: now,
    reviewedAt: null,
    validFrom: null,
    validUntil: null,
    lastRenewedAt: null,
    moderationNote: '',
  };

  const collectionName = getCollectionName(record.moduleKey);

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Creating listings');
    const items = await readFileStore();

    if (shouldUpsertMovieListing) {
      const matchingItems = items.filter(
        (item) =>
          item.moduleKey === 'movies' &&
          item.townId === input.townId &&
          item.submittedByEmail === normalizedSubmittedByEmail
      );

      if (matchingItems.length > 0) {
        const existingRecord = matchingItems[0]!;
        const updatedRecord: ListingRecord = {
          ...existingRecord,
          townName: town.name,
          title: record.title,
          summary: record.summary,
          description: record.description,
          contactName: record.contactName,
          phone: record.phone,
          email: record.email,
          address: record.address,
          website: record.website,
          helperCategory: record.helperCategory,
          helperLocality: record.helperLocality,
          phoneClickCount: 0,
          lastPhoneClickAt: null,
          submittedByName: record.submittedByName,
          status: 'pending',
          approved: false,
          reviewedAt: null,
          validFrom: null,
          validUntil: null,
          lastRenewedAt: null,
          moderationNote: '',
          updatedAt: now,
          submittedAt: now,
        };

        const dedupedItems = items.filter(
          (item) =>
            !(
              item.moduleKey === 'movies' &&
              item.townId === input.townId &&
              item.submittedByEmail === normalizedSubmittedByEmail
            )
        );

        dedupedItems.unshift(updatedRecord);
        await writeFileStore(dedupedItems);
        return updatedRecord;
      }
    }

    items.unshift(record);
    await writeFileStore(items);
    return record;
  }

  try {
    const collectionReference = getFirestoreAdmin().collection(collectionName);

    if (shouldUpsertMovieListing) {
      const snapshot = await collectionReference
        .where('townId', '==', input.townId)
        .where('submittedByEmail', '==', normalizedSubmittedByEmail)
        .get();

      const primaryDocument = snapshot.docs[0] ?? null;
      const duplicateDocuments = snapshot.docs.slice(1);

      if (duplicateDocuments.length > 0) {
        await Promise.all(duplicateDocuments.map((document) => document.ref.delete()));
      }

      if (primaryDocument) {
        const upsertPayload: Record<string, unknown> = {
          ...record,
          id: primaryDocument.id,
          status: 'pending',
          approved: false,
          moderationNote: '',
          reviewedAt: null,
          submittedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (upsertPayload.helperCategory === undefined) delete upsertPayload.helperCategory;
        await primaryDocument.ref.set(upsertPayload, { merge: true });

        const updatedDocument = await primaryDocument.ref.get();
        if (updatedDocument.exists) {
          return normalizeRecord(updatedDocument.id, updatedDocument.data() as Partial<ListingRecord>);
        }
      }
    }

    const firestorePayload: Record<string, unknown> = {
      ...record,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
    };
    if (firestorePayload.helperCategory === undefined) delete firestorePayload.helperCategory;
    await collectionReference.doc(record.id).set(firestorePayload);

    const savedDocument = await collectionReference.doc(record.id).get();
    if (!savedDocument.exists) {
      return record;
    }

    return normalizeRecord(savedDocument.id, savedDocument.data() as Partial<ListingRecord>);
  } catch (error) {
    console.error('Firestore write failed while creating listing.', error);
    throw new Error(
      error instanceof Error
        ? `Unable to save submission to Firestore: ${error.message}`
        : 'Unable to save submission to Firestore.'
    );
  }
}

export async function updateListingStatus(
  moduleKey: DirectoryModuleKey,
  id: string,
  status: Exclude<SubmissionStatus, 'pending'>,
  moderationNote: string
): Promise<ListingRecord> {
  const now = new Date().toISOString();
  const isHelperModule = moduleKey === 'helpers';
  const validityDays = isHelperModule ? DEFAULT_HELPER_VALIDITY_DAYS : DEFAULT_LISTING_VALIDITY_DAYS;

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Updating moderation status');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === moduleKey);

    if (index === -1) {
      throw new Error('Submission not found.');
    }

    const current = items[index]!;
    const shouldAttachValidity = status === 'approved';

    const updated: ListingRecord = {
      ...current,
      status,
      approved: status === 'approved',
      moderationNote: moderationNote.trim(),
      reviewedAt: now,
      updatedAt: now,
      validFrom: shouldAttachValidity ? now : current.validFrom,
      validUntil: shouldAttachValidity ? addDaysToIso(now, validityDays) : current.validUntil,
      lastRenewedAt: shouldAttachValidity ? now : current.lastRenewedAt,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(getCollectionName(moduleKey)).doc(id);
    const updatePayload: Record<string, unknown> = {
      status,
      approved: status === 'approved',
      moderationNote: moderationNote.trim(),
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status === 'approved') {
      updatePayload.validFrom = now;
      updatePayload.validUntil = addDaysToIso(now, validityDays);
      updatePayload.lastRenewedAt = now;
    }

    await documentReference.update(updatePayload);

    const snapshot = await documentReference.get();
    if (!snapshot.exists) {
      throw new Error('Submission not found.');
    }

    return normalizeRecord(snapshot.id, snapshot.data() as Partial<ListingRecord>);
  } catch (error) {
    console.error('Falling back to local submission store after Firestore moderation update failed.', error);
    assertWritablePersistentStore('Updating moderation status');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === moduleKey);

    if (index === -1) {
      throw new Error('Submission not found.');
    }

    const current = items[index]!;
    const shouldAttachValidity = status === 'approved';

    const updated: ListingRecord = {
      ...current,
      status,
      approved: status === 'approved',
      moderationNote: moderationNote.trim(),
      reviewedAt: now,
      updatedAt: now,
      validFrom: shouldAttachValidity ? now : current.validFrom,
      validUntil: shouldAttachValidity ? addDaysToIso(now, validityDays) : current.validUntil,
      lastRenewedAt: shouldAttachValidity ? now : current.lastRenewedAt,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }
}

export async function renewListingValidity(
  moduleKey: DirectoryModuleKey,
  id: string,
  durationDays: number
): Promise<ListingRecord> {
  const days = Number.isInteger(durationDays) ? durationDays : 0;
  if (days <= 0 || days > 365) {
    throw new Error('Renewal duration must be between 1 and 365 days.');
  }

  const now = new Date().toISOString();
  const validUntil = addDaysToIso(now, days);

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Renewing listing validity');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === moduleKey);

    if (index === -1) {
      throw new Error('Listing not found.');
    }

    const current = items[index]!;
    if (current.status !== 'approved') {
      throw new Error('Only approved listings can be renewed.');
    }

    const updated: ListingRecord = {
      ...current,
      validFrom: now,
      validUntil,
      lastRenewedAt: now,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(getCollectionName(moduleKey)).doc(id);
    const existing = await documentReference.get();

    if (!existing.exists) {
      throw new Error('Listing not found.');
    }

    const current = normalizeRecord(existing.id, existing.data() as Partial<ListingRecord>);
    if (current.status !== 'approved') {
      throw new Error('Only approved listings can be renewed.');
    }

    await documentReference.update({
      validFrom: now,
      validUntil,
      lastRenewedAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await documentReference.get();
    if (!snapshot.exists) {
      throw new Error('Listing not found.');
    }

    return normalizeRecord(snapshot.id, snapshot.data() as Partial<ListingRecord>);
  } catch (error) {
    console.error('Falling back to local submission store after listing renewal update failed.', error);
    assertWritablePersistentStore('Renewing listing validity');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === moduleKey);

    if (index === -1) {
      throw new Error('Listing not found.');
    }

    const current = items[index]!;
    if (current.status !== 'approved') {
      throw new Error('Only approved listings can be renewed.');
    }

    const updated: ListingRecord = {
      ...current,
      validFrom: now,
      validUntil,
      lastRenewedAt: now,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }
}
export async function renewHelperListingValidity(id: string, durationDays: number): Promise<ListingRecord> {
  const days = Number.isInteger(durationDays) ? durationDays : 0;
  if (days <= 0 || days > 365) {
    throw new Error('Renewal duration must be between 1 and 365 days.');
  }

  const now = new Date().toISOString();
  const validUntil = addDaysToIso(now, days);

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Renewing helper listing validity');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === 'helpers');

    if (index === -1) {
      throw new Error('Helper listing not found.');
    }

    const current = items[index]!;
    if (current.status !== 'approved') {
      throw new Error('Only approved helper listings can be renewed.');
    }

    const updated: ListingRecord = {
      ...current,
      validFrom: now,
      validUntil,
      lastRenewedAt: now,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(getCollectionName('helpers')).doc(id);
    const existing = await documentReference.get();

    if (!existing.exists) {
      throw new Error('Helper listing not found.');
    }

    const current = normalizeRecord(existing.id, existing.data() as Partial<ListingRecord>);
    if (current.status !== 'approved') {
      throw new Error('Only approved helper listings can be renewed.');
    }

    await documentReference.update({
      validFrom: now,
      validUntil,
      lastRenewedAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await documentReference.get();
    if (!snapshot.exists) {
      throw new Error('Helper listing not found.');
    }

    return normalizeRecord(snapshot.id, snapshot.data() as Partial<ListingRecord>);
  } catch (error) {
    console.error('Falling back to local submission store after helper renewal update failed.', error);
    assertWritablePersistentStore('Renewing helper listing validity');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === 'helpers');

    if (index === -1) {
      throw new Error('Helper listing not found.');
    }

    const current = items[index]!;
    if (current.status !== 'approved') {
      throw new Error('Only approved helper listings can be renewed.');
    }

    const updated: ListingRecord = {
      ...current,
      validFrom: now,
      validUntil,
      lastRenewedAt: now,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }
}

export async function incrementHelperPhoneClick(id: string): Promise<ListingRecord> {
  const now = new Date().toISOString();

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Updating helper phone click analytics');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === 'helpers');

    if (index === -1) {
      throw new Error('Helper listing not found.');
    }

    const current = items[index]!;
    if (!current.approved || getListingExpiryState(current).expired) {
      throw new Error('Helper listing is not active.');
    }

    const updated: ListingRecord = {
      ...current,
      phoneClickCount: current.phoneClickCount + 1,
      lastPhoneClickAt: now,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(getCollectionName('helpers')).doc(id);
    const existing = await documentReference.get();

    if (!existing.exists) {
      throw new Error('Helper listing not found.');
    }

    const current = normalizeRecord(existing.id, existing.data() as Partial<ListingRecord>);
    if (!current.approved || getListingExpiryState(current).expired) {
      throw new Error('Helper listing is not active.');
    }

    await documentReference.update({
      phoneClickCount: FieldValue.increment(1),
      lastPhoneClickAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await documentReference.get();
    if (!snapshot.exists) {
      throw new Error('Helper listing not found.');
    }

    return normalizeRecord(snapshot.id, snapshot.data() as Partial<ListingRecord>);
  } catch (error) {
    console.error('Falling back to local submission store after helper click update failed.', error);
    assertWritablePersistentStore('Updating helper phone click analytics');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === 'helpers');

    if (index === -1) {
      throw new Error('Helper listing not found.');
    }

    const current = items[index]!;
    if (!current.approved || getListingExpiryState(current).expired) {
      throw new Error('Helper listing is not active.');
    }

    const updated: ListingRecord = {
      ...current,
      phoneClickCount: current.phoneClickCount + 1,
      lastPhoneClickAt: now,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }
}

export async function updateListingAvailability(
  moduleKey: DirectoryModuleKey,
  id: string,
  email: string,
  availability: Record<string, 'available' | 'booked'>
): Promise<ListingRecord> {
  const now = new Date().toISOString();

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Updating listing availability');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === moduleKey);

    if (index === -1) {
      throw new Error('Listing not found.');
    }

    const current = items[index]!;
    if (current.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('You do not have permission to update this listing.');
    }

    if (!current.approved) {
      throw new Error('Only approved listings can have availability updates.');
    }

    const updated: ListingRecord = {
      ...current,
      availability,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(getCollectionName(moduleKey)).doc(id);
    const existing = await documentReference.get();

    if (!existing.exists) {
      throw new Error('Listing not found.');
    }

    const current = normalizeRecord(existing.id, existing.data() as Partial<ListingRecord>);
    if (current.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('You do not have permission to update this listing.');
    }

    if (!current.approved) {
      throw new Error('Only approved listings can have availability updates.');
    }

    await documentReference.update({
      availability,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await documentReference.get();
    if (!snapshot.exists) {
      throw new Error('Listing not found.');
    }

    return normalizeRecord(snapshot.id, snapshot.data() as Partial<ListingRecord>);
  } catch (error) {
    console.error('Falling back to local submission store after availability update failed.', error);
    assertWritablePersistentStore('Updating listing availability');
    const items = await readFileStore();
    const index = items.findIndex((item) => item.id === id && item.moduleKey === moduleKey);

    if (index === -1) {
      throw new Error('Listing not found.');
    }

    const current = items[index]!;
    if (current.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('You do not have permission to update this listing.');
    }

    if (!current.approved) {
      throw new Error('Only approved listings can have availability updates.');
    }

    const updated: ListingRecord = {
      ...current,
      availability,
      updatedAt: now,
    };

    items[index] = updated;
    await writeFileStore(items);
    return updated;
  }
}

