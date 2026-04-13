import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  HELPER_CATEGORY_DEFINITIONS,
  getModuleDefinition, 
  getTownPublishPath, 
  isDirectoryModuleKey 
} from '@/config/modules';
import { canPublish, getAppViewer } from '@/lib/auth';
import { fetchLiveMoviesByTownName, getBookMyShowMoviesUrlByTownName } from '@/lib/bookmyshow';
import { buildModuleMetadata, getModuleJsonLd, getModuleSeoContent } from '@/lib/seo';
import { getApprovedListings } from '@/lib/submissions';
import { getEnabledTownById } from '@/lib/town-settings';
import HelperPhoneLink from '@/components/HelperPhoneLink';
import { 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  Info,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  ArrowUpRight,
  User
} from 'lucide-react';

type ModulePageProps = {
  params: Promise<{
    town: string;
    module: string;
  }>;
};

function normalizeHelperText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getHelperCategoryLabel(listing: { title: string; summary: string; description: string; helperCategory?: string }): string | undefined {
  if (listing.helperCategory && HELPER_CATEGORY_DEFINITIONS.some((category) => category.label === listing.helperCategory)) {
    return listing.helperCategory;
  }

  const haystack = normalizeHelperText(`${listing.title} ${listing.summary} ${listing.description}`);

  return HELPER_CATEGORY_DEFINITIONS.find((category) =>
    category.keywords.some((keyword) => haystack.includes(normalizeHelperText(keyword)))
  )?.label;
}

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
  const isBookMyShowEmbedEnabled = process.env.ENABLE_BOOKMYSHOW_EMBED === 'true';
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
  const viewer = await getAppViewer();
  const seoContent = getModuleSeoContent(selectedTown, moduleDefinition);
  const moduleJsonLd = getModuleJsonLd(selectedTown, moduleDefinition, listings);
  const isMoviesModule = moduleDefinition.key === 'movies';
  const isHelpersModule = moduleDefinition.key === 'helpers';

  const helperListingsByCategory = isHelpersModule
    ? HELPER_CATEGORY_DEFINITIONS.map((category) => ({
        category,
        items: listings
          .filter((listing) => {
            const listingCategory = getHelperCategoryLabel(listing);
            return listingCategory === category.label && Boolean(listing.phone.trim());
          })
          .sort((left, right) => {
            const clickDelta = right.phoneClickCount - left.phoneClickCount;
            if (clickDelta !== 0) {
              return clickDelta;
            }

            return right.submittedAt.localeCompare(left.submittedAt);
          }),
      }))
    : [];
  const hasHelperContacts = helperListingsByCategory.some((categoryGroup) => categoryGroup.items.length > 0);

  let liveMoviesData: Awaited<ReturnType<typeof fetchLiveMoviesByTownName>> | null = null;
  let liveMoviesLoadError = false;

  if (isMoviesModule && isBookMyShowEmbedEnabled) {
    try {
      liveMoviesData = await fetchLiveMoviesByTownName(selectedTown.name);
    } catch {
      liveMoviesLoadError = true;
    }
  }
  
  const publishHref = canPublish(viewer, selectedTown.id)
    ? getTownPublishPath(selectedTown.id, module)
    : `/login?intent=publisher&town=${selectedTown.id}&callbackUrl=${encodeURIComponent(getTownPublishPath(selectedTown.id, module))}`;
  
  const publishLabel = canPublish(viewer, selectedTown.id)
    ? moduleDefinition.publishTitle
    : `Sign in to ${moduleDefinition.publishTitle.toLowerCase()}`;
  const bookMyShowMoviesUrl = liveMoviesData?.sourceUrl ?? getBookMyShowMoviesUrlByTownName(selectedTown.name);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(moduleJsonLd),
        }}
      />

      {/* Header Section */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-6">
            <MapPin className="h-3 w-3" />
            {selectedTown.name} directory
          </div>
          <h1 className="font-display text-5xl text-white sm:text-6xl tracking-tight leading-tight">
            {moduleDefinition.browseTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed font-medium">
            {moduleDefinition.description} <span className="text-zinc-500">Only verified, admin-approved records are featured in this official directory.</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 shrink-0">
          <Link
            href={`/${selectedTown.id}`}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-zinc-300 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          {!isMoviesModule && (
            <Link
              href={publishHref}
              className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200"
            >
              <Send className="h-4 w-4" />
              {publishLabel}
            </Link>
          )}
          {isMoviesModule && (
            <a
              href={bookMyShowMoviesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <ExternalLink className="h-4 w-4" />
              BookMyShow
            </a>
          )}
        </div>
      </div>

      {/* SEO & Context Section */}
      <section className="premium-card mt-16 p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-emerald-500 mb-6">
            <Info className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-widest">About this Directory</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug">{seoContent.heading}</h2>
          <p className="mt-4 max-w-4xl text-lg text-zinc-400 leading-relaxed">{seoContent.intro}</p>
        </div>
      </section>

      {/* Listings Grid */}
      <section className="mt-16 grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {isMoviesModule &&
          isBookMyShowEmbedEnabled &&
          (liveMoviesData?.movies ?? []).map((movie) => (
            <a
              key={movie.url}
              href={movie.url}
              target="_blank"
              rel="noopener noreferrer"
              className="premium-card group block hover:scale-[1.02] transition-all duration-300"
            >
              {movie.image && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={movie.image} alt={movie.name} className="h-64 w-full object-cover transition duration-300 group-hover:scale-105" />
                </div>
              )}
              <div className="mt-6 flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">{movie.name}</h2>
                <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
              </div>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Live from BookMyShow for {selectedTown.name}. Tap to view showtimes and book tickets.
              </p>
            </a>
          ))}

        {isMoviesModule && (!isBookMyShowEmbedEnabled || (liveMoviesData?.movies.length ?? 0) === 0) && (
          <div className="lg:col-span-2 xl:col-span-3 premium-card border-dashed py-24 text-center flex flex-col items-center">
            <div className="h-20 w-20 flex items-center justify-center rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 text-4xl mb-8">
              {moduleDefinition.icon}
            </div>
            <h2 className="text-3xl font-display text-white">
              {isBookMyShowEmbedEnabled ? 'Live movies are currently unavailable' : 'Live movies are disabled for now'}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-zinc-400 leading-relaxed font-medium">
              {isBookMyShowEmbedEnabled
                ? liveMoviesLoadError
                  ? `We could not fetch today's movie list for ${selectedTown.name} right now.`
                  : `No live movie cards were found for ${selectedTown.name} right now.`
                : 'To stay permission-safe, we are showing direct access to BookMyShow only. Once permission is approved, embedded movie cards can be switched back on.'}
            </p>
            <a
              href={bookMyShowMoviesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 group flex items-center gap-2 rounded-full bg-white px-10 py-5 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200"
            >
              Open on BookMyShow
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        )}

        {!isMoviesModule && !isHelpersModule &&
          listings.map((listing) => (
            <article id={listing.id} key={listing.id} className="premium-card group hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-zinc-500">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-xl">
                    {moduleDefinition.icon}
                  </div>
                  <span>{selectedTown.name}</span>
                </div>
                <ArrowUpRight className="h-5 w-5 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
              </div>

              <h2 className="mt-8 text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">{listing.title}</h2>
              <p className="mt-4 text-sm text-zinc-400 line-clamp-6 leading-relaxed whitespace-pre-line">{listing.summary}</p>
              {listing.description && <p className="mt-4 text-sm text-zinc-500 leading-relaxed whitespace-pre-line">{listing.description}</p>}

              <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-950/50 p-6 border border-white/5">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-zinc-600" />
                  <div className="text-xs text-zinc-300 font-bold">{listing.contactName}</div>
                </div>
                {listing.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-600" />
                    <div className="text-xs text-zinc-300">{listing.phone}</div>
                  </div>
                )}
                {listing.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-zinc-600" />
                    <div className="text-xs text-zinc-300 truncate">{listing.email}</div>
                  </div>
                )}
                {listing.website && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-emerald-500/50" />
                    <div className="text-xs text-emerald-500/80 font-bold truncate">{listing.website}</div>
                  </div>
                )}
                {listing.address && (
                  <div className="flex items-start gap-3 mt-2 border-t border-white/5 pt-4">
                    <MapPin className="h-4 w-4 text-zinc-600 mt-0.5" />
                    <div className="text-[11px] text-zinc-500 leading-relaxed">{listing.address}</div>
                  </div>
                )}
              </div>
            </article>
          ))}

        {isHelpersModule && (
          <div className="lg:col-span-2 xl:col-span-3 space-y-8">
            <div className="premium-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-950/50 to-zinc-950/80">
              <h2 className="text-3xl font-display text-white">Find trusted helpers by category</h2>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Quick contacts for {selectedTown.name}. Each category shows helper name, phone number, and village/locality.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {helperListingsByCategory.map(({ category, items }) => (
                <section
                  key={category.label}
                  className="rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(16,185,129,0.12),rgba(24,24,27,0.85)_45%,rgba(24,24,27,0.96)_100%)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {category.icon}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight">{category.label}</h3>
                  </div>

                  <div className="mt-5 space-y-3">
                    {items.length > 0 ? (
                      items.map((listing) => (
                        <HelperPhoneLink
                          key={listing.id}
                          listingId={listing.id}
                          phone={listing.phone}
                          contactName={listing.contactName || listing.title}
                          locality={listing.helperLocality || listing.address || listing.townName}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 p-4 text-xs text-zinc-500">
                        No contacts listed yet
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {!hasHelperContacts && (
              <div className="premium-card border-dashed text-center">
                <h3 className="text-xl font-bold text-white">No helper contacts are live yet</h3>
                <p className="mt-2 text-sm text-zinc-400">Be the first to publish a verified helper profile for {selectedTown.name}.</p>
              </div>
            )}
          </div>
        )}

        {!isMoviesModule && !isHelpersModule && listings.length === 0 && (
          <div className="lg:col-span-2 xl:col-span-3 premium-card border-dashed py-24 text-center flex flex-col items-center">
            <div className="h-20 w-20 flex items-center justify-center rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 text-4xl mb-8">
              {moduleDefinition.icon}
            </div>
            <h2 className="text-3xl font-display text-white">{moduleDefinition.emptyState}</h2>
            <p className="mt-4 max-w-md mx-auto text-zinc-400 leading-relaxed font-medium">
              Join the {selectedTown.name} community. Be the first to list a {moduleDefinition.singularLabel.toLowerCase()} and help others discover your services.
            </p>
            <Link
              href={publishHref}
              className="mt-10 group flex items-center gap-2 rounded-full bg-white px-10 py-5 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200"
            >
              {publishLabel}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}