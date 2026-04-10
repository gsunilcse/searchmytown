import type { DirectoryModuleKey } from '@/config/modules';

export type Town = {
  id: string;
  name: string;
  state: string;
  enabled: boolean;
  coords?: { lat: number; lng: number };
};

export type NavCategory = {
  label: string;
  icon: string;
  color: string;
  items: Array<{
    label: string;
    icon: string;
    moduleKey: DirectoryModuleKey;
    action: 'browse' | 'publish';
  }>;
};

export type QuickCard = {
  label: string;
  icon: string;
  color: string;
  description: string;
  moduleKey: DirectoryModuleKey;
};

/** Default towns loaded when Firestore is not configured / as fallback */
export const DEFAULT_TOWNS: Town[] = [
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', enabled: false, coords: { lat: 17.385, lng: 78.4867 } },
  { id: 'ramachandrapuram', name: 'Ramachandrapuram', state: 'Andhra Pradesh', enabled: true, coords: { lat: 16.8363, lng: 82.0254 } },
  { id: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh', enabled: false, coords: { lat: 16.5062, lng: 80.6480 } },
  { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', enabled: false, coords: { lat: 17.6868, lng: 83.2185 } },
  { id: 'guntur', name: 'Guntur', state: 'Andhra Pradesh', enabled: false, coords: { lat: 16.3067, lng: 80.4365 } },
  { id: 'warangal', name: 'Warangal', state: 'Telangana', enabled: false, coords: { lat: 17.9784, lng: 79.5941 } },
  { id: 'secunderabad', name: 'Secunderabad', state: 'Telangana', enabled: false, coords: { lat: 17.4399, lng: 78.4983 } },
  { id: 'tirupati', name: 'Tirupati', state: 'Andhra Pradesh', enabled: false, coords: { lat: 13.6288, lng: 79.4192 } },
  { id: 'kakinada', name: 'Kakinada', state: 'Andhra Pradesh', enabled: false, coords: { lat: 16.9891, lng: 82.2475 } },
  { id: 'rajahmundry', name: 'Rajahmundry', state: 'Andhra Pradesh', enabled: false, coords: { lat: 17.0005, lng: 81.8040 } },
  { id: 'nellore', name: 'Nellore', state: 'Andhra Pradesh', enabled: false, coords: { lat: 14.4426, lng: 79.9865 } },
  { id: 'kurnool', name: 'Kurnool', state: 'Andhra Pradesh', enabled: false, coords: { lat: 15.8281, lng: 78.0373 } },
];

/** Navigation categories with dropdown items */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Education',
    icon: '🎓',
    color: '#6b7280',
    items: [
      { label: 'Schools', icon: '🏫', moduleKey: 'schools', action: 'browse' },
      { label: 'Publish School', icon: '📝', moduleKey: 'schools', action: 'publish' },
    ],
  },
  {
    label: 'Entertainment',
    icon: '🎬',
    color: '#6b7280',
    items: [
      { label: 'Movies', icon: '🎥', moduleKey: 'movies', action: 'browse' },
      { label: 'Publish Movie', icon: '📝', moduleKey: 'movies', action: 'publish' },
    ],
  },
  {
    label: 'Business',
    icon: '💎',
    color: '#6b7280',
    items: [
      { label: 'Shopping Deals', icon: '🛍️', moduleKey: 'ads', action: 'browse' },
      { label: 'Publish Ads', icon: '📣', moduleKey: 'ads', action: 'publish' },
    ],
  },
  {
    label: 'Events',
    icon: '🎆',
    color: '#6b7280',
    items: [
      { label: 'Local Events', icon: '📅', moduleKey: 'events', action: 'browse' },
      { label: 'Publish Event', icon: '📝', moduleKey: 'events', action: 'publish' },
    ],
  },
  {
    label: 'Travel',
    icon: '✈️',
    color: '#6b7280',
    items: [
      { label: 'Travel Contacts', icon: '🗺️', moduleKey: 'travel', action: 'browse' },
      { label: 'Publish Travel', icon: '📝', moduleKey: 'travel', action: 'publish' },
    ],
  },
  {
    label: 'Health',
    icon: '💚',
    color: '#6b7280',
    items: [
      { label: 'Hospitals', icon: '🏥', moduleKey: 'health', action: 'browse' },
      { label: 'Publish Health Listing', icon: '📝', moduleKey: 'health', action: 'publish' },
    ],
  },
  {
    label: 'Food',
    icon: '🍽️',
    color: '#6b7280',
    items: [
      { label: 'Restaurants', icon: '🍕', moduleKey: 'restaurants', action: 'browse' },
      { label: 'Hotels', icon: '🏨', moduleKey: 'hotels', action: 'browse' },
      { label: 'Publish Restaurant', icon: '📝', moduleKey: 'restaurants', action: 'publish' },
      { label: 'Publish Hotel', icon: '📝', moduleKey: 'hotels', action: 'publish' },
    ],
  },
  {
    label: 'Helpers',
    icon: '🛠️',
    color: '#6b7280',
    items: [
      { label: 'Find Helpers', icon: '👷', moduleKey: 'helpers', action: 'browse' },
      { label: 'Register as Helper', icon: '📝', moduleKey: 'helpers', action: 'publish' },
    ],
  },
];

/** Quick cards shown on town home dashboard */
export const QUICK_CARDS: QuickCard[] = [
  { label: 'Schools', icon: '🏫', color: '#52525b', description: 'Find schools and colleges', moduleKey: 'schools' },
  { label: 'News', icon: '📰', color: '#52525b', description: 'Latest local news', moduleKey: 'news' },
  { label: 'Business Ads', icon: '🛍️', color: '#52525b', description: 'Deals and promotions', moduleKey: 'ads' },
  { label: 'Health', icon: '🏥', color: '#52525b', description: 'Healthcare nearby', moduleKey: 'health' },
  { label: 'Movies', icon: '🎬', color: '#52525b', description: 'Movies and theatres', moduleKey: 'movies' },
  { label: 'Restaurants', icon: '🍽️', color: '#52525b', description: 'Food and dining', moduleKey: 'restaurants' },
  { label: 'Hotels', icon: '🏨', color: '#52525b', description: 'Lodges and stays', moduleKey: 'hotels' },
  { label: 'Helpers', icon: '🛠️', color: '#52525b', description: 'Service providers', moduleKey: 'helpers' },
  { label: 'Travel', icon: '✈️', color: '#52525b', description: 'Travel contacts', moduleKey: 'travel' },
  { label: 'Events', icon: '🎆', color: '#52525b', description: 'Local events', moduleKey: 'events' },
];

export function getTownById(townId: string): Town | undefined {
  return DEFAULT_TOWNS.find((town) => town.id === townId);
}

export function isTownId(townId: string): boolean {
  return DEFAULT_TOWNS.some((town) => town.id === townId);
}

export function getTownPath(townId: string): string {
  return `/${townId}`;
}
