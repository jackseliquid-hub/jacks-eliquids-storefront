import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/product/',
          '/blog/',
          '/p/',
          '/contact',
        ],
        disallow: [
          '/admin/',
          '/account/',
          '/api/',
          '/auth/',
          '/checkout/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
