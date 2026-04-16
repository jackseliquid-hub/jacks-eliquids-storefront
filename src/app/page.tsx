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

  // Sync URL param → activeCategory only when the param is a category
  useEffect(() => {
    if (catParam) setActiveCategory(catParam);
  }, [catParam]);

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
      // Sort: name matches first
      matched.sort((a, b) => {
        const aName = a.name.toLowerCase().includes(low) ? 0 : 1;
        const bName = b.name.toLowerCase().includes(low) ? 0 : 1;
        return aName - bName;
      });
      return matched;
    }

    // Tag filter — show products that have this tag
    if (tagParam) {
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

    // Category filter (from pills or URL)
    if (activeCategory === 'All') return sorted.slice(0, 48);
    return sorted.filter(p => p.category === activeCategory);
  }, [activeCategory, products, tagParam, brandParam, searchQuery]);

  // Page title based on active filter
  const filterTitle = searchQuery
    ? `Search: "${searchQuery}"`
    : tagParam
      ? tagParam
      : brandParam
        ? brandParam
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

        {/* Category Bar */}
        <div className={styles.categoryBar}>
          <div className={`container ${styles.categoryScroll}`}>
            <button
              className={`${styles.categoryPill} ${activeCategory === 'All' && !tagParam && !brandParam ? styles.active : ''}`}
              onClick={() => { setActiveCategory('All'); window.history.replaceState(null, '', '/'); }}
            >
              All
            </button>
            {categories.map((cat, index) => (
              <button
                key={cat || `cat-${index}`}
                className={`${styles.categoryPill} ${activeCategory === cat && !tagParam && !brandParam ? styles.active : ''}`}
                onClick={() => { setActiveCategory(cat); window.history.replaceState(null, '', `/?cat=${encodeURIComponent(cat)}`); }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <section className={`container ${styles.productsSection}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{filterTitle}</h2>
            <span className={styles.viewAll} style={{ cursor: 'default' }}>
              {featuredProducts.length} Product{featuredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

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
            {featuredProducts.map((product, index) => (
              <Link key={product.id || `prod-${index}`} href={`/product/${product.slug}`} className={styles.cardLink}>
                <div className={styles.card}>
                  <div className={styles.cardImageWrapper}>
                    {product.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt={product.name}
                        className={styles.productImage}
                        loading="lazy"
                      />
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
                      {product.variations && product.variations.length > 0 ? (
                        <button
                          className={styles.addToCartBtn}
                          aria-label="Select options"
                        >
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
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
