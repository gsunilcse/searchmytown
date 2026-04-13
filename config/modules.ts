export type DirectoryModuleKey =
  | 'schools'
  | 'movies'
  | 'ads'
  | 'news'
  | 'health'
  | 'restaurants'
  | 'hotels'
  | 'helpers'
  | 'travel'
  | 'events'
  | 'function-halls';

export type ModuleDefinition = {
  key: DirectoryModuleKey;
  label: string;
  singularLabel: string;
  collectionName: string;
  icon: string;
  accent: string;
  description: string;
  browseTitle: string;
  publishTitle: string;
  submitButtonLabel: string;
  emptyState: string;
  titlePlaceholder: string;
  summaryPlaceholder: string;
  hasAvailability?: boolean;
};

export type HelperCategoryDefinition = {
  label: string;
  icon: string;
  keywords: string[];
};

export const HELPER_CATEGORY_DEFINITIONS: HelperCategoryDefinition[] = [
  { label: 'Carpenter', icon: '🪚', keywords: ['carpenter', 'wood work', 'woodwork', 'furniture work'] },
  { label: 'Plumber', icon: '🔧', keywords: ['plumber', 'plumbing', 'pipe repair'] },
  { label: 'Electrician', icon: '⚡', keywords: ['electrician', 'electrical', 'wiring', 'current work'] },
  { label: 'Box cricket', icon: '🏏', keywords: ['box cricket', 'cricket turf', 'cricket'] },
  { label: 'Sports', icon: '🏅', keywords: ['sports', 'sports club', 'sports coaching'] },
  { label: 'Badminton', icon: '🏸', keywords: ['badminton', 'shuttle'] },
  { label: 'Basketball', icon: '🏀', keywords: ['basketball'] },
  { label: 'AC repair/Servicing', icon: '❄️', keywords: ['ac repair', 'ac service', 'air conditioner'] },
  { label: 'Water purifier Repair/Servicing', icon: '💧', keywords: ['water purifier', 'ro service', 'ro repair'] },
  { label: 'Paints', icon: '🎨', keywords: ['paint', 'painting', 'paints'] },
  { label: 'House maid', icon: '🧹', keywords: ['house maid', 'maid', 'domestic help'] },
  { label: 'Washing machine servicing', icon: '🫧', keywords: ['washing machine', 'washer service'] },
  { label: 'Stove repair', icon: '🔥', keywords: ['stove repair', 'gas stove'] },
  { label: 'Mesh door', icon: '🚪', keywords: ['mesh door', 'mosquito mesh'] },
  { label: 'Welding', icon: '🛠️', keywords: ['welding', 'welder'] },
  { label: 'Mason', icon: '🧱', keywords: ['mason', 'construction worker'] },
  { label: 'Milk', icon: '🥛', keywords: ['milk', 'milk delivery', 'dairy'] },
  { label: 'Newspaper', icon: '🗞️', keywords: ['newspaper', 'paper delivery'] },
  { label: 'Catering', icon: '🍛', keywords: ['catering', 'caterer'] },
  { label: 'Saloon', icon: '💈', keywords: ['saloon', 'salon', 'hair cut', 'barber'] },
  { label: 'Rmp', icon: '🩺', keywords: ['rmp', 'general practitioner'] },
  { label: 'Blood test', icon: '🧪', keywords: ['blood test', 'lab test', 'diagnostic'] },
  { label: 'Car repair/Servicing', icon: '🚗', keywords: ['car repair', 'car service', 'mechanic car'] },
  { label: 'Bike Repair', icon: '🏍️', keywords: ['bike repair', 'bike service', 'two wheeler'] },
  { label: 'Medicines home delivery', icon: '💊', keywords: ['medicines home delivery', 'medicine delivery', 'pharmacy delivery'] },
  { label: 'Home tutions', icon: '📚', keywords: ['home tutions', 'home tuition', 'home tutor', 'tuition'] },
];

export const HELPER_CATEGORY_LABELS = HELPER_CATEGORY_DEFINITIONS.map((category) => category.label);

export type HelperCategory = (typeof HELPER_CATEGORY_LABELS)[number];

export const MODULE_DEFINITIONS: Record<DirectoryModuleKey, ModuleDefinition> = {
  schools: {
    key: 'schools',
    label: 'Schools',
    singularLabel: 'School',
    collectionName: 'schools',
    icon: '🏫',
    accent: '#52525b',
    description: 'Approved school listings, institutions, and education options for the selected town.',
    browseTitle: 'Schools and education',
    publishTitle: 'Publish a school listing',
    submitButtonLabel: 'Submit school for review',
    emptyState: 'No approved schools are live for this town yet.',
    titlePlaceholder: 'Example: Sri Vidya High School',
    summaryPlaceholder: 'Short summary of the institution, grades, or services offered',
  },
  movies: {
    key: 'movies',
    label: 'Movies',
    singularLabel: 'Movie listing',
    collectionName: 'movies',
    icon: '🎬',
    accent: '#52525b',
    description: 'Theatres, screenings, and entertainment listings approved for this town.',
    browseTitle: 'Movies and theatres',
    publishTitle: 'Publish a movie or theatre listing',
    submitButtonLabel: 'Submit movie listing',
    emptyState: 'No approved movie or theatre listings are live for this town yet.',
    titlePlaceholder: 'Example: Sri Lakshmi Cinema - Weekend shows',
    summaryPlaceholder: 'Short summary of theatre, show timings, or entertainment details',
  },
  ads: {
    key: 'ads',
    label: 'Business Ads',
    singularLabel: 'Business ad',
    collectionName: 'ads',
    icon: '📣',
    accent: '#52525b',
    description: 'Town-filtered promotions, business advertisements, and local offers.',
    browseTitle: 'Business ads and offers',
    publishTitle: 'Publish a business ad',
    submitButtonLabel: 'Submit ad for review',
    emptyState: 'No approved business ads are live for this town yet.',
    titlePlaceholder: 'Example: Summer offer at Sai Mobiles',
    summaryPlaceholder: 'Short summary of the offer, promotion, or business announcement',
  },
  news: {
    key: 'news',
    label: 'News',
    singularLabel: 'News update',
    collectionName: 'news',
    icon: '📰',
    accent: '#52525b',
    description: 'Local news, notices, and public-interest announcements after moderation.',
    browseTitle: 'Local news and updates',
    publishTitle: 'Publish a local news update',
    submitButtonLabel: 'Submit news for review',
    emptyState: 'No approved local news is live for this town yet.',
    titlePlaceholder: 'Example: Road closure near market on Friday',
    summaryPlaceholder: 'Short summary of the update or announcement',
  },
  health: {
    key: 'health',
    label: 'Health',
    singularLabel: 'Health listing',
    collectionName: 'health',
    icon: '🏥',
    accent: '#52525b',
    description: 'Hospitals, clinics, and healthcare contacts visible after approval.',
    browseTitle: 'Health and hospitals',
    publishTitle: 'Publish a health listing',
    submitButtonLabel: 'Submit health listing',
    emptyState: 'No approved health listings are live for this town yet.',
    titlePlaceholder: 'Example: Ravi Multi Speciality Clinic',
    summaryPlaceholder: 'Short summary of services, timings, or specialties',
  },
  restaurants: {
    key: 'restaurants',
    label: 'Restaurants',
    singularLabel: 'Restaurant',
    collectionName: 'restaurants',
    icon: '🍽️',
    accent: '#52525b',
    description: 'Approved restaurants, cafes, and dining options for the selected town.',
    browseTitle: 'Restaurants and dining',
    publishTitle: 'Publish a restaurant',
    submitButtonLabel: 'Submit restaurant',
    emptyState: 'No approved restaurants are live for this town yet.',
    titlePlaceholder: 'Example: Anand Family Restaurant',
    summaryPlaceholder: 'Short summary of cuisine, specialties, or dining experience',
  },
  hotels: {
    key: 'hotels',
    label: 'Hotels',
    singularLabel: 'Hotel',
    collectionName: 'hotels',
    icon: '🏨',
    accent: '#52525b',
    description: 'Approved hotels, lodges, and stay options for visitors and locals.',
    browseTitle: 'Hotels and stays',
    publishTitle: 'Publish a hotel or stay listing',
    submitButtonLabel: 'Submit hotel listing',
    emptyState: 'No approved hotels are live for this town yet.',
    titlePlaceholder: 'Example: Surya Residency',
    summaryPlaceholder: 'Short summary of rooms, location, or stay options',
  },
  helpers: {
    key: 'helpers',
    label: 'Helpers',
    singularLabel: 'Helper listing',
    collectionName: 'helpercontacts',
    icon: '🛠️',
    accent: '#52525b',
    description: 'Electricians, plumbers, drivers, and other helpers approved for this town.',
    browseTitle: 'Helpers and service providers',
    publishTitle: 'Register as a helper',
    submitButtonLabel: 'Submit helper profile',
    emptyState: 'No approved helper listings are live for this town yet.',
    titlePlaceholder: 'Example: Ramesh Electrical Services',
    summaryPlaceholder: 'Short summary of category, expertise, or service coverage',
  },
  travel: {
    key: 'travel',
    label: 'Travel',
    singularLabel: 'Travel contact',
    collectionName: 'travelcontacts',
    icon: '✈️',
    accent: '#52525b',
    description: 'Travel contacts, route services, and transportation options reviewed by admin.',
    browseTitle: 'Travel and transport contacts',
    publishTitle: 'Publish a travel contact',
    submitButtonLabel: 'Submit travel contact',
    emptyState: 'No approved travel contacts are live for this town yet.',
    titlePlaceholder: 'Example: Vijay Tours to Hyderabad',
    summaryPlaceholder: 'Short summary of routes, timings, or travel services',
  },
  events: {
    key: 'events',
    label: 'Events',
    singularLabel: 'Event',
    collectionName: 'events',
    icon: '🎆',
    accent: '#52525b',
    description: 'Town events, celebrations, and public programs that have been approved.',
    browseTitle: 'Events and happenings',
    publishTitle: 'Publish an event',
    submitButtonLabel: 'Submit event for review',
    emptyState: 'No approved events are live for this town yet.',
    titlePlaceholder: 'Example: Ugadi cultural celebration',
    summaryPlaceholder: 'Short summary of the event, date, or venue',
  },
  'function-halls': {
    key: 'function-halls',
    label: 'Function Halls',
    singularLabel: 'Function hall',
    collectionName: 'functionHalls',
    icon: '🏛️',
    accent: '#52525b',
    description: 'Approved function halls and venues for marriages, birthdays, and family events in the selected town.',
    browseTitle: 'Function halls and event venues',
    publishTitle: 'Publish a function hall',
    submitButtonLabel: 'Submit function hall',
    emptyState: 'No approved function halls are live for this town yet.',
    titlePlaceholder: 'Example: Sri Lakshmi Function Hall',
    summaryPlaceholder: 'Short summary of venue capacity, occasions hosted, or landmark',
    hasAvailability: true,
  },
};

export const MODULE_KEYS = Object.keys(MODULE_DEFINITIONS) as DirectoryModuleKey[];

export function isDirectoryModuleKey(value: string): value is DirectoryModuleKey {
  return value in MODULE_DEFINITIONS;
}

export function getModuleDefinition(moduleKey: string): ModuleDefinition | undefined {
  if (!isDirectoryModuleKey(moduleKey)) {
    return undefined;
  }

  return MODULE_DEFINITIONS[moduleKey];
}

export function getTownModulePath(townId: string, moduleKey: DirectoryModuleKey): string {
  return `/${townId}/${moduleKey}`;
}

export function getTownPublishPath(townId: string, moduleKey: DirectoryModuleKey): string {
  return `/${townId}/publish/${moduleKey}`;
}

export function isHelperCategory(value: string): value is HelperCategory {
  return HELPER_CATEGORY_LABELS.includes(value as HelperCategory);
}