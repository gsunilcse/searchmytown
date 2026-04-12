import { NextResponse } from 'next/server';
import { getAppViewer } from '@/lib/auth';
import { getStorageAdmin, isStorageConfigured } from '@/lib/firestore-admin';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const viewer = await getAppViewer();
  if (!viewer.isAuthenticated || !viewer.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const isTownAdmin = viewer.roles.includes('townadmin');
  const isSuperAdmin = viewer.roles.includes('super-admin');
  if (!isTownAdmin && !isSuperAdmin) {
    return NextResponse.json({ error: 'Town admin access required.' }, { status: 403 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'Image storage is not configured on this server.' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  const townId = formData.get('townId');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required.' }, { status: 400 });
  }
  if (typeof townId !== 'string' || !townId.trim()) {
    return NextResponse.json({ error: 'townId field is required.' }, { status: 400 });
  }

  if (!isSuperAdmin && !viewer.adminTownIds.includes(townId.trim())) {
    return NextResponse.json({ error: 'You do not administer this town.' }, { status: 403 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image must be smaller than 5 MB.' }, { status: 400 });
  }

  try {
    const bucket = getStorageAdmin();
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `articles/${townId.trim()}/${randomUUID()}.${ext}`;
    const bucketFile = bucket.file(storagePath);

    const buffer = Buffer.from(await file.arrayBuffer());
    await bucketFile.save(buffer, {
      metadata: { contentType: file.type },
    });

    // Make the file publicly readable
    await bucketFile.makePublic();
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    return NextResponse.json({ url: downloadUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image upload failed.' },
      { status: 500 }
    );
  }
}
