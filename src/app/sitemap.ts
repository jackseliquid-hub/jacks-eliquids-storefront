import { MetadataRoute } from 'next';
import { getAllProducts, getAllBlogs, getAllPages } from '@/lib/data';

/**
 * Safely convert any timestamp to a valid Date.
 * Handles: ISO strings, Unix seconds (bigint-style numbers), Unix ms, undefined/null.
 */
function safeDate(value: string | number | null | undefined): Date {
  if (!value) return new Date();
  
  // If it's a number — could be Unix seconds or Unix ms
  if (typeof value === 'number') {
    // Unix timestamps in seconds are < 10 digits before year 2001 — use a threshold
    // Seconds: ~1.7 billion (10 digits), ms: ~1.7 trillion (13 digits)
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  
  // If it's a string
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';

  const [products, blogs, pages] = await Promise.all([
    getAllProducts(),
    getAllBlogs(),
    getAllPages()
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }
  ];

  products.forEach((product) => {
    entries.push({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  blogs.filter(b => b.status === 'published').forEach((blog) => {
    entries.push({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: safeDate(blog.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  pages.filter(p => p.status === 'published').forEach((page) => {
    entries.push({
      url: `${baseUrl}/p/${page.slug}`,
      lastModified: safeDate(page.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  });

  return entries;
}
