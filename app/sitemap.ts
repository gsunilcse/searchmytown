import type { MetadataRoute } from 'next';
import { MODULE_KEYS } from '@/config/modules';
import { absoluteUrl } from '@/lib/seo';
import { getEnabledTowns } from '@/lib/town-settings';

export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const enabledTowns = await getEnabledTowns();
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    ...enabledTowns.map((town) => ({
      url: absoluteUrl(`/${town.id}`),
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...enabledTowns.flatMap((town) =>
      MODULE_KEYS.map((moduleKey) => ({
        url: absoluteUrl(`/${town.id}/${moduleKey}`),
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }))
    ),
  ];
}