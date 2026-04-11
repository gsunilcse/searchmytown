import type { Metadata } from 'next';
import TownPortal from '@/components/TownPortal';
import { getAppViewer } from '@/lib/auth';
import { buildMetadata, getWebsiteJsonLd } from '@/lib/seo';
import { getEnabledTowns } from '@/lib/town-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Discover local businesses, restaurants, and services in your town',
  description:
    'SearchMyTown helps you explore local restaurants, businesses, schools, events, function halls, travel contacts, and services in one town-focused directory.',
  path: '/',
  keywords: ['discover local businesses', 'town directory', 'restaurants near me', 'local services in my town'],
});

export default async function Home() {
  const [enabledTowns, viewer] = await Promise.all([getEnabledTowns(), getAppViewer()]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getWebsiteJsonLd()),
        }}
      />
      <TownPortal
        initialTownId={enabledTowns.length === 1 ? enabledTowns[0]?.id ?? null : null}
        availableTowns={enabledTowns}
        viewer={viewer}
      />
    </>
  );
}
