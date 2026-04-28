'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './home.module.css';
import { useCart } from '@/context/CartContext';
import { getAllProducts, getCategories, Product } from '@/lib/data';
import HeroBanner from '@/components/HeroBanner';
import PromoTiles from '@/components/PromoTiles';
import ShowcaseRow from '@/components/ShowcaseRow';
import CustomerReviews from '@/components/CustomerReviews';
import WelcomeBackModal from '@/components/WelcomeBackModal';
import { createClient } from '@/utils/supabase/client';

interface ShowcaseSection {
  id: number;
  title: string;
  product_ids: string[];
  sort_order: number;
  active: boolean;
  link_text?: string;
  link_category?: string;
}

// ─── Notify Me Modal ──────────────────────────────────────────────────────────

interface NotifyTarget {
  productId: string;
  productName: string;
  variationId: string | null; // first variation id, or null for simple products
}

interface NotifyModalProps {
  target: NotifyTarget | null;
  userEmail: string | null;
  userName: string | null;
  onClose: () => void;
}

function NotifyModal({ target, userEmail, userName, onClose }: NotifyModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-submit for logged-in users as soon as the modal opens
  useEffect(() => {
    if (!target || !userEmail || autoSubmitted) return;
    setAutoSubmitted(true);
    setLoading(true);
    fetch('/api/notify-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variationId: target.variationId || target.productId,
        productId: target.productId,
        email: userEmail,
        name: userName || null,
      }),
    })
      .then(r => r.json())
      .then(j => setResult(j.success ? 'success' : 'error'))
      .catch(() => setResult('error'))
      .finally(() => setLoading(false));
  }, [target, userEmail, userName, autoSubmitted]);

  // Focus email field for guests
  useEffect(() => {
    if (target && !userEmail) {
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [target, userEmail]);

  // Reset state when modal opens for a new product
  useEffect(() => {
    if (target) {
      setEmail('');
      setName('');
      setResult(null);
      setAutoSubmitted(false);
      setLoading(false);
    }
  }, [target?.productId]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!target) return null;

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !target) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notify-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationId: target.variationId || target.productId,
          productId: target.productId,
          email,
          name: name.trim() || null,
        }),
      });
      const json = await res.json();
      setResult(json.success ? 'success' : 'error');
    } catch {
      setResult('error');
    } finally {
      setLoading(false);
    }
  }

  const displayName = userEmail ? (userName || userEmail.split('@')[0]) : (name.trim() || null);

  return (
    <div
      className={styles.notifyOverlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Back in stock notification"
    >
      <div className={styles.notifyCard}>
        {/* Close button */}
        <button className={styles.notifyClose} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.notifyBell}>🔔</div>

        {result === 'success' ? (
          /* ── Success state ───────────────── */
          <div className={styles.notifySuccess}>
            <div className={styles.notifySuccessIcon}>✅</div>
            <h3 className={styles.notifySuccessTitle}>
              {displayName ? `Thanks, ${displayName}!` : 'You\'re on the list!'}
            </h3>
            <p className={styles.notifySuccessBody}>
              We'll email you as soon as <strong>{target.productName}</strong> is back in stock.
            </p>
            <button className={styles.notifySubmitBtn} onClick={onClose}>
              Close
            </button>
          </div>
        ) : result === 'error' ? (
          /* ── Error state ─────────────────── */
          <div className={styles.notifySuccess}>
            <div className={styles.notifySuccessIcon}>⚠️</div>
            <h3 className={styles.notifySuccessTitle}>Something went wrong</h3>
            <p className={styles.notifySuccessBody}>Please try again or visit the product page to sign up.</p>
            <button className={styles.notifySubmitBtn} onClick={onClose}>Close</button>
          </div>
        ) : userEmail ? (
          /* ── Logged-in: show loading spinner while auto-submitting ── */
          <div className={styles.notifySuccess}>
            <div className={styles.notifySpinner} />
            <p className={styles.notifySuccessBody}>Saving your request…</p>
          </div>
        ) : (
          /* ── Guest: show form ─────────────── */
          <>
            <h3 className={styles.notifyTitle}>Notify me when it's back</h3>
            <p className={styles.notifySubtitle}>
              <strong>{target.productName}</strong> is currently out of stock. Enter your details below and we'll email you the moment it's available again.
            </p>
            <form onSubmit={handleGuestSubmit} className={styles.notifyForm}>
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                className={styles.notifyInput}
              />
              <input
                ref={emailRef}
                type="email"
                placeholder="Your email address *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.notifyInput}
                required
              />
              <button
                type="submit"
                disabled={loading || !email}
                className={styles.notifySubmitBtn}
              >
                {loading ? 'Saving…' : '📩 Notify Me'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Home wrapper ─────────────────────────────────────────────────────────────

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
  const [banners, setBanners] = useState<any[]>([]);
  const [promoTilesTop, setPromoTilesTop] = useState<any[]>([]);
  const [promoTilesBottom, setPromoTilesBottom] = useState<any[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Logged-in user session (for Notify Me auto-submit + personalisation)
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);

  // Notify Me modal state
  const [notifyTarget, setNotifyTarget] = useState<NotifyTarget | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const [prodData, catData, bannerRes, tilesRes, showcaseRes, sessionRes] = await Promise.all([
          getAllProducts(),
          getCategories(),
          supabase.from('banners').select('*').eq('active', true).order('sort_order'),
          supabase.from('promo_tiles').select('*').eq('active', true).order('sort_order'),
          supabase.from('homepage_showcases').select('*').eq('active', true).order('sort_order'),
          supabase.auth.getUser(),
        ]);
        setProducts(prodData.filter(p => p.status === 'published'));
        setCategories(catData);
        setBanners(bannerRes.data || []);

        // Split promo tiles by position
        const allTiles = tilesRes.data || [];
        setPromoTilesTop(allTiles.filter((t: any) => t.position !== 'bottom'));
        setPromoTilesBottom(allTiles.filter((t: any) => t.position === 'bottom'));

        setShowcases(showcaseRes.data || []);

        // Resolve logged-in user details for Notify Me
        const user = sessionRes.data?.user;
        if (user) {
          setUserEmail(user.email || null);
          const { data: customer } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
          if (customer) {
            setUserName(`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null);
            setUserFirstName(customer.first_name || null);
          }
        }
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

  // Determine if this is the curated homepage (no filters active)
  const isHome = !tagParam && !brandParam && activeCategory === 'All' && !searchQuery;

  // Resolve showcase products from product_ids for each showcase section
  const showcaseProducts = useMemo(() => {
    return showcases.map(sc => ({
      ...sc,
      products: (sc.product_ids || [])
        .map(id => products.find(p => p.id === id))
        .filter(Boolean) as Product[],
    }));
  }, [showcases, products]);

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
        {/* Hero Banner — only when not filtering */}
        {isHome && (
          <div style={{ paddingTop: '1.25rem' }}>
            <HeroBanner banners={banners} />
          </div>
        )}

        {/* Static hero fallback when no banners configured */}
        {isHome && banners.filter(b => b.active).length === 0 && (
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>Premium E-Liquids. Unmatched Quality.</h1>
            <p className={styles.heroSubtitle}>
              Carefully crafted blends designed to deliver perfect flavour profiles and dense clouds. Satisfaction in every draw.
            </p>
            <button className={styles.ctaButton} onClick={openCart}>Shop the Collection</button>
          </section>
        )}

        {/* ── CURATED HOMEPAGE ── */}
        {isHome && (
          <>
            {/* Top promo tiles */}
            <PromoTiles tiles={promoTilesTop} />

            {/* Showcase rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 0 0.75rem' }}>
              {showcaseProducts.map(sc => (
                <ShowcaseRow
                  key={sc.id}
                  title={sc.title}
                  products={sc.products}
                  linkText={sc.link_text || undefined}
                  linkCategory={sc.link_category || undefined}
                  firstName={userFirstName}
                  onNotify={(product) => setNotifyTarget({
                    productId: product.id,
                    productName: product.name,
                    variationId: product.variations?.[0]?.id || null,
                  })}
                />
              ))}
            </div>

            {/* Bottom promo tiles */}
            <PromoTiles tiles={promoTilesBottom} />

            {/* Google Reviews */}
            <CustomerReviews />
          </>
        )}

        {/* ── FILTERED PRODUCT GRID (category / tag / brand / search) ── */}
        {!isHome && (
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
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNotifyTarget({
                                  productId: product.id,
                                  productName: product.name,
                                  variationId: product.variations?.[0]?.id || null,
                                });
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
        )}
      </main>

      {/* Notify Me Modal — rendered outside main to avoid z-index / link issues */}
      <NotifyModal
        target={notifyTarget}
        userEmail={userEmail}
        userName={userName}
        onClose={() => setNotifyTarget(null)}
      />

      {/* Welcome Back popup — shows once per session for logged-in users */}
      <WelcomeBackModal />
    </>
  );
}
