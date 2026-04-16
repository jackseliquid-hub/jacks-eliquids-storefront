import { MetadataRoute } from 'next';
import { getAllProducts, getAllBlogs, getAllPages } from '@/lib/data';

/**
 * Safely convert any timestamp to a valid Date.
 * Handles: ISO strings, Unix seconds (bigint-style numbers), Unix ms, undefined/null.
 */
function safeDate(value: string | number | null | undefined): Date {
  if (!value) return new Date();
  
  if (typeof value === 'number') {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  
  // If it's a numeric string (Unix timestamp), convert first
  const num = Number(value);
  if (!isNaN(num) && num > 0) {
    const ms = num < 1_000_000_000_000 ? num * 1000 : num;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // Otherwise treat as ISO/date string
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
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    }
  ];

  // Products — use real updated_at timestamps, exclude noIndex and drafts
  products
    .filter(p => p.status !== 'draft')
    .filter(p => !p.seo?.noIndex)
    .forEach((product) => {
      entries.push({
        url: `${baseUrl}/product/${product.slug}`,
        lastModified: safeDate(product.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

  // Blogs
  blogs.filter(b => b.status === 'published').forEach((blog) => {
    entries.push({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: safeDate(blog.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // Pages
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
