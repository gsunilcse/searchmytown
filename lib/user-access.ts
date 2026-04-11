import 'server-only';

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { FieldValue, Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getTownById } from '@/config/towns';
import { getFirestoreAdmin, isFirestoreConfigured } from '@/lib/firestore-admin';
import { isTownEnabled } from '@/lib/town-settings';

export type RequestedRole = 'publisher' | 'townadmin' | 'superadmin';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type RegisteredUserRecord = {
  email: string;
  name: string;
  mobile: string;
  publisherTownIds: string[];
  townAdminTownIds: string[];
  superAdminApproved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SignupRequestRecord = {
  id: string;
  email: string;
  name: string;
  mobile: string;
  requestedRole: RequestedRole;
  townId: string | null;
  townName: string | null;
  status: RequestStatus;
  requestedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewNote: string;
  reviewedByEmail: string;
};

type SignupInput = {
  name: string;
  email: string;
  mobile: string;
  requestedRole: RequestedRole;
  townId?: string | null;
};

type AccessProfile = {
  email: string;
  name: string;
  mobile: string;
  publisherTownIds: string[];
  townAdminTownIds: string[];
  superAdminApproved: boolean;
};

type SignupResult =
  | {
      kind: 'approved';
      user: RegisteredUserRecord;
    }
  | {
      kind: 'pending';
      request: SignupRequestRecord;
    };

const USERS_DATA_FILE_PATH = path.join(process.cwd(), 'data', 'registered-users.json');
const REQUESTS_DATA_FILE_PATH = path.join(process.cwd(), 'data', 'signup-requests.json');
const USERS_COLLECTION_NAME = 'registeredUsers';
const REQUESTS_COLLECTION_NAME = 'signupRequests';

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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeUserRecord(email: string, raw: Partial<RegisteredUserRecord>): RegisteredUserRecord {
  return {
    email: normalizeEmail(email),
    name: raw.name?.trim() ?? '',
    mobile: raw.mobile?.trim() ?? '',
    publisherTownIds: Array.isArray(raw.publisherTownIds)
      ? Array.from(new Set(raw.publisherTownIds.filter((value): value is string => typeof value === 'string' && value.length > 0)))
      : [],
    townAdminTownIds: Array.isArray(raw.townAdminTownIds)
      ? Array.from(new Set(raw.townAdminTownIds.filter((value): value is string => typeof value === 'string' && value.length > 0)))
      : [],
    superAdminApproved: Boolean(raw.superAdminApproved),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  };
}

function normalizeRequestRecord(id: string, raw: Partial<SignupRequestRecord>): SignupRequestRecord {
  return {
    id,
    email: normalizeEmail(raw.email ?? ''),
    name: raw.name?.trim() ?? '',
    mobile: raw.mobile?.trim() ?? '',
    requestedRole: raw.requestedRole ?? 'publisher',
    townId: typeof raw.townId === 'string' && raw.townId.length > 0 ? raw.townId : null,
    townName: typeof raw.townName === 'string' && raw.townName.length > 0 ? raw.townName : null,
    status: raw.status ?? 'pending',
    requestedAt: toIsoString(raw.requestedAt),
    updatedAt: toIsoString(raw.updatedAt),
    reviewedAt: raw.reviewedAt ? toIsoString(raw.reviewedAt) : null,
    reviewNote: raw.reviewNote ?? '',
    reviewedByEmail: normalizeEmail(raw.reviewedByEmail ?? ''),
  };
}

function normalizeUserFirestoreDocument(document: QueryDocumentSnapshot<DocumentData>): RegisteredUserRecord {
  return normalizeUserRecord(document.id, document.data() as Partial<RegisteredUserRecord>);
}

function normalizeRequestFirestoreDocument(document: QueryDocumentSnapshot<DocumentData>): SignupRequestRecord {
  return normalizeRequestRecord(document.id, document.data() as Partial<SignupRequestRecord>);
}

async function readUsersFileStore(): Promise<RegisteredUserRecord[]> {
  try {
    const content = await readFile(USERS_DATA_FILE_PATH, 'utf8');
    const parsed = JSON.parse(content) as Partial<RegisteredUserRecord>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Partial<RegisteredUserRecord> & { email: string } => typeof item?.email === 'string')
      .map((item) => normalizeUserRecord(item.email, item));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeUsersFileStore(items: RegisteredUserRecord[]): Promise<void> {
  await writeFile(USERS_DATA_FILE_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

async function readRequestsFileStore(): Promise<SignupRequestRecord[]> {
  try {
    const content = await readFile(REQUESTS_DATA_FILE_PATH, 'utf8');
    const parsed = JSON.parse(content) as Partial<SignupRequestRecord>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => normalizeRequestRecord(item.id ?? `signup-request-${index + 1}`, item))
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeRequestsFileStore(items: SignupRequestRecord[]): Promise<void> {
  await writeFile(REQUESTS_DATA_FILE_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

async function getFirestoreUsers(): Promise<RegisteredUserRecord[]> {
  const snapshot = await getFirestoreAdmin().collection(USERS_COLLECTION_NAME).get();
  return snapshot.docs.map(normalizeUserFirestoreDocument);
}

async function getFirestoreRequests(): Promise<SignupRequestRecord[]> {
  const snapshot = await getFirestoreAdmin().collection(REQUESTS_COLLECTION_NAME).get();
  return snapshot.docs
    .map(normalizeRequestFirestoreDocument)
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

async function getUsersWithFallback(): Promise<RegisteredUserRecord[]> {
  if (!isFirestoreConfigured()) {
    return readUsersFileStore();
  }

  try {
    return await getFirestoreUsers();
  } catch (error) {
    console.error('Falling back to local registered user store after Firestore read failed.', error);
    return readUsersFileStore();
  }
}

async function getCanonicalDbSuperAdminEmail(): Promise<string | null> {
  const users = await getUsersWithFallback();
  const approvedSuperAdmins = users
    .filter((user) => user.superAdminApproved)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return approvedSuperAdmins[0]?.email ?? null;
}

async function getRequestsWithFallback(): Promise<SignupRequestRecord[]> {
  if (!isFirestoreConfigured()) {
    return readRequestsFileStore();
  }

  try {
    return await getFirestoreRequests();
  } catch (error) {
    console.error('Falling back to local signup request store after Firestore read failed.', error);
    return readRequestsFileStore();
  }
}

function validateEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Provide a valid email address.');
  }

  return normalizedEmail;
}

function validateName(name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('Name is required.');
  }

  return normalizedName;
}

function validateMobile(mobile: string) {
  const normalizedMobile = mobile.trim();
  const digits = normalizedMobile.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('Provide a valid mobile number.');
  }

  return normalizedMobile;
}

async function validateSignupInput(input: SignupInput) {
  const email = validateEmail(input.email);
  const name = validateName(input.name);
  const mobile = validateMobile(input.mobile);

  if (input.requestedRole === 'superadmin') {
    throw new Error('Superadmin signup is disabled. Insert the single superadmin record directly in the database.');
  }

  if (input.requestedRole === 'publisher' || input.requestedRole === 'townadmin') {
    if (!input.townId) {
      throw new Error(`Choose an enabled town for ${input.requestedRole} signup.`);
    }

    const town = getTownById(input.townId);
    if (!town) {
      throw new Error('Unsupported town.');
    }

    if (!(await isTownEnabled(input.townId))) {
      throw new Error(`${input.requestedRole} signup is allowed only for enabled towns.`);
    }

    return {
      email,
      name,
      mobile,
      requestedRole: input.requestedRole,
      town,
    };
  }

  return {
    email,
    name,
    mobile,
    requestedRole: input.requestedRole,
    town: null,
  };
}

async function upsertRegisteredUser(profile: AccessProfile): Promise<RegisteredUserRecord> {
  const normalizedEmail = normalizeEmail(profile.email);
  const nextRecord: RegisteredUserRecord = normalizeUserRecord(normalizedEmail, {
    email: normalizedEmail,
    name: profile.name,
    mobile: profile.mobile,
    publisherTownIds: profile.publisherTownIds,
    townAdminTownIds: profile.townAdminTownIds,
    superAdminApproved: profile.superAdminApproved,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Saving registered users');
    const users = await readUsersFileStore();
    const index = users.findIndex((item) => item.email === normalizedEmail);
    const existing = index >= 0 ? users[index]! : null;
    const savedRecord: RegisteredUserRecord = {
      ...nextRecord,
      createdAt: existing?.createdAt ?? nextRecord.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      users[index] = savedRecord;
    } else {
      users.push(savedRecord);
    }

    await writeUsersFileStore(users);
    return savedRecord;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(USERS_COLLECTION_NAME).doc(normalizedEmail);
    const existingSnapshot = await documentReference.get();

    await documentReference.set(
      {
        ...nextRecord,
        createdAt: existingSnapshot.exists ? existingSnapshot.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const savedSnapshot = await documentReference.get();
    if (!savedSnapshot.exists) {
      return nextRecord;
    }

    return normalizeUserRecord(savedSnapshot.id, savedSnapshot.data() as Partial<RegisteredUserRecord>);
  } catch (error) {
    console.error('Falling back to local registered user store after Firestore write failed.', error);
    assertWritablePersistentStore('Saving registered users');
    const users = await readUsersFileStore();
    const index = users.findIndex((item) => item.email === normalizedEmail);
    const existing = index >= 0 ? users[index]! : null;
    const savedRecord: RegisteredUserRecord = {
      ...nextRecord,
      createdAt: existing?.createdAt ?? nextRecord.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      users[index] = savedRecord;
    } else {
      users.push(savedRecord);
    }

    await writeUsersFileStore(users);
    return savedRecord;
  }
}

async function applyApprovedRequest(request: SignupRequestRecord): Promise<RegisteredUserRecord> {
  const existingUser = await getRegisteredUserByEmail(request.email);
  const publisherTownIds = new Set(existingUser?.publisherTownIds ?? []);
  const townAdminTownIds = new Set(existingUser?.townAdminTownIds ?? []);

  if (request.requestedRole === 'townadmin' && request.townId) {
    townAdminTownIds.add(request.townId);
  }

  return upsertRegisteredUser({
    email: request.email,
    name: request.name || existingUser?.name || '',
    mobile: request.mobile || existingUser?.mobile || '',
    publisherTownIds: Array.from(publisherTownIds),
    townAdminTownIds: Array.from(townAdminTownIds),
    superAdminApproved: request.requestedRole === 'superadmin' ? true : existingUser?.superAdminApproved ?? false,
  });
}

export async function getRegisteredUserByEmail(email: string): Promise<RegisteredUserRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  const users = await getUsersWithFallback();
  return users.find((item) => item.email === normalizedEmail) ?? null;
}

export async function getAllSignupRequests(): Promise<SignupRequestRecord[]> {
  return getRequestsWithFallback();
}

export async function getSignupRequestsByEmail(email: string): Promise<SignupRequestRecord[]> {
  const normalizedEmail = normalizeEmail(email);
  const requests = await getRequestsWithFallback();
  return requests.filter((item) => item.email === normalizedEmail);
}

export async function getAccessProfileByEmail(email: string): Promise<AccessProfile | null> {
  const user = await getRegisteredUserByEmail(email);
  if (!user) {
    return null;
  }

  const canonicalSuperAdminEmail = user.superAdminApproved ? await getCanonicalDbSuperAdminEmail() : null;

  return {
    email: user.email,
    name: user.name,
    mobile: user.mobile,
    publisherTownIds: user.publisherTownIds,
    townAdminTownIds: user.townAdminTownIds,
    superAdminApproved: canonicalSuperAdminEmail === user.email,
  };
}

export async function createSignupRequest(input: SignupInput): Promise<SignupResult> {
  const { email, name, mobile, requestedRole, town } = await validateSignupInput(input);
  const existingUser = await getRegisteredUserByEmail(email);
  const existingRequests = await getRequestsWithFallback();

  if (requestedRole === 'publisher') {
    if (!town) {
      throw new Error('Choose an enabled town for publisher signup.');
    }

    if (existingUser?.publisherTownIds.includes(town.id)) {
      throw new Error(`Publisher access is already active for ${town.name}.`);
    }

    const publisherTownIds = new Set(existingUser?.publisherTownIds ?? []);
    publisherTownIds.add(town.id);

    const user = await upsertRegisteredUser({
      email,
      name,
      mobile,
      publisherTownIds: Array.from(publisherTownIds),
      townAdminTownIds: existingUser?.townAdminTownIds ?? [],
      superAdminApproved: existingUser?.superAdminApproved ?? false,
    });

    return {
      kind: 'approved',
      user,
    };
  }

  if (requestedRole === 'townadmin' && town && existingUser?.townAdminTownIds.includes(town.id)) {
    throw new Error(`Townadmin access is already active for ${town.name}.`);
  }

  const duplicatePending = existingRequests.find(
    (request) =>
      request.email === email &&
      request.requestedRole === requestedRole &&
      request.status === 'pending' &&
      request.townId === (town?.id ?? null)
  );

  if (duplicatePending) {
    throw new Error('A matching signup request is already pending review.');
  }

  const now = new Date().toISOString();
  const record: SignupRequestRecord = {
    id: crypto.randomUUID(),
    email,
    name,
    mobile,
    requestedRole,
    townId: town?.id ?? null,
    townName: town?.name ?? null,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
    reviewedAt: null,
    reviewNote: '',
    reviewedByEmail: '',
  };

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Creating signup requests');
    const requests = await readRequestsFileStore();
    requests.unshift(record);
    await writeRequestsFileStore(requests);
    return {
      kind: 'pending',
      request: record,
    };
  }

  try {
    await getFirestoreAdmin().collection(REQUESTS_COLLECTION_NAME).doc(record.id).set({
      ...record,
      requestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
    });

    const savedDocument = await getFirestoreAdmin().collection(REQUESTS_COLLECTION_NAME).doc(record.id).get();
    const savedRecord = savedDocument.exists
      ? normalizeRequestRecord(savedDocument.id, savedDocument.data() as Partial<SignupRequestRecord>)
      : record;

    return {
      kind: 'pending',
      request: savedRecord,
    };
  } catch (error) {
    console.error('Falling back to local signup request store after Firestore write failed.', error);
    assertWritablePersistentStore('Creating signup requests');
    const requests = await readRequestsFileStore();
    requests.unshift(record);
    await writeRequestsFileStore(requests);
    return {
      kind: 'pending',
      request: record,
    };
  }
}

export async function reviewSignupRequest(
  id: string,
  status: Exclude<RequestStatus, 'pending'>,
  reviewNote: string,
  reviewedByEmail: string
): Promise<SignupRequestRecord> {
  const normalizedReviewerEmail = normalizeEmail(reviewedByEmail);

  if (!isFirestoreConfigured()) {
    assertWritablePersistentStore('Reviewing signup requests');
    const requests = await readRequestsFileStore();
    const index = requests.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Signup request not found.');
    }

    const current = requests[index]!;
    const updated: SignupRequestRecord = {
      ...current,
      status,
      reviewNote: reviewNote.trim(),
      reviewedByEmail: normalizedReviewerEmail,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requests[index] = updated;
    await writeRequestsFileStore(requests);

    if (status === 'approved') {
      await applyApprovedRequest(updated);
    }

    return updated;
  }

  try {
    const documentReference = getFirestoreAdmin().collection(REQUESTS_COLLECTION_NAME).doc(id);
    await documentReference.update({
      status,
      reviewNote: reviewNote.trim(),
      reviewedByEmail: normalizedReviewerEmail,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await documentReference.get();
    if (!snapshot.exists) {
      throw new Error('Signup request not found.');
    }

    const updated = normalizeRequestRecord(snapshot.id, snapshot.data() as Partial<SignupRequestRecord>);
    if (status === 'approved') {
      await applyApprovedRequest(updated);
    }

    return updated;
  } catch (error) {
    console.error('Falling back to local signup request store after Firestore moderation update failed.', error);
    assertWritablePersistentStore('Reviewing signup requests');
    const requests = await readRequestsFileStore();
    const index = requests.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Signup request not found.');
    }

    const current = requests[index]!;
    const updated: SignupRequestRecord = {
      ...current,
      status,
      reviewNote: reviewNote.trim(),
      reviewedByEmail: normalizedReviewerEmail,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requests[index] = updated;
    await writeRequestsFileStore(requests);

    if (status === 'approved') {
      await applyApprovedRequest(updated);
    }

    return updated;
  }
}