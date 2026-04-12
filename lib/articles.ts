import 'server-only';

import { FieldValue, Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreAdmin, getStorageAdmin, isFirestoreConfigured, isStorageConfigured } from '@/lib/firestore-admin';

export type ArticleStatus = 'pending' | 'approved' | 'rejected';

export type ArticleRecord = {
  id: string;
  townId: string;
  townName: string;
  title: string;
  content: string;
  images: string[];
  status: ArticleStatus;
  submittedByEmail: string;
  submittedByName: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  moderationNote: string;
};

export type ArticleInput = {
  townId: string;
  townName: string;
  title: string;
  content: string;
  images: string[];
  submittedByEmail: string;
  submittedByName: string;
};

const ARTICLES_COLLECTION = 'articles';
const MAX_ARTICLES_PER_TOWN = 5;
const MAX_IMAGES_PER_ARTICLE = 2;

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) return value;
  return new Date().toISOString();
}

function normalizeRecord(id: string, raw: Partial<ArticleRecord>): ArticleRecord {
  return {
    id,
    townId: raw.townId ?? '',
    townName: raw.townName ?? '',
    title: raw.title ?? '',
    content: raw.content ?? '',
    images: Array.isArray(raw.images) ? raw.images.slice(0, MAX_IMAGES_PER_ARTICLE) : [],
    status: raw.status ?? 'pending',
    submittedByEmail: raw.submittedByEmail?.trim().toLowerCase() ?? '',
    submittedByName: raw.submittedByName ?? '',
    submittedAt: toIsoString(raw.submittedAt),
    updatedAt: toIsoString(raw.updatedAt),
    reviewedAt: raw.reviewedAt ? toIsoString(raw.reviewedAt) : null,
    moderationNote: raw.moderationNote ?? '',
  };
}

function normalizeDoc(doc: QueryDocumentSnapshot<DocumentData>): ArticleRecord {
  return normalizeRecord(doc.id, doc.data() as Partial<ArticleRecord>);
}

function assertFirestore(action: string): void {
  if (!isFirestoreConfigured()) {
    throw new Error(`${action} requires Firestore to be configured.`);
  }
}

/** Delete storage files for an article's images (best-effort, non-blocking) */
async function deleteArticleImages(images: string[]): Promise<void> {
  if (!isStorageConfigured() || images.length === 0) return;
  try {
    const bucket = getStorageAdmin();
    await Promise.all(
      images.map(async (url) => {
        try {
          // Extract the storage path from the download URL
          const match = url.match(/\/o\/(.+?)\?/);
          if (!match) return;
          const filePath = decodeURIComponent(match[1]);
          await bucket.file(filePath).delete();
        } catch {
          // Best-effort: ignore individual file delete errors
        }
      })
    );
  } catch {
    // Best-effort: ignore storage errors
  }
}

export async function submitArticle(input: ArticleInput): Promise<ArticleRecord> {
  assertFirestore('submitArticle');
  const db = getFirestoreAdmin();
  const now = new Date().toISOString();
  const data = {
    townId: input.townId,
    townName: input.townName,
    title: input.title.trim(),
    content: input.content.trim(),
    images: input.images.slice(0, MAX_IMAGES_PER_ARTICLE),
    status: 'pending' as ArticleStatus,
    submittedByEmail: input.submittedByEmail.trim().toLowerCase(),
    submittedByName: input.submittedByName.trim(),
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    moderationNote: '',
  };
  const ref = await db.collection(ARTICLES_COLLECTION).add(data);
  return normalizeRecord(ref.id, { ...data, submittedAt: now, updatedAt: now });
}

export async function getArticlesByTown(townId: string, status?: ArticleStatus): Promise<ArticleRecord[]> {
  assertFirestore('getArticlesByTown');
  const db = getFirestoreAdmin();
  let query = db.collection(ARTICLES_COLLECTION).where('townId', '==', townId);
  if (status) query = query.where('status', '==', status) as typeof query;
  const snapshot = await query.get();
  return snapshot.docs.map(normalizeDoc);
}

export async function getApprovedArticlesForTown(townId: string): Promise<ArticleRecord[]> {
  assertFirestore('getApprovedArticlesForTown');
  const db = getFirestoreAdmin();
  const snapshot = await db
    .collection(ARTICLES_COLLECTION)
    .where('townId', '==', townId)
    .where('status', '==', 'approved')
    .orderBy('reviewedAt', 'desc')
    .limit(MAX_ARTICLES_PER_TOWN)
    .get();
  return snapshot.docs.map(normalizeDoc);
}

export async function getAllPendingArticles(): Promise<ArticleRecord[]> {
  assertFirestore('getAllPendingArticles');
  const db = getFirestoreAdmin();
  const snapshot = await db
    .collection(ARTICLES_COLLECTION)
    .where('status', '==', 'pending')
    .orderBy('submittedAt', 'asc')
    .get();
  return snapshot.docs.map(normalizeDoc);
}

export async function getArticleById(id: string): Promise<ArticleRecord | null> {
  assertFirestore('getArticleById');
  const db = getFirestoreAdmin();
  const doc = await db.collection(ARTICLES_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizeDoc(doc as QueryDocumentSnapshot<DocumentData>);
}

export async function updateArticleStatus(
  id: string,
  status: 'approved' | 'rejected',
  moderationNote: string,
  reviewerEmail: string
): Promise<ArticleRecord> {
  assertFirestore('updateArticleStatus');
  const db = getFirestoreAdmin();

  const existing = await getArticleById(id);
  if (!existing) throw new Error('Article not found.');

  if (status === 'approved') {
    // Enforce 5-article cap: evict oldest approved article for this town
    const approvedSnapshot = await db
      .collection(ARTICLES_COLLECTION)
      .where('townId', '==', existing.townId)
      .where('status', '==', 'approved')
      .orderBy('reviewedAt', 'asc')
      .get();

    if (approvedSnapshot.size >= MAX_ARTICLES_PER_TOWN) {
      const oldest = approvedSnapshot.docs[0];
      if (oldest) {
        const oldRecord = normalizeDoc(oldest as QueryDocumentSnapshot<DocumentData>);
        await deleteArticleImages(oldRecord.images);
        await oldest.ref.delete();
      }
    }
  }

  const now = FieldValue.serverTimestamp();
  await db.collection(ARTICLES_COLLECTION).doc(id).update({
    status,
    moderationNote,
    reviewedAt: now,
    updatedAt: now,
  });

  return normalizeRecord(id, {
    ...existing,
    status,
    moderationNote,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getArticlesByTownAdmin(email: string, townIds: string[]): Promise<ArticleRecord[]> {
  assertFirestore('getArticlesByTownAdmin');
  if (townIds.length === 0) return [];
  const db = getFirestoreAdmin();
  // Firestore 'in' supports up to 10 values  const chunks: string[][] = [];
  for (let i = 0; i < townIds.length; i += 10) {
    chunks.push(townIds.slice(i, i + 10));
  }
  const results: ArticleRecord[] = [];
  for (const chunk of chunks) {
    const snapshot = await db
      .collection(ARTICLES_COLLECTION)
      .where('townId', 'in', chunk)
      .orderBy('submittedAt', 'desc')
      .get();
    results.push(...snapshot.docs.map(normalizeDoc));
  }
  return results;
}
