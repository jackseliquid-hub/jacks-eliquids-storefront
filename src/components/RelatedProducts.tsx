'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllProducts, Product } from '@/lib/data';

interface RelatedProductsProps {
  currentProduct: Product;
  maxItems?: number;
}

export default function RelatedProducts({ currentProduct, maxItems = 7 }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allProducts = await getAllProducts();
        // Only published, exclude current product and fully-OOS products
        const available = allProducts.filter(p => {
          if (p.id === currentProduct.id) return false;
          if (p.status !== 'published') return false;
          if (!p.image) return false;
          // Exclude products where ALL variations are out of stock
          if (p.variations && p.variations.length > 0) {
            if (p.variations.every(v => !v.inStock)) return false;
          }
          return true;
        });

        const manualIds = currentProduct.relatedProducts || [];
        const result: Product[] = [];
        const usedIds = new Set<string>();

        // 1. Manual picks first (preserve order)
        for (const id of manualIds) {
          const prod = available.find(p => p.id === id);
          if (prod && !usedIds.has(prod.id)) {
            result.push(prod);
            usedIds.add(prod.id);
          }
          if (result.length >= maxItems) break;
        }

        // 2. Same tags (products sharing the most tags first)
        if (result.length < maxItems && currentProduct.tags?.length) {
          const tagMatches = available
            .filter(p => !usedIds.has(p.id) && p.tags?.length)
            .map(p => ({
              product: p,
              score: p.tags!.filter(t => currentProduct.tags!.includes(t)).length,
            }))
            .filter(m => m.score > 0)
            .sort((a, b) => b.score - a.score);

          for (const match of tagMatches) {
            result.push(match.product);
            usedIds.add(match.product.id);
            if (result.length >= maxItems) break;
          }
        }

        // 3. Same category
        if (result.length < maxItems && currentProduct.category) {
          const catMatches = available.filter(
            p => !usedIds.has(p.id) && p.category === currentProduct.category
          );
          for (const prod of catMatches) {
            result.push(prod);
            usedIds.add(prod.id);
            if (result.length >= maxItems) break;
          }
        }

        // 4. Same brand
        if (result.length < maxItems && currentProduct.brand) {
          const brandMatches = available.filter(
            p => !usedIds.has(p.id) && p.brand === currentProduct.brand
          );
          for (const prod of brandMatches) {
            result.push(prod);
            usedIds.add(prod.id);
            if (result.length >= maxItems) break;
          }
        }

        setRelatedProducts(result);
      } catch (err) {
        console.error('Failed to load related products', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentProduct.id]);

  if (loading || relatedProducts.length === 0) return null;

  return (
    <section style={{
      maxWidth: 1280,
      margin: '2.5rem auto 0',
      padding: '0 1.5rem',
    }}>
      <h2 style={{
        fontSize: '1.4rem',
        fontWeight: 700,
        color: '#1d1d1f',
        marginBottom: '1.25rem',
        textAlign: 'center',
      }}>
        You May Also Like
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
      }}
      className="related-grid"
      >
        <style>{`
          @media (min-width: 640px) { .related-grid { grid-template-columns: repeat(7, 1fr) !important; } }
        `}</style>
        {relatedProducts.map(product => {
          const price = product.salePrice || product.price;
          const hasDiscount = product.salePrice && product.salePrice !== product.price;

          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{
                aspectRatio: '1',
                overflow: 'hidden',
                background: '#f5f5f7',
              }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding: '0.5rem',
                  }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  color: '#1d1d1f',
                }}>
                  {product.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: hasDiscount ? '#e53935' : '#1d1d1f',
                  }}>
                    {price}
                  </span>
                  {hasDiscount && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#86868b',
                      textDecoration: 'line-through',
                    }}>
                      {product.price}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
