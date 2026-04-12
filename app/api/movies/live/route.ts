import { NextResponse } from 'next/server';
import { getTownById, isTownId } from '@/config/towns';
import { fetchLiveMoviesByTownName } from '@/lib/bookmyshow';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (process.env.ENABLE_BOOKMYSHOW_EMBED !== 'true') {
    return NextResponse.json(
      { error: 'Live movie embed is disabled until provider permission is approved.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const townId = searchParams.get('town')?.trim().toLowerCase() ?? '';

  if (!isTownId(townId)) {
    return NextResponse.json({ error: 'Unsupported town.' }, { status: 400 });
  }

  const town = getTownById(townId);
  if (!town) {
    return NextResponse.json({ error: 'Town not found.' }, { status: 404 });
  }

  try {
    const data = await fetchLiveMoviesByTownName(town.name);
    return NextResponse.json(
      {
        town: town.name,
        sourceUrl: data.sourceUrl,
        movies: data.movies,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to fetch live movies.',
        town: town.name,
      },
      { status: 502 }
    );
  }
}
