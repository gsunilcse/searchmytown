import { NextResponse } from 'next/server';
import { createSignupRequest } from '@/lib/user-access';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      mobile?: string;
      requestedRole?: string;
      townId?: string;
    };

    if (body.requestedRole !== 'publisher' && body.requestedRole !== 'townadmin') {
      return NextResponse.json({ error: 'Choose publisher or townadmin.' }, { status: 400 });
    }

    const result = await createSignupRequest({
      name: typeof body.name === 'string' ? body.name : '',
      email: typeof body.email === 'string' ? body.email : '',
      mobile: typeof body.mobile === 'string' ? body.mobile : '',
      requestedRole: body.requestedRole,
      townId: typeof body.townId === 'string' ? body.townId : null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create the signup request.' },
      { status: 400 }
    );
  }
}