import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

function stripWrappingQuotes(value: string): string {
  const trimmedValue = value.trim();
  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function normalizePrivateKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return stripWrappingQuotes(value)
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n');
}

function isPlaceholderProjectId(value: string | null): boolean {
  return value === 'your-firebase-project-id';
}

function isPlaceholderClientEmail(value: string | null): boolean {
  return value === 'your-service-account-email';
}

function isValidPrivateKey(value: string | null): value is string {
  if (!value || value.includes('YOUR_PRIVATE_KEY')) {
    return false;
  }

  return value.includes('-----BEGIN PRIVATE KEY-----') && value.includes('-----END PRIVATE KEY-----');
}

export function isFirestoreConfigured(): boolean {
  const projectId = getRequiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = getRequiredEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(getRequiredEnv('FIREBASE_PRIVATE_KEY'));

  return Boolean(
    projectId &&
      clientEmail &&
      !isPlaceholderProjectId(projectId) &&
      !isPlaceholderClientEmail(clientEmail) &&
      isValidPrivateKey(privateKey)
  );
}

function getFirebaseAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const projectId = getRequiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = getRequiredEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(getRequiredEnv('FIREBASE_PRIVATE_KEY'));

  if (
    !projectId ||
    !clientEmail ||
    isPlaceholderProjectId(projectId) ||
    isPlaceholderClientEmail(clientEmail) ||
    !isValidPrivateKey(privateKey)
  ) {
    throw new Error('Firestore is not configured. Add valid FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY values.');
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/DECODER routines::unsupported|private key/i.test(message)) {
      throw new Error(
        'Invalid FIREBASE_PRIVATE_KEY format. In production, store the Firebase private key without surrounding quotes, or as a single-line value with literal \\n escapes between lines.'
      );
    }

    throw error;
  }
}

export function getFirestoreAdmin() {
  const app = getFirebaseAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();

  if (databaseId) {
    return getFirestore(app, databaseId);
  }

  return getFirestore(app);
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.FIREBASE_STORAGE_BUCKET?.trim());
}

export function getStorageAdmin() {
  const app = getFirebaseAdminApp();
  const bucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) {
    throw new Error('FIREBASE_STORAGE_BUCKET is not configured. Add it to your environment variables.');
  }
  return getStorage(app).bucket(bucket);
}
