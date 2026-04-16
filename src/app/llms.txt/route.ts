import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/data';

/**
 * llms.txt — AI-readable product catalog for LLM crawlers (Gemini, GPT, etc.)
 * Serves a structured plain-text file at /llms.txt
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';
  const products = await getAllProducts();

  // Only include published products
  const published = products.filter(p => p.status !== 'draft' && !p.seo?.noIndex);

  // Group by category
  const grouped: Record<string, typeof published> = {};
  published.forEach(p => {
    const cat = p.category || 'Uncategorised';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const lines: string[] = [
    '# Jacks E-Liquids Product Catalog',
    `# ${baseUrl}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total Products: ${published.length}`,
    '',
    '## About',
    'Jacks E-Liquids is a UK-based online vape and e-liquid store.',
    'We stock premium e-liquids, nic salts, disposable vapes, pod kits, and accessories.',
    'All products are TPD/TRPR compliant and shipped from the UK.',
    '',
  ];

  // Sort categories alphabetically
  const sortedCategories = Object.keys(grouped).sort();

  for (const category of sortedCategories) {
    lines.push(`## ${category}`);
    lines.push('');

    for (const product of grouped[category]) {
      const price = product.salePrice || product.price || '';
      const desc = product.description
        ?.replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200) || '';

      lines.push(`### ${product.name}`);
      if (product.brand) lines.push(`Brand: ${product.brand}`);
      if (price) lines.push(`Price: ${price}`);
      lines.push(`URL: ${baseUrl}/product/${product.slug}`);
      if (desc) lines.push(`Description: ${desc}`);
      if (product.tags && product.tags.length > 0) {
        lines.push(`Tags: ${product.tags.join(', ')}`);
      }
      lines.push('');
    }
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
