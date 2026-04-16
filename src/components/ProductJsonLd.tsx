import { Product } from '@/lib/data';

interface ProductJsonLdProps {
  product: Product;
  siteUrl: string;
}

export default function ProductJsonLd({ product, siteUrl }: ProductJsonLdProps) {
  const parsePrice = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));
  
  // Use sale price if available, otherwise regular price
  const priceVal = product.salePrice 
    ? parsePrice(product.salePrice) 
    : parsePrice(product.price);

  // Determine availability from stock
  const hasVariations = product.variations && product.variations.length > 0;
  const inStock = hasVariations
    ? product.variations.some(v => v.inStock)
    : product.trackStock ? (product.stockQty ?? 0) > 0 : true;
  
  const availability = inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const canonicalUrl = product.seo?.canonicalUrl || `${siteUrl}/product/${product.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description?.replace(/<[^>]*>/g, '').slice(0, 500) || product.name,
    image: product.image || undefined,
    url: canonicalUrl,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Jacks E-Liquids',
    },
    // No barcodes/GTINs — use internal IDs
    productID: product.id,
    mpn: product.id,
    sku: product.sku || product.id,
    identifier_exists: 'false',
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'GBP',
      price: isNaN(priceVal) ? '0.00' : priceVal.toFixed(2),
      availability,
      seller: {
        '@type': 'Organization',
        name: 'Jacks E-Liquids',
      },
    },
    ...(product.category ? { category: product.category } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
