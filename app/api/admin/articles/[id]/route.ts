import { NextResponse } from 'next/server';
import { canManageAllTowns, getAppViewer } from '@/lib/auth';
import { getArticleById, updateArticleStatus } from '@/lib/articles';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/articles/[id]'>) {
  const viewer = await getAppViewer();
  if (!canManageAllTowns(viewer)) {
    return NextResponse.json({ error: 'Super-admin access required.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: string; moderationNote?: string };

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'status must be approved or rejected.' }, { status: 400 });
  }

  try {
    const existing = await getArticleById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

    const record = await updateArticleStatus(
      id,
      body.status,
      body.moderationNote ?? '',
      viewer.email ?? 'superadmin'
    );
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update article.' },
      { status: 500 }
    );
  }
}
