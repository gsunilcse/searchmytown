import { NextResponse } from 'next/server';
import { getAppViewer } from '@/lib/auth';
import { isDirectoryModuleKey, type DirectoryModuleKey } from '@/config/modules';
import { updateListingAvailability } from '@/lib/submissions';

export const runtime = 'nodejs';

type RouteContext<T extends string> = {
  params: Promise<Record<string, string>>;
};

export async function POST(
  request: Request,
  context: RouteContext<'/api/listings/[moduleKey]/[id]/availability'>
): Promise<Response> {
  try {
    const { moduleKey: rawModuleKey, id } = await context.params;

    if (!isDirectoryModuleKey(rawModuleKey)) {
      return NextResponse.json({ error: 'Invalid module.' }, { status: 400 });
    }

    const moduleKey = rawModuleKey as DirectoryModuleKey;
    const viewer = await getAppViewer();

    if (!viewer?.email) {
      return NextResponse.json({ error: 'Please log in to update availability.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      availability?: Record<string, 'available' | 'booked'>;
    };

    if (!body.availability || typeof body.availability !== 'object') {
      return NextResponse.json(
        { error: 'Availability data is required.' },
        { status: 400 }
      );
    }

    // Validate availability format
    for (const [date, status] of Object.entries(body.availability)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }

      if (status !== 'available' && status !== 'booked') {
        return NextResponse.json(
          { error: 'Status must be either "available" or "booked".' },
          { status: 400 }
        );
      }
    }

    const updated = await updateListingAvailability(
      moduleKey,
      id,
      viewer.email,
      body.availability
    );

    return NextResponse.json({ success: true, availability: updated.availability });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update availability.';

    if (message.includes('permission')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found') || message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
