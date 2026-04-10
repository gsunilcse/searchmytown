import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModuleDefinition, getTownPublishPath, isDirectoryModuleKey } from '@/config/modules';
import { buildModuleMetadata, getModuleJsonLd, getModuleSeoContent } from '@/lib/seo';
import { getApprovedListings } from '@/lib/submissions';
import { getEnabledTownById } from '@/lib/town-settings';

type ModulePageProps = {
  params: Promise<{
    town: string;
    module: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { module, town } = await params;
  const selectedTown = await getEnabledTownById(town);
  const moduleDefinition = getModuleDefinition(module);

  if (!selectedTown || !isDirectoryModuleKey(module) || !moduleDefinition) {
    return {};
  }

  return buildModuleMetadata(selectedTown, moduleDefinition);
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { module, town } = await params;
  const selectedTown = await getEnabledTownById(town);

  if (!selectedTown || !isDirectoryModuleKey(module)) {
    notFound();
  }

  const moduleDefinition = getModuleDefinition(module);
  if (!moduleDefinition) {
    notFound();
  }

  const listings = await getApprovedListings(selectedTown.id, module);
  const seoContent = getModuleSeoContent(selectedTown, moduleDefinition);
  const moduleJsonLd = getModuleJsonLd(selectedTown, moduleDefinition, listings);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(moduleJsonLd),
        }}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{selectedTown.name}</p>
          <h1 className="mt-3 font-display text-4xl text-slate-950 sm:text-5xl">{moduleDefinition.browseTitle}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            {moduleDefinition.description} Only admin-approved entries are visible to public visitors.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${selectedTown.id}`}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Back to dashboard
          </Link>
          <Link
            href={getTownPublishPath(selectedTown.id, module)}
            className="rounded-full border border-slate-950 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            {moduleDefinition.publishTitle}
          </Link>
        </div>
      </div>

      <section className="mt-10 rounded-[1.8rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-950 sm:text-3xl">{seoContent.heading}</h2>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">{seoContent.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {seoContent.relatedSearches.map((term) => (
            <span
              key={term}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
            >
              {term}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <article id={listing.id} key={listing.id} className="rounded-[1.8rem] border border-slate-200 bg-white/92 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: `${moduleDefinition.accent}22`, color: moduleDefinition.accent }}>
                {moduleDefinition.icon}
              </span>
              <span>{selectedTown.name}</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">{listing.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{listing.summary}</p>
            {listing.description ? <p className="mt-4 text-sm leading-7 text-slate-500">{listing.description}</p> : null}

            <div className="mt-6 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div><strong className="text-slate-900">Contact:</strong> {listing.contactName}</div>
              {listing.phone ? <div><strong className="text-slate-900">Phone:</strong> {listing.phone}</div> : null}
              {listing.email ? <div><strong className="text-slate-900">Email:</strong> {listing.email}</div> : null}
              {listing.website ? <div><strong className="text-slate-900">Website:</strong> {listing.website}</div> : null}
              {listing.address ? <div><strong className="text-slate-900">Address:</strong> {listing.address}</div> : null}
            </div>
          </article>
        ))}

        {listings.length === 0 ? (
          <div className="lg:col-span-2 xl:col-span-3 rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center">
            <div className="mx-auto max-w-2xl">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl" style={{ backgroundColor: `${moduleDefinition.accent}22`, color: moduleDefinition.accent }}>
                {moduleDefinition.icon}
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">{moduleDefinition.emptyState}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Be the first to submit a {moduleDefinition.singularLabel.toLowerCase()} for {selectedTown.name}. It will appear here after admin review.
              </p>
              <Link
                href={getTownPublishPath(selectedTown.id, module)}
                className="mt-6 inline-flex rounded-full border border-slate-950 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                {moduleDefinition.publishTitle}
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}