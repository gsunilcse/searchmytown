import { NextResponse } from 'next/server';
import { canReviewAdminRequests, getAppViewer } from '@/lib/auth';
import { reviewSignupRequest } from '@/lib/user-access';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/access-requests/[id]'>) {
  const viewer = await getAppViewer();
  if (!canReviewAdminRequests(viewer) || !viewer.email) {
    return NextResponse.json({ error: 'Only the super admin can review signup requests.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: string; reviewNote?: string };

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Invalid signup review status.' }, { status: 400 });
  }

  try {
    const record = await reviewSignupRequest(id, body.status, body.reviewNote ?? '', viewer.email);
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update the signup request.' },
      { status: 400 }
    );
  }
}