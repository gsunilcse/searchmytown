import { notFound } from 'next/navigation';
import TownPortal from '@/components/TownPortal';
import { getTownById } from '@/config/towns';

type TownPageProps = {
  params: Promise<{
    town: string;
  }>;
};

export default async function TownPage({ params }: TownPageProps) {
  const { town } = await params;
  const selectedTown = getTownById(town);

  if (!selectedTown) {
    notFound();
  }

  return <TownPortal initialTownId={selectedTown.id} />;
}