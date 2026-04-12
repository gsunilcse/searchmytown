import { NextResponse } from 'next/server';
import { isDirectoryModuleKey } from '@/config/modules';
import { isTownId } from '@/config/towns';
import { canPublish, getAppViewer } from '@/lib/auth';
import { createListing } from '@/lib/submissions';
import { isTownEnabled } from '@/lib/town-settings';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const viewer = await getAppViewer();
    if (!viewer.email) {
      return NextResponse.json({ error: 'Login is required before you can submit a publish request.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const townId = typeof body.townId === 'string' ? body.townId : '';
    const moduleKey = typeof body.moduleKey === 'string' ? body.moduleKey : '';

    if (!isTownId(townId)) {
      return NextResponse.json({ error: 'Unsupported town.' }, { status: 400 });
    }

    if (!(await isTownEnabled(townId))) {
      return NextResponse.json({ error: 'That town is not enabled for public submissions.' }, { status: 400 });
    }

    if (!canPublish(viewer, townId)) {
      return NextResponse.json({ error: 'Publisher signup approval is required for this town before you can submit a publish request.' }, { status: 403 });
    }

    if (!isDirectoryModuleKey(moduleKey)) {
      return NextResponse.json({ error: 'Unsupported module.' }, { status: 400 });
    }

    const record = await createListing({
      townId,
      moduleKey,
      title: typeof body.title === 'string' ? body.title : '',
      summary: typeof body.summary === 'string' ? body.summary : '',
      description: typeof body.description === 'string' ? body.description : '',
      contactName: typeof body.contactName === 'string' ? body.contactName : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      email: typeof body.email === 'string' ? body.email : '',
      address: typeof body.address === 'string' ? body.address : '',
      website: typeof body.website === 'string' ? body.website : '',
      helperCategory: typeof body.helperCategory === 'string' ? body.helperCategory : undefined,
      submittedByEmail: viewer.email,
      submittedByName: viewer.name ?? '',
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create submission.' },
      { status: 400 }
    );
  }
}