import { MetadataRoute } from 'next';

/**
 * TEMPORARY: Site is currently blocked from search engines while products
 * are being set up. Once moved to final domain, remove the Disallow: /
 * and restore the allow list + sitemap reference.
 *
 * TODO: Re-enable when moving to production domain (jackseliquids.co.uk)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: ['/'],
      },
    ],
    // Sitemap deliberately omitted while site is under construction
  };
}
