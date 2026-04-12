import { getTownById } from '@/config/towns';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

export type LiveMovie = {
  name: string;
  url: string;
  image?: string;
  position?: number;
};

type JsonLdItemList = {
  '@type'?: string;
  itemListElement?: Array<{
    name?: string;
    url?: string;
    image?: string;
    position?: number;
  }>;
};

const BOOK_MY_SHOW_BASE = 'https://in.bookmyshow.com/explore';
const execFileAsync = promisify(execFile);
const TOWN_SLUG_OVERRIDES: Record<string, string> = {
  kukatpally: 'hyderabad',
  visakhapatnam: 'visakha',
};

function normalizeTownSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function getBookMyShowTownSlugByName(townName: string): string {
  const normalizedTownName = townName.trim().toLowerCase();
  return TOWN_SLUG_OVERRIDES[normalizedTownName] ?? normalizeTownSlug(townName);
}

export function getBookMyShowMoviesUrlByTownName(townName: string): string {
  return `${BOOK_MY_SHOW_BASE}/movies-${getBookMyShowTownSlugByName(townName)}`;
}

export function getBookMyShowMoviesUrlByTownId(townId: string): string {
  const town = getTownById(townId);
  if (!town) {
    return `${BOOK_MY_SHOW_BASE}/movies-${normalizeTownSlug(townId)}`;
  }

  return getBookMyShowMoviesUrlByTownName(town.name);
}

function extractItemListJsonLd(html: string): JsonLdItemList | null {
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = jsonLdPattern.exec(html);

  while (match) {
    try {
      const parsed = JSON.parse(match[1]) as JsonLdItemList;
      if (parsed?.['@type'] === 'ItemList' && Array.isArray(parsed.itemListElement)) {
        return parsed;
      }
    } catch {
      // Ignore malformed JSON-LD blocks and continue scanning.
    }

    match = jsonLdPattern.exec(html);
  }

  return null;
}

async function fetchHtmlWithCurl(sourceUrl: string): Promise<string | null> {
  const commonArgs = [
    sourceUrl,
    '-H',
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    '-H',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '-H',
    'Accept-Language: en-IN,en;q=0.9',
    '-L',
    '--max-time',
    '30',
  ];

  const commands = ['curl', 'curl.exe'];

  for (const command of commands) {
    try {
      const { stdout } = await execFileAsync(command, commonArgs, {
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stdout?.trim()) {
        return stdout;
      }
    } catch {
      // Try next available curl command.
    }
  }

  return null;
}

export async function fetchLiveMoviesByTownName(townName: string): Promise<{
  sourceUrl: string;
  movies: LiveMovie[];
}> {
  const sourceUrl = getBookMyShowMoviesUrlByTownName(townName);

  let html = '';
  let fetchStatus: number | null = null;

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      next: { revalidate: 60 * 60 * 3 },
    });
    fetchStatus = response.status;

    if (response.ok) {
      html = await response.text();
    }
  } catch {
    // Fall back to curl-based fetch below.
  }

  if (!html) {
    html = (await fetchHtmlWithCurl(sourceUrl)) ?? '';
  }

  if (!html) {
    throw new Error('Unable to fetch BookMyShow movies right now.');
  }

  const parseMovies = (inputHtml: string) => {
    const itemList = extractItemListJsonLd(inputHtml);
    return (itemList?.itemListElement ?? [])
      .map((item) => ({
        name: item.name?.trim() ?? '',
        url: item.url?.trim() ?? '',
        image: item.image?.trim() || undefined,
        position: item.position,
      }))
      .filter((movie) => movie.name.length > 0 && movie.url.length > 0);
  };

  let movies = parseMovies(html);

  // Some production environments receive anti-bot HTML with 200 status.
  // Retry with curl before deciding that no movies are available.
  if (movies.length === 0) {
    const curlHtml = await fetchHtmlWithCurl(sourceUrl);
    if (curlHtml) {
      movies = parseMovies(curlHtml);
    }
  }

  if (movies.length === 0) {
    throw new Error(
      fetchStatus
        ? `BookMyShow response had no parseable movie list (status ${fetchStatus}).`
        : 'BookMyShow response had no parseable movie list.'
    );
  }

  return { sourceUrl, movies };
}
