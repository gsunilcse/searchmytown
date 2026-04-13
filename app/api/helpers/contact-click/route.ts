import { NextResponse } from 'next/server';
import { incrementHelperPhoneClick } from '@/lib/submissions';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { listingId?: string };
    const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : '';

    if (!listingId) {
      return NextResponse.json({ error: 'Listing id is required.' }, { status: 400 });
    }

    const record = await incrementHelperPhoneClick(listingId);
    return NextResponse.json({ phoneClickCount: record.phoneClickCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to record helper contact click.' },
      { status: 400 }
    );
  }
}