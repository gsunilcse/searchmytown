import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TownPortal from '@/components/TownPortal';
import { getAppViewer } from '@/lib/auth';
import { buildTownMetadata } from '@/lib/seo';
import { getEnabledTownById, getEnabledTowns } from '@/lib/town-settings';
import { getApprovedArticlesForTown } from '@/lib/articles';
import { isFirestoreConfigured } from '@/lib/firestore-admin';

export const dynamic = 'force-dynamic';

type TownPageProps = {
  params: Promise<{
    town: string;
  }>;
};

export async function generateMetadata({ params }: TownPageProps): Promise<Metadata> {
  const { town } = await params;
  const selectedTown = await getEnabledTownById(town);

  if (!selectedTown) {
    return {};
  }

  return buildTownMetadata(selectedTown);
}

export default async function TownPage({ params }: TownPageProps) {
  const { town } = await params;
  const [selectedTown, enabledTowns, viewer] = await Promise.all([getEnabledTownById(town), getEnabledTowns(), getAppViewer()]);

  if (!selectedTown) {
    notFound();
  }

  const articles = isFirestoreConfigured()
    ? await getApprovedArticlesForTown(selectedTown.id).catch(() => [])
    : [];

  return <TownPortal initialTownId={selectedTown.id} availableTowns={enabledTowns} viewer={viewer} articles={articles} />;
}