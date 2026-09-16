import type { MetadataRoute } from 'next';

const BASE_URL = 'https://civicpie.com';

// Key public routes. Ward/city/county/state/federal district pages are
// dynamic ([type]/[id]); the flagship entries are listed here.
const routes: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/coverage', changeFrequency: 'daily', priority: 0.9 },
  { path: '/ward/chicago-48', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/city/chicago', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/county/cook', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/state/illinois', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/federal/us', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
