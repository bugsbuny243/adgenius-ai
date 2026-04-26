import type { MetadataRoute } from 'next';
import { blogPosts, guides } from '@/lib/public-content';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradepigloball.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/about', '/contact', '/privacy', '/terms', '/cookies', '/pricing', '/blog', '/guides'];
  const blogRoutes = blogPosts.map((post) => `/blog/${post.slug}`);
  const guideRoutes = guides.map((guide) => `/guides/${guide.slug}`);

  return [...routes, ...blogRoutes, ...guideRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date()
  }));
}
