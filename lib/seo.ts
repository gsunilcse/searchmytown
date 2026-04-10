import type { Metadata } from 'next';
import type { DirectoryModuleKey, ModuleDefinition } from '@/config/modules';
import type { Town } from '@/config/towns';

export const SITE_NAME = 'SearchMyTown';
export const DEFAULT_SITE_URL = 'https://searchmytown.com';
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';
export const SITE_DESCRIPTION =
  'Discover local businesses, restaurants, services, events, and community updates in your town with SearchMyTown.';

const GLOBAL_KEYWORDS = [
  'local businesses',
  'restaurants near me',
  'local services',
  'town directory',
  'business listings',
  'events in town',
  'schools in town',
  'hotels in town',
  'health services',
  'SearchMyTown',
];

const MODULE_SEARCH_TERMS: Record<
  DirectoryModuleKey,
  {
    headTerms: string[];
    nearbyTerms: string[];
    relatedTerms: string[];
    heading: string;
    intro: string;
  }
> = {
  schools: {
    headTerms: ['schools', 'colleges'],
    nearbyTerms: ['top schools near me', 'top colleges near me', 'best schools near me', 'best colleges near me'],
    relatedTerms: ['education near me', 'schools in town', 'colleges in town'],
    heading: 'Schools and colleges near you',
    intro:
      'This page is designed to help people compare schools, colleges, and education options within a specific town instead of getting mixed results from unrelated cities.',
  },
  movies: {
    headTerms: ['movies', 'theatres'],
    nearbyTerms: ['movies near me', 'theatres near me', 'cinemas near me'],
    relatedTerms: ['movie listings in town', 'cinema timings in town'],
    heading: 'Movies and theatres near you',
    intro:
      'Use this category to discover movie theatres and entertainment options tied to a single town so visitors can find nearby screenings faster.',
  },
  ads: {
    headTerms: ['business ads', 'shopping deals'],
    nearbyTerms: ['sarees near me', 'stationery near me', 'shops near me'],
    relatedTerms: ['local shopping offers', 'town business promotions', 'retail stores in town'],
    heading: 'Local shops and business offers near you',
    intro:
      'This category supports local retail discovery, including store promotions and offers that can help the site rank for product-led searches when strong listings are present.',
  },
  news: {
    headTerms: ['local news', 'town updates'],
    nearbyTerms: ['news near me', 'local updates near me'],
    relatedTerms: ['town announcements', 'local public notices'],
    heading: 'Town updates and local news',
    intro:
      'Local news pages strengthen topical relevance for a town and improve internal linking between discovery pages and community updates.',
  },
  health: {
    headTerms: ['hospitals', 'clinics'],
    nearbyTerms: ['hospitals near me', 'clinics near me', 'health services near me'],
    relatedTerms: ['doctors in town', 'hospital contacts in town'],
    heading: 'Hospitals and health services near you',
    intro:
      'This page is intended for hospital, clinic, and healthcare discovery within a town so users can find relevant medical contacts without broad, low-intent results.',
  },
  restaurants: {
    headTerms: ['restaurants', 'cafes'],
    nearbyTerms: ['restaurants near me', 'cafes near me', 'best food near me', 'top restaurants near me'],
    relatedTerms: ['places to eat in town', 'family restaurants in town'],
    heading: 'Restaurants and cafes near you',
    intro:
      'Restaurant pages are strong candidates for local SEO when they contain town-specific listings, clear business details, and internal links from the town hub.',
  },
  hotels: {
    headTerms: ['hotels', 'lodges'],
    nearbyTerms: ['hotels near me', 'lodges near me', 'stays near me'],
    relatedTerms: ['places to stay in town', 'budget hotels in town'],
    heading: 'Hotels and stays near you',
    intro:
      'This page helps visitors compare nearby stay options and supports local travel intent searches for a specific town.',
  },
  helpers: {
    headTerms: ['helpers', 'service providers'],
    nearbyTerms: ['maids near me', 'plumbers near me', 'electricians near me', 'helpers near me'],
    relatedTerms: ['local service providers', 'home services in town', 'trusted helpers in town'],
    heading: 'Helpers and service providers near you',
    intro:
      'Helper pages can rank for practical local-intent queries when listings clearly mention the service type, service area, contact details, and town served.',
  },
  travel: {
    headTerms: ['travel contacts', 'transport'],
    nearbyTerms: ['travel services near me', 'transport near me'],
    relatedTerms: ['bus contacts in town', 'travel agents in town'],
    heading: 'Travel contacts near you',
    intro:
      'Travel pages support town-based transport discovery and help users find nearby route or contact details faster.',
  },
  events: {
    headTerms: ['events', 'programs'],
    nearbyTerms: ['events near me', 'local programs near me'],
    relatedTerms: ['community events in town', 'public events in town'],
    heading: 'Events and happenings near you',
    intro:
      'Event pages make a town more crawlable around recurring searches tied to festivals, public programs, and community gatherings.',
  },
};

type BuildMetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  robots?: Metadata['robots'];
};

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  const siteUrl = configuredUrl || DEFAULT_SITE_URL;
  return siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}

export function buildMetadata({
  title,
  description,
  path = '/',
  keywords = [],
  robots,
}: BuildMetadataInput): Metadata {
  return {
    title,
    description,
    keywords: [...GLOBAL_KEYWORDS, ...keywords],
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_IN',
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} open graph image`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
    robots,
  };
}

export function buildTownMetadata(town: Town): Metadata {
  return buildMetadata({
    title: `${town.name}: local businesses, services, and updates`,
    description: `Explore restaurants, schools, events, services, business listings, and local updates in ${town.name}, ${town.state}.`,
    path: `/${town.id}`,
    keywords: [
      `${town.name} businesses`,
      `${town.name} restaurants`,
      `${town.name} services`,
      `${town.name} events`,
      `${town.name} news`,
      `${town.name} near me`,
      `best businesses in ${town.name}`,
    ],
  });
}

export function buildModuleMetadata(town: Town, moduleDefinition: ModuleDefinition): Metadata {
  const searchTerms = MODULE_SEARCH_TERMS[moduleDefinition.key];
  const specificKeywords = searchTerms.headTerms.flatMap((term) => [
    `${term} in ${town.name}`,
    `${term} near ${town.name}`,
    `${town.name} ${term}`,
  ]);

  return buildMetadata({
    title: `Best ${moduleDefinition.label} in ${town.name}`,
    description: `Browse approved ${moduleDefinition.label.toLowerCase()} for ${town.name}, ${town.state}. Find nearby options, trusted local details, and town-specific results for people searching ${searchTerms.nearbyTerms[0]}.`,
    path: `/${town.id}/${moduleDefinition.key}`,
    keywords: [
      ...specificKeywords,
      ...searchTerms.nearbyTerms,
      ...searchTerms.relatedTerms,
      `${town.state} ${moduleDefinition.label.toLowerCase()}`,
    ],
  });
}

export function buildPublishMetadata(town: Town, moduleDefinition: ModuleDefinition): Metadata {
  return buildMetadata({
    title: `Publish ${moduleDefinition.singularLabel.toLowerCase()} in ${town.name}`,
    description: `Submit ${moduleDefinition.label.toLowerCase()} information for ${town.name}. Listings are reviewed before publication on SearchMyTown.`,
    path: `/${town.id}/publish/${moduleDefinition.key}`,
    keywords: [`publish ${moduleDefinition.label.toLowerCase()} in ${town.name}`],
    robots: {
      index: false,
      follow: false,
    },
  });
}

export function getWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: SITE_DESCRIPTION,
    inLanguage: 'en-IN',
  };
}

export function getModuleSeoContent(town: Town, moduleDefinition: ModuleDefinition) {
  const searchTerms = MODULE_SEARCH_TERMS[moduleDefinition.key];

  return {
    heading: `${searchTerms.heading} in ${town.name}`,
    intro: `${searchTerms.intro} SearchMyTown focuses results on ${town.name}, ${town.state} so people looking for ${searchTerms.nearbyTerms[0]} can land on a page that matches their location intent.`,
    relatedSearches: [
      ...searchTerms.nearbyTerms,
      ...searchTerms.headTerms.map((term) => `${term} in ${town.name}`),
      ...searchTerms.headTerms.map((term) => `best ${term} in ${town.name}`),
    ],
  };
}

export function getModuleJsonLd(town: Town, moduleDefinition: ModuleDefinition, listings: Array<{
  id: string;
  title: string;
  summary: string;
  address: string;
  phone: string;
  website: string;
}>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${moduleDefinition.label} in ${town.name}`,
    url: absoluteUrl(`/${town.id}/${moduleDefinition.key}`),
    description: `Approved ${moduleDefinition.label.toLowerCase()} and nearby local options in ${town.name}, ${town.state}.`,
    about: {
      '@type': 'Thing',
      name: moduleDefinition.label,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: listings.map((listing, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/${town.id}/${moduleDefinition.key}#${listing.id}`),
        item: {
          '@type': 'LocalBusiness',
          name: listing.title,
          description: listing.summary,
          address: listing.address || undefined,
          telephone: listing.phone || undefined,
          url: listing.website || undefined,
          areaServed: `${town.name}, ${town.state}`,
        },
      })),
    },
  };
}

export function getRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(`${siteUrl}/`),
    title: {
      default: 'Discover local businesses, services, and updates',
      template: '%s | SearchMyTown',
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: GLOBAL_KEYWORDS,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: siteUrl,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_IN',
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} open graph image`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}