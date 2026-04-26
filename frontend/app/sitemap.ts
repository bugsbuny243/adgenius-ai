import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradepigloball.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/about', '/contact', '/privacy', '/terms', '/cookies', '/pricing'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date()
  }));
}
