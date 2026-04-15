import type { MetadataRoute } from 'next';
import { publicArticles } from '@/lib/public-articles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradepigloball.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/about', '/contact', '/privacy-policy', '/terms', '/cookies', '/articles'];
  const articleRoutes = publicArticles.map((article) => `/articles/${article.slug}`);

  return [...routes, ...articleRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date()
  }));
}
