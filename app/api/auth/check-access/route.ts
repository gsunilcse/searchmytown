import { NextResponse } from 'next/server';
import { canAuthenticateRole } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      requestedRole?: string;
      townId?: string;
    };

    if (body.requestedRole !== 'publisher' && body.requestedRole !== 'townadmin' && body.requestedRole !== 'superadmin') {
      return NextResponse.json({ error: 'Choose publisher, townadmin, or superadmin.' }, { status: 400 });
    }

    const result = await canAuthenticateRole(
      typeof body.email === 'string' ? body.email : '',
      body.requestedRole,
      typeof body.townId === 'string' ? body.townId : undefined
    );

    if (!result.allowed) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to verify access for login.' },
      { status: 400 }
    );
  }
}