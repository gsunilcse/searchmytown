import { NextResponse } from 'next/server';
import { getAppViewer } from '@/lib/auth';
import { getApprovedArticlesForTown, submitArticle } from '@/lib/articles';
import { getTownById } from '@/config/towns';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const townId = searchParams.get('townId')?.trim();
  if (!townId) {
    return NextResponse.json({ error: 'townId is required.' }, { status: 400 });
  }
  try {
    const articles = await getApprovedArticlesForTown(townId);
    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to fetch articles.' },
      { status: 500 }
    );
  }
}

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

  const body = (await request.json()) as {
    townId?: string;
    title?: string;
    content?: string;
    images?: unknown;
  };

  const townId = body.townId?.trim();
  const title = body.title?.trim();
  const content = body.content?.trim();
  const images = Array.isArray(body.images) ? (body.images as string[]).slice(0, 2) : [];

  if (!townId || !title || !content) {
    return NextResponse.json({ error: 'townId, title and content are required.' }, { status: 400 });
  }

  if (!isSuperAdmin && !viewer.adminTownIds.includes(townId)) {
    return NextResponse.json({ error: 'You do not administer this town.' }, { status: 403 });
  }

  // Validate image URL format (must be https)
  for (const url of images) {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 });
    }
  }

  const town = getTownById(townId);
  const townName = town?.name ?? townId;

  try {
    const article = await submitArticle({
      townId,
      townName,
      title,
      content,
      images,
      submittedByEmail: viewer.email,
      submittedByName: viewer.name ?? viewer.email,
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to submit article.' },
      { status: 500 }
    );
  }
}
