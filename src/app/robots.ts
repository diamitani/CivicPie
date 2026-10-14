import type { MetadataRoute } from 'next';

const BASE_URL = 'https://civicpie.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/signin', '/signup'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
