import { NextResponse } from 'next/server';
import { isDirectoryModuleKey } from '@/config/modules';
import { hasAdminSession } from '@/lib/admin-auth';
import { updateListingStatus } from '@/lib/submissions';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/submissions/[id]'>) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { moduleKey?: string; status?: string; moderationNote?: string };
  const status = body.status;

  if (!body.moduleKey || !isDirectoryModuleKey(body.moduleKey)) {
    return NextResponse.json({ error: 'Invalid module for moderation.' }, { status: 400 });
  }

  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'Invalid moderation status.' }, { status: 400 });
  }

  try {
    const record = await updateListingStatus(body.moduleKey, id, status, body.moderationNote ?? '');
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update submission.' },
      { status: 400 }
    );
  }
}