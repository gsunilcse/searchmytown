'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { getTownModulePath, getTownPublishPath } from '@/config/modules';
import type { AppViewer } from '@/lib/auth';
import {
  getTownPath,
  NAV_CATEGORIES,
  QUICK_CARDS,
  type NavCategory,
  type Town,
} from '@/config/towns';

type TownPortalProps = {
  initialTownId?: string | null;
  availableTowns: Town[];
  viewer: AppViewer;
};

type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
  stats: string[];
};

type NewsItem = {
  title: string;
  tag: string;
  time: string;
};

const moduleDescriptions: Record<string, string> = {
  schools: 'Browse schools, colleges, and publish verified institution details for your town.',
  news: 'See approved local headlines, updates, announcements, and community stories.',
  ads: 'Discover promotions, offers, and business advertisements relevant to your area.',
  health: 'Access hospitals, clinics, and essential healthcare contacts close to you.',
  movies: 'Check theatres, entertainment listings, and local event schedules.',
  restaurants: 'Find places to eat, compare options, and publish restaurant details.',
  hotels: 'Compare hotels, lodges, and stay options reviewed for your town.',
  travel: 'Explore transport contacts and town-to-town travel information.',
  helpers: 'Connect with helpers, technicians, and service providers near your locality.',
  events: 'Track local celebrations, public notices, and community happenings.',
};

function getNavItemHref(townId: string, item: NavCategory['items'][number]): string {
  return item.action === 'publish'
    ? getTownPublishPath(townId, item.moduleKey)
    : getTownModulePath(townId, item.moduleKey);
}

function getTownLoginPath(townId: string): string {
  return `/login?town=${encodeURIComponent(townId)}`;
}

function buildHeroSlides(town: Town): HeroSlide[] {
  return [
    {
      eyebrow: 'Town dashboard',
      title: `Welcome to ${town.name}`,
      description: `A single local portal for news, schools, business ads, food, health services, and trusted helpers in ${town.name}.`,
      accent: 'from-[#2a3338] via-[#1f272c] to-[#151c20]',
      glow: 'rgba(16, 24, 29, 0.34)',
      stats: ['Town-specific discovery', 'Fast location-based access', `${town.state} coverage`],
    },
    {
      eyebrow: 'Publish and explore',
      title: `Local businesses and services for ${town.name}`,
      description: 'Surface restaurants, shopping deals, travel contacts, and community listings with clear category entry points.',
      accent: 'from-[#4b5563] via-[#2f3540] to-[#18181b]',
      glow: 'rgba(82, 82, 91, 0.28)',
      stats: ['Business ads', 'Restaurant directory', 'Travel contacts'],
    },
    {
      eyebrow: 'Community updates',
      title: `Stay connected with what matters in ${town.name}`,
      description: 'Follow local news, events, healthcare options, and everyday essentials without leaving the town context.',
      accent: 'from-[#475258] via-[#2f383d] to-[#1b2227]',
      glow: 'rgba(80, 92, 98, 0.3)',
      stats: ['Live local news', 'Health access', 'Events and notices'],
    },
  ];
}

function buildNews(town: Town): NewsItem[] {
  return [
    {
      tag: 'Latest news',
      title: `${town.name} dashboard is ready for approved local updates and announcements.`,
      time: 'Just now',
    },
    {
      tag: 'Education',
      title: `Schools and education listings in ${town.name} can be surfaced through the town-specific publish flow.`,
      time: 'Today',
    },
    {
      tag: 'Business',
      title: `Business ads, restaurants, and helper services can be moderated and shown only for ${town.name}.`,
      time: 'This week',
    },
  ];
}

function buildTownStory() {
  return [
    {
      label: 'Schools',
      value: 'Town-based school discovery and publishing.',
    },
    {
      label: 'Local services',
      value: 'Food, helpers, travel, health, and business listings tied to one location.',
    },
    {
      label: 'Moderation-ready',
      value: 'Designed for admin approval and serviceability management per town.',
    },
  ];
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const originLat = toRadians(from.lat);
  const destinationLat = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(originLat) * Math.cos(destinationLat);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestTown(latitude: number, longitude: number, availableTowns: Town[]): Town | null {
  const townsWithCoords = availableTowns.filter((town) => town.coords);
  if (townsWithCoords.length === 0) {
    return null;
  }

  return townsWithCoords.reduce<Town | null>((closestTown, town) => {
    if (!town.coords) {
      return closestTown;
    }

    if (!closestTown?.coords) {
      return town;
    }

    const currentDistance = getDistanceInKm({ lat: latitude, lng: longitude }, town.coords);
    const closestDistance = getDistanceInKm({ lat: latitude, lng: longitude }, closestTown.coords);
    return currentDistance < closestDistance ? town : closestTown;
  }, null);
}

function CategoryMenu({
  category,
  townId,
  active,
  onOpen,
  onClose,
}: {
  category: NavCategory;
  townId: string;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="relative shrink-0 pb-3"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white 2xl:h-10 2xl:gap-2 2xl:px-3 2xl:text-[13px]"
        onFocus={onOpen}
        onClick={onOpen}
        aria-expanded={active}
      >
        <span>{category.icon}</span>
        <span>{category.label}</span>
        <span className="text-[9px] text-white/70 2xl:text-[10px]">▼</span>
      </button>

      {active ? (
        <div className="absolute left-0 top-full z-30 w-64 pt-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(16,24,29,0.18)]">
            <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {category.label}
            </div>
            <div className="space-y-1 px-2 pb-2">
              {category.items.map((item) => (
                <Link
                  key={item.label}
                  href={getNavItemHref(townId, item)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TownPortal({ initialTownId = null, availableTowns, viewer }: TownPortalProps) {
  const router = useRouter();
  const [activeTownId, setActiveTownId] = useState<string | null>(initialTownId);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(initialTownId === null && availableTowns.length > 1);
  const [locationQuery, setLocationQuery] = useState('');
  const [detectMessage, setDetectMessage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const deferredQuery = useDeferredValue(locationQuery);

  const selectedTown = useMemo(() => {
    if (activeTownId) {
      return availableTowns.find((town) => town.id === activeTownId) ?? availableTowns[0] ?? null;
    }

    return availableTowns[0] ?? null;
  }, [activeTownId, availableTowns]);

  const filteredTowns = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return availableTowns;
    }

    return availableTowns.filter((town) => {
      const haystack = `${town.name} ${town.state}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [availableTowns, deferredQuery]);

  const heroSlides = useMemo(() => (selectedTown ? buildHeroSlides(selectedTown) : []), [selectedTown]);
  const newsItems = useMemo(() => (selectedTown ? buildNews(selectedTown) : []), [selectedTown]);
  const storyItems = useMemo(() => buildTownStory(), []);
  const canAccessAdminWorkspace = viewer.roles.includes('townadmin') || viewer.roles.includes('super-admin');
  const visibleCategories = useMemo(
    () => {
      if (!selectedTown) {
        return NAV_CATEGORIES.map((category) => ({
          ...category,
          items: category.items.filter((item) => item.action === 'browse'),
        }));
      }

      const canPublishForSelectedTown = viewer.roles.includes('publisher') && viewer.publisherTownIds.includes(selectedTown.id);

      return NAV_CATEGORIES.map((category) => ({
        ...category,
        items: category.items.filter((item) => item.action === 'browse' || canPublishForSelectedTown),
      }));
    },
    [selectedTown, viewer.publisherTownIds, viewer.roles]
  );

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  function navigateToTown(townId: string) {
    setActiveTownId(townId);
    setIsLocationModalOpen(false);
    setLocationQuery('');
    setDetectMessage(null);
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setActiveSlideIndex(0);
    startTransition(() => {
      router.push(getTownPath(townId));
    });
  }

  async function handleSignOut() {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    await signOut({ callbackUrl: getTownPath(selectedTown?.id ?? availableTowns[0]?.id ?? '') || '/' });
  }

  function handleDetectCurrentLocation() {
    if (!navigator.geolocation) {
      setDetectMessage('Location access is not supported in this browser.');
      return;
    }

    setIsDetecting(true);
    setDetectMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearestTown = findNearestTown(position.coords.latitude, position.coords.longitude, availableTowns);
        setIsDetecting(false);

        if (!nearestTown) {
          setDetectMessage('No serviceable town was found for your current coordinates.');
          return;
        }

        navigateToTown(nearestTown.id);
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setDetectMessage('Location permission was denied. Choose a town manually.');
          return;
        }

        setDetectMessage('Unable to detect your current location right now.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  if (!selectedTown) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20 text-center">
        <h1 className="font-display text-4xl text-slate-950">No towns are enabled right now</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          Enable at least one town in the admin panel before publishing the public directory.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-slate-950 bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Login / Signup
          </Link>
        </div>
      </main>
    );
  }

  const activeSlide = heroSlides[activeSlideIndex] ?? heroSlides[0];

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(161,161,170,0.14),_transparent_24%),linear-gradient(180deg,_#fafafa_0%,_#f3f4f6_42%,_#ededed_100%)] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-black/18 bg-[linear-gradient(90deg,_#222b30_0%,_#293238_38%,_#232c31_100%)] shadow-[0_16px_45px_rgba(16,24,29,0.22)] backdrop-blur-xl">
        <div className="w-full px-2 py-3 sm:px-3 lg:px-4">
          <div className="flex items-center justify-between gap-4 xl:grid xl:grid-cols-[minmax(190px,240px)_minmax(0,1fr)_auto] xl:items-center xl:gap-4 2xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_auto] 2xl:gap-6">
            <div className="flex min-w-0 shrink-0 items-center gap-3 xl:min-w-[190px] 2xl:min-w-[220px]">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/8 text-lg text-white shadow-inner shadow-black/10 ring-1 ring-white/10">
                🔎
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold tracking-[0.12em] text-slate-300 sm:text-sm">searchmytown.com</div>
                <div className="max-w-[10rem] text-sm font-semibold leading-5 text-white sm:max-w-[15rem] sm:text-base xl:max-w-[12rem] 2xl:max-w-none">
                  {selectedTown.name}, {selectedTown.state}
                </div>
              </div>
            </div>

            <div className="hidden min-w-0 xl:block">
              <div className="flex min-w-0 items-center justify-start gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden 2xl:justify-center 2xl:gap-1.5 2xl:px-2">
                {visibleCategories.map((category) => (
                  <CategoryMenu
                    key={category.label}
                    category={category}
                    townId={selectedTown.id}
                    active={activeMenu === category.label}
                    onOpen={() => setActiveMenu(category.label)}
                    onClose={() => setActiveMenu((currentValue) => (currentValue === category.label ? null : currentValue))}
                  />
                ))}
              </div>
            </div>

            <div className="hidden shrink-0 items-center justify-end gap-2 xl:flex xl:min-w-[118px] 2xl:min-w-[132px]">
              {viewer.isAuthenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((value) => !value)}
                    suppressHydrationWarning
                    className="shrink-0 whitespace-nowrap rounded-full border border-slate-500 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 hover:text-slate-950 2xl:px-4 2xl:py-2.5"
                  >
                    Account
                  </button>

                  {accountMenuOpen ? (
                    <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(16,24,29,0.18)]">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Signed in</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{viewer.email}</div>
                      </div>
                      <div className="space-y-1 p-2">
                        {canAccessAdminWorkspace ? (
                          <Link
                            href="/admin"
                            onClick={() => setAccountMenuOpen(false)}
                            className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            Open moderation workspace
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleSignOut()}
                          suppressHydrationWarning
                          className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                        >
                          Log out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  href={getTownLoginPath(selectedTown.id)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-slate-500 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 hover:text-slate-950 2xl:px-4 2xl:py-2.5"
                >
                  Login / Signup
                </Link>
              )}
            </div>

            <button
              type="button"
              className="ml-auto grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/12 text-xl text-white xl:hidden"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? '×' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-white/15 px-4 pb-4 xl:hidden">
            <div className="space-y-3 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {availableTowns.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white"
                  >
                    Change town: {selectedTown.name}
                  </button>
                ) : null}
                {viewer.isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((value) => !value)}
                    suppressHydrationWarning
                    className={`block rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 ${availableTowns.length > 1 ? '' : 'sm:col-span-2'}`}
                  >
                    Account
                  </button>
                ) : (
                  <Link
                    href={getTownLoginPath(selectedTown.id)}
                    className={`block rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 ${availableTowns.length > 1 ? '' : 'sm:col-span-2'}`}
                  >
                    Login / Signup
                  </Link>
                )}
              </div>
              {viewer.isAuthenticated && accountMenuOpen ? (
                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <div className="rounded-2xl bg-white px-4 py-4 text-slate-900">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Signed in</div>
                    <div className="mt-2 text-sm font-semibold">{viewer.email}</div>
                    <div className="mt-4 space-y-2">
                      {canAccessAdminWorkspace ? (
                        <Link
                          href="/admin"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            setMobileMenuOpen(false);
                          }}
                          className="block rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900"
                        >
                          Open moderation workspace
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        suppressHydrationWarning
                        className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3">
                {visibleCategories.map((category) => (
                  <details key={category.label} className="overflow-hidden rounded-2xl bg-white/10">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white">
                      <span className="mr-2">{category.icon}</span>
                      {category.label}
                    </summary>
                    <div className="space-y-1 px-2 pb-2">
                      {category.items.map((item) => (
                        <Link
                          key={item.label}
                          href={getNavItemHref(selectedTown.id, item)}
                          className="block rounded-xl px-3 py-3 text-sm text-white/92 transition hover:bg-white/10"
                        >
                          {item.icon} {item.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className={isLocationModalOpen ? 'pointer-events-none select-none blur-[3px]' : ''}>
        <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Town-first experience</p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Welcome to {selectedTown.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Explore approved local content, browse services by category, and publish community information for {selectedTown.name}, {selectedTown.state}.
              </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_30px_80px_rgba(16,24,29,0.1)] backdrop-blur-xl sm:p-7">
            <div
              className={`relative min-h-[420px] overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${activeSlide.accent} p-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] sm:min-h-[500px] sm:p-10`}
              style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 36px 70px ${activeSlide.glow}` }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.34),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.2),transparent_18%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.16),transparent_20%)]" />
              <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute left-1/2 top-10 hidden -translate-x-1/2 rounded-full border border-white/12 bg-black/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.36em] text-slate-200 sm:block">
                {selectedTown.name} portal preview
              </div>

              <div className="relative flex h-full flex-col justify-between gap-8">
                <div className="max-w-2xl">
                  <span className="inline-flex rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
                    {activeSlide.eyebrow}
                  </span>
                  <h2 className="mt-6 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
                    {activeSlide.title}
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-8 text-white/88 sm:text-lg">
                    {activeSlide.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {activeSlide.stats.map((stat) => (
                    <div key={stat} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Focus</div>
                      <div className="mt-2 text-lg font-semibold text-white">{stat}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {heroSlides.map((slide, index) => (
                      <button
                        key={slide.title}
                        type="button"
                        className={`h-3 rounded-full transition ${index === activeSlideIndex ? 'w-10 bg-white' : 'w-3 bg-white/35'}`}
                        onClick={() => setActiveSlideIndex(index)}
                        aria-label={`Show slide ${index + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/12 text-lg font-semibold text-white transition hover:bg-white/20"
                      onClick={() => setActiveSlideIndex((currentIndex) => (currentIndex - 1 + heroSlides.length) % heroSlides.length)}
                      aria-label="Previous slide"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/12 text-lg font-semibold text-white transition hover:bg-white/20"
                      onClick={() => setActiveSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length)}
                      aria-label="Next slide"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_26px_70px_rgba(16,24,29,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between bg-[linear-gradient(90deg,_#20292e_0%,_#273137_52%,_#1f272c_100%)] px-5 py-4 text-white">
                <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em]">
                  <span>📰</span>
                  <span>Latest news</span>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Live updates</div>
              </div>
              <div className="space-y-4 p-5">
                {newsItems.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 transition hover:border-slate-300 hover:bg-slate-100/80">
                    <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                      <span>{item.tag}</span>
                      <span className="text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.title}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {storyItems.map((item) => (
                <div key={item.label} className="rounded-[1.6rem] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_45px_rgba(16,24,29,0.06)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_26px_70px_rgba(16,24,29,0.08)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Quick access</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-slate-950 sm:text-4xl">
                  Explore {selectedTown.name} by module
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                The platform is structured to show only town-relevant records across schools, movies, business ads, news, health, restaurants, helpers, travel, and events.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {QUICK_CARDS.map((card) => (
                <Link
                  key={card.label}
                  href={getTownModulePath(selectedTown.id, card.moduleKey)}
                  className="group rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(244,244,245,0.98)_100%)] p-5 shadow-[0_20px_55px_rgba(16,24,29,0.07)] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_65px_rgba(82,82,91,0.12)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="grid h-14 w-14 place-items-center rounded-2xl text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                        style={{ backgroundColor: `${card.color}22`, color: card.color }}
                      >
                        {card.icon}
                      </div>
                      <h3 className="mt-5 text-xl font-semibold text-slate-900">{card.label}</h3>
                    </div>
                    <span className="text-2xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">→</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{moduleDescriptions[card.moduleKey] ?? card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_#111111_0%,_#27272a_45%,_#3f3f46_100%)] p-6 text-white shadow-[0_30px_85px_rgba(16,24,29,0.18)] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Functional flow</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">How the town experience is meant to work</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/74 sm:text-base">
                  Users choose or detect a town first. The application then shows only approved local records and offers publishing flows for supported modules with moderation-ready handoff.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  'Select or detect a town on entry.',
                  'Render town-filtered approved content.',
                  'Allow publishing for schools, ads, food, travel, helpers, and more.',
                  'Support review and serviceability management by admin.',
                ].map((step, index) => (
                  <div key={step} className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Step 0{index + 1}</div>
                    <p className="mt-3 text-sm leading-7 text-white/86">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {isLocationModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/38 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_36px_110px_rgba(15,23,42,0.24)]">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Select location</p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-slate-950">Choose your town</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    Detect your current location or choose a town manually to load town-specific schools, businesses, events, food, health, travel, and helper information.
                  </p>
                </div>
                {initialTownId ? (
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 text-xl text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                    onClick={() => setIsLocationModalOpen(false)}
                    aria-label="Close location chooser"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  disabled={isDetecting}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(17,17,17,0.24)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {isDetecting ? 'Detecting current location...' : 'Detect current location'}
                </button>
                <input
                  type="search"
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder="Search town or state"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:bg-white"
                />
              </div>

              {detectMessage ? <p className="mt-4 text-sm text-slate-700">{detectMessage}</p> : null}
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 py-6 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTowns.map((town) => (
                  <button
                    key={town.id}
                    type="button"
                    onClick={() => navigateToTown(town.id)}
                    className="rounded-[1.4rem] border border-slate-200 bg-white p-4 text-left shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-[0_18px_36px_rgba(17,17,17,0.12)]"
                  >
                    <div className="text-base font-semibold text-slate-900">{town.name}</div>
                    <div className="mt-2 text-sm text-slate-500">{town.state}</div>
                  </button>
                ))}
              </div>

              {filteredTowns.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  No towns matched your search. Try another name or detect your current location.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}