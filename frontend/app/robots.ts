import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradepigloball.co';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/pricing', '/contact', '/privacy', '/terms', '/cookies'],
        disallow: ['/dashboard', '/game-factory', '/settings', '/owner', '/signin', '/signup', '/login', '/auth']
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
