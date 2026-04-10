import { NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-auth';
import { getManagedTowns, updateTownEnabled } from '@/lib/town-settings';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  return NextResponse.json({ towns: await getManagedTowns() });
}

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized admin access.' }, { status: 401 });
  }

  const body = (await request.json()) as { townId?: string; enabled?: boolean };
  if (typeof body.townId !== 'string' || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid town settings payload.' }, { status: 400 });
  }

  try {
    const towns = await updateTownEnabled(body.townId, body.enabled);
    return NextResponse.json({ towns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update town settings.' },
      { status: 400 }
    );
  }
}