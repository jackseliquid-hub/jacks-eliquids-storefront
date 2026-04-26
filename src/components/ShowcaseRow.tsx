'use client';

import Link from 'next/link';
import styles from '../app/home.module.css';
import { Product } from '@/lib/data';
import { useCart } from '@/context/CartContext';

interface Props {
  title: string;
  products: Product[];
  onNotify?: (product: Product) => void;
  linkText?: string;       // e.g. "Check Out All Our E-Liquids"
  linkCategory?: string;   // category name for the URL
  firstName?: string | null; // logged-in user's first name
}

export default function ShowcaseRow({ title, products, onNotify, linkText, linkCategory, firstName }: Props) {
  const { addToCart } = useCart();

  if (products.length === 0) return null;

  function handleAddToCart(e: React.MouseEvent, product: Product) {
    e.preventDefault();
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.salePrice || (product.price && product.price !== 'N/A' ? product.price : 'See Options'),
    });
  }

  // Build the personalised link label
  const hasLink = linkText && linkCategory;
  const linkLabel = hasLink
    ? (firstName ? `${firstName}, ${linkText}` : linkText)
    : null;

  return (
    <section className="container" style={{ padding: '0 1rem' }}>
      {/* Title row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '0.35rem 0.75rem',
        margin: '0 0 0.75rem',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
          fontWeight: 800,
          color: '#111827',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h2>
        {linkLabel && (
          <Link
            href={`/?cat=${encodeURIComponent(linkCategory!)}`}
            style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
              fontWeight: 600,
              color: '#0f766e',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0d9488')}
            onMouseLeave={e => (e.currentTarget.style.color = '#0f766e')}
          >
            <span style={{ color: '#9ca3af' }}>…</span> {linkLabel} →
          </Link>
        )}
      </div>

      <div className="showcase-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.85rem',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <style>{`
          @media (max-width: 900px) {
            .showcase-grid { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 540px) {
            .showcase-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>

        {products.slice(0, 5).map((product, index) => {
          const vars = product.variations || [];
          const allOOS = vars.length > 0
            ? vars.every(v => !v.inStock)
            : (product.trackStock ? (product.stockQty ?? 1) <= 0 : false);

          return (
            <Link key={product.id || `showcase-${index}`} href={`/product/${product.slug}`} className={styles.cardLink}>
              <div className={styles.card}>
                <div className={styles.cardImageWrapper} style={{ position: 'relative' }}>
                  {product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className={styles.productImage}
                      loading="lazy"
                      style={allOOS ? { filter: 'grayscale(55%) opacity(0.7)' } : undefined}
                    />
                  )}
                  {allOOS && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      <span style={{
                        background: 'rgba(0,0,0,0.62)', color: '#fff',
                        fontSize: '0.82rem', fontWeight: 800,
                        padding: '0.3rem 1rem', borderRadius: 6,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                      }}>Out of Stock</span>
                    </div>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productFooter}>
                    <div className={styles.priceWrapper}>
                      {product.salePrice ? (
                        <>
                          <span className={styles.productPriceSlashed}>
                            {product.price !== 'N/A' ? `From ${product.price}` : ''}
                          </span>
                          <span className={styles.productPriceSale}>{product.salePrice}</span>
                          <span className={styles.saleTag}>Sale</span>
                        </>
                      ) : (
                        <span className={styles.productPrice}>
                          {product.price && product.price !== 'N/A' ? `From ${product.price}` : 'See Options'}
                        </span>
                      )}
                    </div>
                    {allOOS ? (
                      <button
                        className={styles.addToCartBtn}
                        style={{ background: 'var(--deep-teal)', opacity: 0.85 }}
                        aria-label="Notify me when back in stock"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          onNotify?.(product);
                        }}
                      >
                        🔔 Notify Me
                      </button>
                    ) : product.variations && product.variations.length > 0 ? (
                      <button className={styles.addToCartBtn} aria-label="Select options">
                        Select Options
                      </button>
                    ) : (
                      <button
                        className={styles.addToCartBtn}
                        aria-label="Add to cart"
                        onClick={e => handleAddToCart(e, product)}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
