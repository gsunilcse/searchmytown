import { NextResponse } from 'next/server';
import { canReviewAdminRequests, getAppViewer } from '@/lib/auth';
import { removeTownAdmin, getTownAdminForTown } from '@/lib/user-access';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const viewer = await getAppViewer();
  if (!canReviewAdminRequests(viewer) || !viewer.email) {
    return NextResponse.json({ error: 'Only the super admin can remove town admins.' }, { status: 401 });
  }

  const body = (await request.json()) as { townId?: string; adminEmail?: string };

  if (!body.townId || !body.adminEmail) {
    return NextResponse.json({ error: 'townId and adminEmail are required.' }, { status: 400 });
  }

  try {
    await removeTownAdmin(body.townId, body.adminEmail);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to remove town admin.' },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const viewer = await getAppViewer();
  if (!canReviewAdminRequests(viewer)) {
    return NextResponse.json({ error: 'Only the super admin can view town admins.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const townId = searchParams.get('townId');

  if (!townId) {
    return NextResponse.json({ error: 'townId is required.' }, { status: 400 });
  }

  const admin = await getTownAdminForTown(townId);
  return NextResponse.json({ admin });
}
