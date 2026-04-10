import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

function normalizePrivateKey(value: string | null): string | null {
  return value?.replace(/\\n/g, '\n') ?? null;
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

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getFirestoreAdmin() {
  const app = getFirebaseAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();

  if (databaseId) {
    return getFirestore(app, databaseId);
  }

  return getFirestore(app);
}
