import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import PublisherDashboard from '@/components/PublisherDashboard';
import { canPublish, getAppViewer } from '@/lib/auth';
import { getListingsBySubmitter } from '@/lib/submissions';
import { getEnabledTownById } from '@/lib/town-settings';

export const dynamic = 'force-dynamic';

type MyListingsPageProps = {
  params: Promise<{
    town: string;
  }>;
};

export async function generateMetadata({ params }: MyListingsPageProps): Promise<Metadata> {
  const { town } = await params;
  const selectedTown = await getEnabledTownById(town);

  return {
    title: selectedTown ? `My Listings - ${selectedTown.name}` : 'My Listings',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function MyListingsPage({ params }: MyListingsPageProps) {
  const { town } = await params;
  const [selectedTown, viewer] = await Promise.all([
    getEnabledTownById(town),
    getAppViewer(),
  ]);

  if (!selectedTown) {
    notFound();
  }

  if (!canPublish(viewer, selectedTown.id)) {
    redirect(`/login?intent=publisher&town=${selectedTown.id}&callbackUrl=${encodeURIComponent(`/${selectedTown.id}/my-listings`)}`);
  }

  const listings = viewer.email
    ? (await getListingsBySubmitter(viewer.email)).filter((l) => l.townId === selectedTown.id)
    : [];

  return (
    <PublisherDashboard
      initialListings={listings}
      townId={selectedTown.id}
      townName={selectedTown.name}
      publisherEmail={viewer.email ?? 'Unknown'}
    />
  );
}
