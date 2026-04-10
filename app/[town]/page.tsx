import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TownPortal from '@/components/TownPortal';
import { buildTownMetadata } from '@/lib/seo';
import { getEnabledTownById, getEnabledTowns } from '@/lib/town-settings';

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
  const [selectedTown, enabledTowns] = await Promise.all([getEnabledTownById(town), getEnabledTowns()]);

  if (!selectedTown) {
    notFound();
  }

  return <TownPortal initialTownId={selectedTown.id} availableTowns={enabledTowns} />;
}