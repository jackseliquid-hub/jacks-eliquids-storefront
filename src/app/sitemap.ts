import { MetadataRoute } from 'next';
import { getAllProducts, getAllBlogs, getAllPages } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jacks-eliquids.com'; // Change to correct production domain later

  // Fetch all databases in parallel
  const [products, blogs, pages] = await Promise.all([
    getAllProducts(),
    getAllBlogs(),
    getAllPages()
  ]);

  // Build the base generic routes
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

  // Map Products
  products.forEach((product) => {
    entries.push({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  // Map Blogs
  blogs.filter(b => b.status === 'published').forEach((blog) => {
    entries.push({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: blog.publishedAt ? new Date(blog.publishedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // Map CMS Generic Pages
  pages.filter(p => p.status === 'published').forEach((page) => {
    entries.push({
      url: `${baseUrl}/p/${page.slug}`,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  });

  return entries;
}
