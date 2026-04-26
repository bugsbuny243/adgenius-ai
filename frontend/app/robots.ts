import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradepigloball.co';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog', '/guides', '/about', '/pricing', '/contact', '/privacy', '/terms'],
        disallow: ['/dashboard', '/agents', '/game-factory', '/composer', '/publish-queue', '/saved', '/projects', '/connections', '/settings', '/login', '/register', '/auth']
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
