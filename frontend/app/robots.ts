import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/contact', '/privacy-policy', '/terms', '/cookies', '/articles'],
        disallow: ['/dashboard', '/agents', '/projects', '/runs', '/saved', '/connections']
      }
    ]
  };
}
