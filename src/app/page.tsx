'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './home.module.css';
import { useCart } from '@/context/CartContext';
import { getAllProducts, getCategories, Product } from '@/lib/data';

// Wrapper to satisfy Next.js Suspense boundary for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<div className={styles.loadingScreen}><div className={styles.spinner} /><span>Loading Shop...</span></div>}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const { addToCart, cartCount, openCart } = useCart();
  const searchParams = useSearchParams();

  // Read filter from URL query params
  const catParam     = searchParams.get('cat');
  const tagParam     = searchParams.get('tag');
  const brandParam   = searchParams.get('brand');
  const searchQuery  = searchParams.get('q');

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodData, catData] = await Promise.all([
          getAllProducts(),
          getCategories()
        ]);
        setProducts(prodData.filter(p => p.status !== 'draft'));
        setCategories(catData);
      } catch (err) {
        console.error("Home: Data fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Sync URL params → activeCategory and activeTag
  useEffect(() => {
    if (catParam) setActiveCategory(catParam);
    // If URL has both cat and tag, set the tag sub-filter
    if (catParam && tagParam) {
      setActiveTag(tagParam);
    } else if (!catParam && tagParam) {
      // Tag-only filter (from menu link) — no sub-filter needed
      setActiveTag(null);
    } else {
      setActiveTag(null);
    }
  }, [catParam, tagParam]);

  // Products filtered by category (before tag sub-filter)
  const categoryProducts = useMemo(() => {
    const sorted = [...products].reverse();
    if (activeCategory === 'All') return sorted;
    return sorted.filter(p => p.category === activeCategory);
  }, [activeCategory, products]);

  // Collect unique tags from products in the active category (for sub-filter pills)
  const categoryTags = useMemo(() => {
    if (activeCategory === 'All') return [];
    const tagCounts = new Map<string, number>();
    for (const p of categoryProducts) {
      if (p.tags) {
        for (const t of p.tags) {
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
    }
    // Sort alphabetically A→Z
    return Array.from(tagCounts.keys())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [activeCategory, categoryProducts]);

  const featuredProducts = useMemo(() => {
    const sorted = [...products].reverse();

    // Search query filter
    if (searchQuery) {
      const low = searchQuery.toLowerCase();
      const matched = sorted.filter(p =>
        p.name.toLowerCase().includes(low) ||
        p.category?.toLowerCase().includes(low) ||
        p.brand?.toLowerCase().includes(low) ||
        p.sku?.toLowerCase().includes(low) ||
        p.tags?.some(t => t.toLowerCase().includes(low))
      );
      matched.sort((a, b) => {
        const aName = a.name.toLowerCase().includes(low) ? 0 : 1;
        const bName = b.name.toLowerCase().includes(low) ? 0 : 1;
        return aName - bName;
      });
      return matched;
    }

    // Tag-only filter (from menu link, no category context)
    if (tagParam && !catParam) {
      const tagLower = tagParam.toLowerCase();
      return sorted.filter(p =>
        p.tags && p.tags.some(t => t.toLowerCase() === tagLower)
      );
    }

    // Brand filter
    if (brandParam) {
      const brandLower = brandParam.toLowerCase();
      return sorted.filter(p =>
        p.brand && p.brand.toLowerCase() === brandLower
      );
    }

    // Category filter + optional tag sub-filter
    let filtered = categoryProducts;
    if (activeCategory === 'All') {
      filtered = sorted.slice(0, 48);
    }

    // Apply tag sub-filter if active
    if (activeTag) {
      const tagLower = activeTag.toLowerCase();
      filtered = filtered.filter(p =>
        p.tags && p.tags.some(t => t.toLowerCase() === tagLower)
      );
    }

    return filtered;
  }, [activeCategory, activeTag, products, categoryProducts, tagParam, catParam, brandParam, searchQuery]);

  // Page title based on active filter
  const filterTitle = searchQuery
    ? `Search: "${searchQuery}"`
    : (tagParam && !catParam)
      ? tagParam
      : brandParam
        ? brandParam
        : activeTag
          ? `${activeCategory} — ${activeTag}`
          : activeCategory === 'All'
            ? 'Featured Blends'
            : activeCategory;

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

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <span>Loading Shop...</span>
      </div>
    );
  }

  return (
    <>
      <main className={styles.main}>
        {/* Hero — only show when not filtering */}
        {!tagParam && !brandParam && activeCategory === 'All' && (
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>Premium E-Liquids. Unmatched Quality.</h1>
            <p className={styles.heroSubtitle}>
              Carefully crafted blends designed to deliver perfect flavour profiles and dense clouds. Satisfaction in every draw.
            </p>
            <button className={styles.ctaButton} onClick={openCart}>Shop the Collection</button>
          </section>
        )}

        {/* Products Grid */}
        <section className={`container ${styles.productsSection}`}>
          <div className={styles.sectionHeader} style={{ marginBottom: '0.25rem' }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>{filterTitle}</h2>
            <span className={styles.viewAll} style={{ cursor: 'default' }}>
              {featuredProducts.length} Product{featuredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tag Sub-filter Pills — only when a category is selected and has tags */}
          {activeCategory !== 'All' && !brandParam && !(tagParam && !catParam) && categoryTags.length > 0 && (
            <div className={`${styles.tagFilterWrap}`} style={{ marginBottom: '0.75rem' }}>
              <button
                className={`${styles.tagPill} ${!activeTag ? styles.active : ''}`}
                onClick={() => { setActiveTag(null); window.history.replaceState(null, '', `/?cat=${encodeURIComponent(activeCategory)}`); }}
              >
                All {activeCategory}
              </button>
              {categoryTags.map(tag => (
                <button
                  key={tag}
                  className={`${styles.tagPill} ${activeTag === tag ? styles.active : ''}`}
                  onClick={() => { setActiveTag(tag); window.history.replaceState(null, '', `/?cat=${encodeURIComponent(activeCategory)}&tag=${encodeURIComponent(tag)}`); }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {featuredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', fontSize: '1.1rem' }}>
              No products found for this filter.
              <br />
              <Link href="/" style={{ color: '#0d9488', fontWeight: 600, marginTop: '0.5rem', display: 'inline-block' }}>
                ← Back to all products
              </Link>
            </div>
          )}

          <div className={styles.grid}>
            {featuredProducts.map((product, index) => {
              // Detect whole-product OOS
              const vars = product.variations || [];
              const allOOS = vars.length > 0
                ? vars.every(v => !v.inStock)
                : (product.trackStock ? (product.stockQty ?? 1) <= 0 : false);

              return (
                <Link key={product.id || `prod-${index}`} href={`/product/${product.slug}`} className={styles.cardLink}>
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
                            onClick={e => e.preventDefault()}
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
      </main>
    </>
  );
}
