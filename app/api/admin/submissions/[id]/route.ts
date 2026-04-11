import { NextResponse } from 'next/server';
import { isDirectoryModuleKey } from '@/config/modules';
import { canAccessAdmin, canModerateTown, getAppViewer } from '@/lib/auth';
import { getListingById, updateListingStatus } from '@/lib/submissions';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/submissions/[id]'>) {
  const viewer = await getAppViewer();
  if (!canAccessAdmin(viewer)) {
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
    const existingRecord = await getListingById(body.moduleKey, id);
    if (!existingRecord) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    if (!canModerateTown(viewer, existingRecord.townId)) {
      return NextResponse.json({ error: 'You do not have moderation access for this town.' }, { status: 403 });
    }

    const record = await updateListingStatus(body.moduleKey, id, status, body.moderationNote ?? '');
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update submission.' },
      { status: 400 }
    );
  }
}