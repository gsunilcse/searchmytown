'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  ChevronDown, 
  LogOut, 
  User, 
  Settings, 
  Menu, 
  X, 
  ArrowRight,
  TrendingUp,
  Newspaper,
  Info,
  ExternalLink,
  ChevronRight,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  stats: { label: string; value: string }[];
};

type NewsItem = {
  title: string;
  tag: string;
  time: string;
};

const moduleDescriptions: Record<string, string> = {
  schools: 'Verified local schools and institution details.',
  news: 'Latest headlines and official announcements.',
  ads: 'Top business deals and local advertisements.',
  health: 'Nearby hospitals and essential health contacts.',
  movies: 'Theatres, events, and local entertainment.',
  restaurants: 'The best local food and dining spots.',
  hotels: 'Stay options and travel accommodations.',
  travel: 'Public transport and local travel guides.',
  helpers: 'Trusted technicians and service providers.',
  events: 'Community celebrations and public notices.',
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
      eyebrow: 'Local Insight',
      title: `The heart of ${town.name}`,
      description: `Your central hub for verified news, schools, business ads, and health services in ${town.name}.`,
      accent: 'from-emerald-600/20 via-zinc-900 to-zinc-950',
      glow: 'rgba(16, 185, 129, 0.2)',
      stats: [
        { label: 'Coverage', value: 'Town-wide' },
        { label: 'Access', value: 'Instant' },
        { label: 'State', value: town.state },
      ],
    },
    {
      eyebrow: 'Marketplace',
      title: 'Business & Discoveries',
      description: 'Explore curated local restaurants, shopping deals, and professional services tailored for your neighborhood.',
      accent: 'from-amber-600/20 via-zinc-900 to-zinc-950',
      glow: 'rgba(245, 158, 11, 0.2)',
      stats: [
        { label: 'Verified', value: '100%' },
        { label: 'Categories', value: 'Direct' },
        { label: 'Focus', value: 'Local' },
      ],
    },
    {
      eyebrow: 'Connection',
      title: 'Community First',
      description: 'Stay updated with live news, healthcare alerts, and essential events without losing touch with your roots.',
      accent: 'from-blue-600/20 via-zinc-900 to-zinc-950',
      glow: 'rgba(59, 130, 246, 0.2)',
      stats: [
        { label: 'Updates', value: 'Real-time' },
        { label: 'Support', value: '24/7' },
        { label: 'Events', value: 'Local' },
      ],
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
      className="relative shrink-0"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className={cn(
          "group flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-sm font-medium transition-all duration-300",
          active 
            ? "bg-white/10 text-white" 
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
        )}
        onFocus={onOpen}
        aria-expanded={active}
      >
        <span className="text-xl transition-transform duration-300 group-hover:scale-110">{category.icon}</span>
        <span className="hidden 2xl:inline">{category.label}</span>
        <ChevronDown className={cn("h-3 w-3 opacity-50 transition-transform duration-300", active && "rotate-180")} />
      </button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full z-30 w-72 pt-3"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-xl">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {category.label}
              </div>
              <div className="grid gap-1">
                {category.items.map((item) => (
                  <Link
                    key={item.label}
                    href={getNavItemHref(townId, item)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-[2.5rem] p-12"
        >
          <h1 className="font-display text-4xl text-white">No towns are enabled right now</h1>
          <p className="mt-4 text-base leading-8 text-zinc-400">
            Enable at least one town in the admin panel before publishing the public directory.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 hover:scale-105"
            >
              <User className="h-4 w-4" />
              Login / Signup
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  const activeSlide = heroSlides[activeSlideIndex] ?? heroSlides[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
      <div className="bg-mesh pointer-events-none" />
      
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Town Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 p-2.5 shadow-lg shadow-emerald-500/20">
                <Search className="h-full w-full text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">searchmytown.com</div>
                <button 
                  onClick={() => setIsLocationModalOpen(true)}
                  className="group flex items-center gap-1.5 text-lg font-bold transition-colors hover:text-emerald-400"
                >
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <span>{selectedTown.name}, {selectedTown.state}</span>
                  <ChevronDown className="h-3 w-3 text-zinc-500 transition-transform group-hover:translate-y-0.5" />
                </button>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden flex-1 justify-center lg:flex">
              <nav className="flex items-center gap-1">
                {visibleCategories.map((category) => (
                  <CategoryMenu
                    key={category.label}
                    category={category}
                    townId={selectedTown.id}
                    active={activeMenu === category.label}
                    onOpen={() => setActiveMenu(category.label)}
                    onClose={() => setActiveMenu((curr) => (curr === category.label ? null : curr))}
                  />
                ))}
              </nav>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {viewer.isAuthenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium transition-all hover:bg-white/10"
                  >
                    <User className="h-4 w-4 text-zinc-400" />
                    <span>Account</span>
                    <ChevronDown className={cn("h-3 w-3 text-zinc-500 transition-transform", accountMenuOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {accountMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full z-50 mt-3 w-72"
                      >
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl">
                          <div className="border-b border-white/5 bg-white/5 px-4 py-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Signed in as</div>
                            <div className="mt-1 truncate font-medium text-white">{viewer.email}</div>
                          </div>
                          <div className="p-2">
                            {canAccessAdminWorkspace && (
                              <Link
                                href="/admin"
                                onClick={() => setAccountMenuOpen(false)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                              >
                                <Settings className="h-4 w-4" />
                                Admin Console
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleSignOut()}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                            >
                              <LogOut className="h-4 w-4" />
                              Log out
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href={getTownLoginPath(selectedTown.id)}
                  className="rounded-full bg-white px-5 py-2 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-105"
                >
                  Join Community
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 lg:hidden"
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/5 bg-zinc-900/50 xl:hidden"
            >
              <div className="space-y-4 p-4">
                <div className="grid gap-2">
                  {visibleCategories.map((category) => (
                    <details key={category.label} className="group overflow-hidden rounded-xl border border-white/5 bg-white/5">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-1 border-t border-white/5 p-1 bg-black/20">
                        {category.items.map((item) => (
                          <Link
                            key={item.label}
                            href={getNavItemHref(selectedTown.id, item)}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-zinc-400 hover:text-white"
                          >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className={cn("transition-all duration-500", isLocationModalOpen && "blur-xl scale-95 origin-center")}>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="min-w-0"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  Town Directory 2.0
                </div>
                <h1 className="mt-6 font-display text-4xl leading-[1.1] text-white sm:text-6xl lg:text-7xl break-words hyphens-auto">
                  Discover the soul of <span className="text-emerald-500">{selectedTown.name}</span>
                </h1>
                <p className="mt-8 text-lg leading-relaxed text-zinc-400 sm:text-xl">
                  The ultimate local platform. Explore approved institutions, verified businesses, and live community updates in {selectedTown.name}, {selectedTown.state}.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <button 
                    onClick={() => document.getElementById('browse-modules')?.scrollIntoView({ behavior: 'smooth' })}
                    className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-105"
                  >
                    Start Exploring
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button 
                    onClick={() => setIsLocationModalOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold transition-all hover:bg-white/10"
                  >
                    Change Town
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative min-w-0 lg:ml-auto w-full max-w-2xl"
              >
                <div className="premium-card relative z-10 p-2 sm:p-4 overflow-hidden">
                  <div className={cn("relative min-h-[400px] overflow-hidden rounded-[1.5rem] bg-gradient-to-br p-8 transition-all duration-1000", activeSlide.accent)}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSlide.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative flex h-full flex-col justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">{activeSlide.eyebrow}</span>
                          <h2 className="mt-4 font-display text-3xl sm:text-4xl text-white">{activeSlide.title}</h2>
                          <p className="mt-4 max-w-md text-sm text-white/70 leading-relaxed">{activeSlide.description}</p>
                        </div>

                        <div className="mt-12 grid grid-cols-3 gap-3">
                          {activeSlide.stats.map((stat) => (
                            <div key={stat.label} className="rounded-xl bg-white/5 p-3 backdrop-blur-md border border-white/10">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">{stat.label}</div>
                              <div className="mt-1 text-sm font-bold text-white">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation Dots */}
                    <div className="absolute bottom-8 left-8 flex gap-1.5">
                      {heroSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlideIndex(idx)}
                          className={cn(
                            "h-1 rounded-full transition-all duration-500",
                            idx === activeSlideIndex ? "w-8 bg-white" : "w-2 bg-white/20 hover:bg-white/40"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Decorative glows */}
                <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />
                <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Quick Access Grid */}
        <section id="browse-modules" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between px-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">Service Directory</div>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl">Explore by Categories</h2>
            </div>
            <p className="max-w-xl text-zinc-400">
              Direct access to town-filtered records across all major sectors. We only show what is relevant to {selectedTown.name}.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {QUICK_CARDS.map((card, idx) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  href={getTownModulePath(selectedTown.id, card.moduleKey)}
                  style={{'--card-glow': `${card.color}22`} as any}
                  className="group premium-card block h-full relative"
                >
                  <div 
                    className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner"
                    style={{ backgroundColor: `${card.color}20`, color: card.color }}
                  >
                    <span className="text-3xl">{card.icon}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold transition-colors group-hover:text-emerald-400">{card.label}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-500 line-clamp-2">
                    {moduleDescriptions[card.moduleKey] ?? card.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                    Browse Records <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Updates Section */}
        <section className="bg-zinc-900/30 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
              <div>
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-[0.2em]">
                  <Newspaper className="h-4 w-4" />
                  Intelligence Feed
                </div>
                <h2 className="mt-4 font-display text-4xl">Latest from {selectedTown.name}</h2>
                
                <div className="mt-12 space-y-4">
                  {newsItems.map((item, idx) => (
                    <motion.article 
                      key={idx}
                      whileHover={{ x: 10 }}
                      className="group flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-6 transition-all hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">{item.tag}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{item.time}</span>
                      </div>
                      <p className="text-lg text-zinc-200 font-medium group-hover:text-white">{item.title}</p>
                    </motion.article>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="premium-card bg-emerald-500/5 border-emerald-500/20">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <Info className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Town Story</span>
                  </div>
                  <div className="mt-8 space-y-6">
                    {storyItems.map((story) => (
                      <div key={story.label}>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{story.label}</div>
                        <div className="mt-2 text-sm text-zinc-300 font-medium leading-relaxed">{story.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-card bg-zinc-900 border-white/5">
                  <h4 className="text-sm font-bold">Admin Controls</h4>
                  <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                    Designed for town-specific moderation and localized growth.
                  </p>
                  <Link 
                    href="/admin" 
                    className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-4 text-xs font-bold transition-all hover:bg-white/10"
                  >
                    Manage Town <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer / CTA */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div 
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.95 }}
            viewport={{ once: true }}
            className="rounded-[3rem] bg-gradient-to-tr from-zinc-900 to-zinc-950 p-12 text-center border border-white/5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-96 w-96 bg-emerald-500/5 blur-[100px]" />
            <div className="relative z-10">
              <h2 className="font-display text-4xl sm:text-5xl leading-tight">Ready to join the local <br /> <span className="text-emerald-500">ecosystem?</span></h2>
              <p className="mt-6 mx-auto max-w-2xl text-zinc-400">
                Whether you want to browse or publish, searchmytown.com is built for verified local connections. No noise, just your town.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link 
                  href="/login" 
                  className="rounded-full bg-white px-10 py-4 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200"
                >
                  Create Account
                </Link>
                <button 
                  onClick={() => setIsLocationModalOpen(true)}
                  className="rounded-full border border-white/10 bg-white/5 px-10 py-4 text-sm font-bold transition-all hover:bg-white/10"
                >
                  Switch Town
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Location Selector Modal */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => initialTownId && setIsLocationModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900 shadow-2xl"
            >
              <div className="flex h-full flex-col lg:flex-row">
                {/* Left side: branding/info */}
                <div className="hidden w-1/3 bg-emerald-600 p-8 lg:block relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
                  <div className="relative z-10">
                    <Navigation className="h-12 w-12 text-white/40" />
                    <h3 className="mt-8 font-display text-3xl text-white">Find your town</h3>
                    <p className="mt-4 text-sm text-emerald-100 leading-relaxed">
                      We organize data town by town to give you the most relevant local experience.
                    </p>
                  </div>
                </div>

                {/* Right side: search/grid */}
                <div className="flex-1 p-6 sm:p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Location Selector</div>
                      <h2 className="mt-2 font-display text-3xl">Select Town</h2>
                    </div>
                    {initialTownId && (
                      <button 
                        onClick={() => setIsLocationModalOpen(false)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      disabled={isDetecting}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold text-zinc-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {isDetecting ? 'Detecting...' : <><Navigation className="h-4 w-4" /> Near Me</>}
                    </button>
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="search"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="Search town or state..."
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500 focus:bg-white/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {detectMessage && (
                    <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs font-medium text-red-400 border border-red-400/20">
                      {detectMessage}
                    </div>
                  ) }

                  <div className="mt-8 grid max-h-[40vh] gap-3 overflow-y-auto pr-2 grid-cols-1 sm:grid-cols-2">
                    {filteredTowns.map((town) => (
                      <button
                        key={town.id}
                        onClick={() => navigateToTown(town.id)}
                        className="group flex flex-col items-start rounded-2xl border border-white/5 bg-white/5 p-5 text-left transition-all hover:bg-emerald-500 hover:border-emerald-400"
                      >
                        <div className="font-bold text-white group-hover:text-zinc-950">{town.name}</div>
                        <div className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-950/70">{town.state}</div>
                      </button>
                    ))}
                    
                    {filteredTowns.length === 0 && (
                      <div className="col-span-full py-20 text-center">
                        <MapPin className="mx-auto h-12 w-12 text-zinc-800" />
                        <p className="mt-4 text-zinc-500">No towns matched your search.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}