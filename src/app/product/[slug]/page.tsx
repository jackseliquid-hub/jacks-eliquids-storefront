'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from './product.module.css';
import { getProductBySlug, getCompatibilityLinksForProduct, Product } from '@/lib/data';
import { DiscountRule, getDiscountRules, calculateBestPrice } from '@/lib/discounts';
import { createClient } from '@/utils/supabase/client';
import RelatedProducts from '@/components/RelatedProducts';

// Decode common HTML entities for safe attribute matching
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { addToCart, openCart, cartItems } = useCart();

  // Data state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalRules, setGlobalRules] = useState<DiscountRule[]>([]);

  // Track selected attributes and quantity
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [longDescOpen, setLongDescOpen] = useState(false);

  // Notify Me state
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyName, setNotifyName] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<'success' | 'error' | null>(null);
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [compatLinks, setCompatLinks] = useState<{ targetSlug: string; linkText: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prod, rules] = await Promise.all([
          getProductBySlug(slug),
          getDiscountRules()
        ]);
        // TEMPORARILY DISABLED: Archived product redirects are paused while
        // the product catalog is being set up. Re-enable when moving to
        // production domain to preserve SEO equity.
        // ──────────────────────────────────────────────────────────────────
        // if (prod?.status === 'archived') {
        //   const dest = prod.category
        //     ? `/?cat=${encodeURIComponent(prod.category)}`
        //     : '/';
        //   router.replace(dest);
        //   return;
        // }
        // For now, treat archived products as not found
        if (prod?.status === 'archived') {
          setProduct(null);
          return;
        }
        setProduct(prod && prod.status !== 'draft' ? prod : null);
        if (prod?.image) setMainImage(prod.image);
        setGlobalRules(rules || []);

        // Fetch compatibility links
        if (prod) {
          getCompatibilityLinksForProduct(prod.id)
            .then(links => setCompatLinks(links))
            .catch(() => {});
        }

        // Check if user is logged in
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          const { data: customer } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
          if (customer) {
            setUserName(`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null);
          }
        }
      } catch (err) {
        console.error("ProductPage: Fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // Find matching variation based on selection
  const matchingVariation = useMemo(() => {
    if (!product) return null;
    const attributeKeys = Object.keys(product.attributes || {});
    if (attributeKeys.length === 0) return null;

    const isAllSelected = attributeKeys.every(key => selectedAttributes[key]);
    if (!isAllSelected) return null;

    return product.variations?.find(v => {
      const vAttrs = v.attributes || {};
      return attributeKeys.every(key => {
        const vKey = Object.keys(vAttrs).find(k => k.toLowerCase() === key.toLowerCase());
        if (!vKey) return false;
        const normalize = (val: string) => decodeEntities(String(val)).toLowerCase().replace(/\s+/g, '').replace(/(mg|ml)$/, '');
        return normalize(vAttrs[vKey]) === normalize(selectedAttributes[key]);
      });
    });
  }, [product, selectedAttributes]);

  // Sort attribute keys: Strength first, then Flavour, then rest alphabetically
  const attributeKeys = useMemo(() => {
    const keys = Object.keys(product?.attributes || {});
    return keys.sort((a, b) => {
      const order = ['strength', 'flavour', 'flavor', 'colour', 'color', 'resistance'];
      const aIdx = order.findIndex(o => a.toLowerCase().includes(o));
      const bIdx = order.findIndex(o => b.toLowerCase().includes(o));
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [product]);

  // Compute which options are out of stock for each attribute based on other selections
  const optionStockMap = useMemo(() => {
    if (!product || !product.variations) return {};
    const map: Record<string, Record<string, boolean>> = {};
    for (const attrName of attributeKeys) {
      map[attrName] = {};
      const otherSelectedKeys = attributeKeys.filter(k => k !== attrName && selectedAttributes[k]);
      for (const value of (product.attributes[attrName] || [])) {
        const matching = product.variations.filter(v => {
          const vAttrs = v.attributes || {};
          const vKey = Object.keys(vAttrs).find(k => k.toLowerCase() === attrName.toLowerCase());
          if (!vKey) return false;
          const normalize = (val: string) => decodeEntities(String(val)).toLowerCase().replace(/\s+/g, '').replace(/(mg|ml)$/, '');
          if (normalize(vAttrs[vKey]) !== normalize(value)) return false;
          return otherSelectedKeys.every(ok => {
            const ovKey = Object.keys(vAttrs).find(k => k.toLowerCase() === ok.toLowerCase());
            if (!ovKey) return false;
            return normalize(vAttrs[ovKey]) === normalize(selectedAttributes[ok]);
          });
        });
        const hasStock = matching.some(v => v.inStock);
        map[attrName][value] = hasStock;
      }
    }
    return map;
  }, [product, attributeKeys, selectedAttributes]);

  // True if EVERY variation is out of stock (or simple product with trackStock + stockQty=0)
  // NOTE: must be declared before any early returns to satisfy Rules of Hooks
  const allVariationsOOS = useMemo(() => {
    if (!product) return false;
    const vars = product.variations || [];
    if (vars.length > 0) {
      return vars.every(v => !v.inStock);
    }
    // Simple (no-variation) product: out of stock when trackStock is on and qty <= 0
    if (product.trackStock) {
      return (product.stockQty ?? 1) <= 0;
    }
    return false;
  }, [product]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!product) return notFound();

  const isSelectionComplete = attributeKeys.length === 0 || !!matchingVariation;
  const isOutOfStock = matchingVariation ? !matchingVariation.inStock : false;

  const displayPrice = matchingVariation?.price || product.price;
  const displaySalePrice = product.salePrice || null;
  const hasSale = !!(displaySalePrice && displaySalePrice !== displayPrice);
  const description = product.description ? product.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
  const longDescription = product.longDescription?.trim() || '';

  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Check out ${product.name} from Jack's E-Liquid!`;

  function handleAttributeSelect(name: string, value: string) {
    setSelectedAttributes(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset notify state when selection changes
    setNotifyResult(null);
    setShowNotifyForm(false);
  }

  async function handleNotifyMe() {
    if (!matchingVariation || !product) return;

    // If logged in, submit directly
    if (userEmail) {
      setNotifyLoading(true);
      try {
        const res = await fetch('/api/notify-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationId: matchingVariation.id,
            productId: product.id,
            email: userEmail,
            name: userName,
          }),
        });
        const json = await res.json();
        setNotifyResult(json.success ? 'success' : 'error');
      } catch {
        setNotifyResult('error');
      }
      setNotifyLoading(false);
      return;
    }

    // Guest: show form
    setShowNotifyForm(true);
  }

  async function handleNotifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!matchingVariation || !product || !notifyEmail) return;
    setNotifyLoading(true);
    try {
      const res = await fetch('/api/notify-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationId: matchingVariation.id,
          productId: product.id,
          email: notifyEmail,
          name: notifyName || null,
        }),
      });
      const json = await res.json();
      setNotifyResult(json.success ? 'success' : 'error');
    } catch {
      setNotifyResult('error');
    }
    setNotifyLoading(false);
  }

  function handleAddToCart() {
    if (!isSelectionComplete || !product) return;

    addToCart({
      id: matchingVariation?.id || product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: displayPrice,
      category: product.category,
      tags: product.tags,
      variantName: matchingVariation ? Object.values(matchingVariation.attributes).join(' / ') : undefined,
      weight: product.weight,
      shippingClass: product.shippingClass
    }, quantity);
    openCart();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(productUrl);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  // Calculate actual current prices and dynamic tiers
  const cartItemQty = cartItems.find(i => i.id === (matchingVariation?.id || product.id))?.quantity || 0;
  const projectedTotalQty = cartItemQty + quantity;

  // We find the BEST overall rule that targets this product based on 1 item to show the table
  const activeDiscountTemplate = globalRules.find(rule => {
    if (rule.type === 'product' && rule.targetValues.includes(product.id)) return true;
    if (rule.type === 'category' && product.category && rule.targetValues.includes(product.category)) return true;
    if (rule.type === 'tag' && product.tags && product.tags.some(t => rule.targetValues.includes(t))) return true;
    return false;
  });
  
  // Now evaluate the real-time dynamic best price based ONLY on projected qty
  const { price: currentTierPrice, formattedPrice: currentTierFormatted } = calculateBestPrice(displayPrice, projectedTotalQty, product, globalRules);
  const originalBasePriceNum = parseFloat(displayPrice.replace(/[^0-9.]/g, ''));
  const isDiscountActive = currentTierPrice < (originalBasePriceNum - 0.01);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.breadcrumbs}>
          <Link href="/" className={styles.breadcrumbLink}>Shop</Link>
          <span className={styles.breadcrumbSep}>›</span>
          {product.category && (
            <>
              <Link href={`/?cat=${encodeURIComponent(product.category)}`} className={styles.breadcrumbLink}>
                {product.category}
              </Link>
              <span className={styles.breadcrumbSep}>›</span>
            </>
          )}
          <span className={styles.breadcrumbCurrent}>{product.name}</span>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Left: Image */}
        <div className={styles.imagePanel}>
          <div className={styles.mainImageWrapper} style={{ position: 'relative' }}>
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt={product.name} className={styles.productImage} style={allVariationsOOS ? { filter: 'grayscale(60%) opacity(0.75)' } : undefined} />
            ) : (
              <div className={styles.imagePlaceholder}>📦</div>
            )}
            {allVariationsOOS && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
              }}>
                <span style={{
                  background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '1.1rem', fontWeight: 800,
                  padding: '0.5rem 1.5rem', borderRadius: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>Out of Stock</span>
              </div>
            )}
          </div>
          
          {/* Gallery Thumbnails */}
          {((product.gallery && product.gallery.length > 0) || product.image) && (
            <div className={styles.galleryStrip}>
              {product.image && (
                <div 
                  className={`${styles.galleryThumb} ${mainImage === product.image ? styles.thumbActive : ''}`} 
                  onClick={() => setMainImage(product.image)}
                >
                  <img src={product.image} alt={product.name} />
                </div>
              )}
              {product.gallery?.map((img, i) => (
                <div 
                  key={img || i} 
                  className={`${styles.galleryThumb} ${mainImage === img ? styles.thumbActive : ''}`} 
                  onClick={() => setMainImage(img)}
                >
                  <img src={img} alt={`${product.name} - image ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className={styles.detailsPanel}>
          <div className={styles.productHeader}>
            <h1 className={styles.productName}>{product.name}</h1>

            {hasSale ? (
              <div className={styles.priceBlock}>
                <span className={styles.originalPrice}>{displayPrice}</span>
                <span className={styles.salePrice}>{displaySalePrice}</span>
                <span className={styles.saleBadge}>On Sale</span>
              </div>
            ) : isDiscountActive ? (
              <div className={styles.priceBlock}>
                <span className={styles.originalPrice}>{displayPrice}</span>
                <span className={styles.salePrice}>{currentTierFormatted}</span>
                <span className={styles.saleBadge} style={{backgroundColor: 'var(--deep-teal)'}}>Bulk Value</span>
              </div>
            ) : (
              <p className={styles.price}>{displayPrice}</p>
            )}
          </div>

          <hr className={styles.divider} />

          {/* Variation Selectors */}
          {attributeKeys.length > 0 && (
            <div className={styles.variations}>
              {attributeKeys.map(attrName => (
                <div key={attrName} className={styles.variationGroup}>
                  <label htmlFor={`attr-${attrName}`} className={styles.variationLabel}>
                    {attrName}
                  </label>
                  <select
                    id={`attr-${attrName}`}
                    className={styles.select}
                    value={selectedAttributes[attrName] || ''}
                    onChange={(e) => handleAttributeSelect(attrName, e.target.value)}
                  >
                    <option value="" disabled>Choose {attrName}</option>
                    {[...(product.attributes[attrName] || [])].sort((a, b) =>
                      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
                    ).map(value => {
                      const inStock = optionStockMap[attrName]?.[value] !== false;
                      return (
                        <option key={value} value={value} className={!inStock ? styles.oosOption : ''}>
                          {value}{!inStock ? ' (Out of Stock)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* OOS + Notify Me — directly after dropdowns for visibility */}
          {isSelectionComplete && isOutOfStock && (
            <div className={styles.notifySection}>
              <div className={styles.oosBadge}>Out of Stock</div>
              {notifyResult === 'success' ? (
                <div className={styles.notifySuccess}>
                  ✅ We&apos;ll email you when this is back in stock!
                </div>
              ) : showNotifyForm && !userEmail ? (
                <form onSubmit={handleNotifySubmit} className={styles.notifyForm}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={notifyName}
                    onChange={(e) => setNotifyName(e.target.value)}
                    className={styles.notifyInput}
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className={styles.notifyInput}
                    required
                  />
                  <button
                    type="submit"
                    disabled={notifyLoading || !notifyEmail}
                    className={styles.notifySubmitBtn}
                  >
                    {notifyLoading ? 'Submitting...' : '📩 Notify Me'}
                  </button>
                  {notifyResult === 'error' && (
                    <p className={styles.notifyError}>Something went wrong. Please try again.</p>
                  )}
                </form>
              ) : (
                <button
                  className={styles.notifyBtn}
                  onClick={handleNotifyMe}
                  disabled={notifyLoading}
                >
                  {notifyLoading ? '⏳ Saving...' : '🔔 Notify Me When Available'}
                </button>
              )}
            </div>
          )}

          {description && <p className={styles.description}>{description}</p>}
          
          {/* ─── Bulk Savings Table ─────────────────────────────────────── */}
          {activeDiscountTemplate && activeDiscountTemplate.ranges.length > 0 && (
            <div className={styles.bulkSavingsWrapper}>
              <h3 className={styles.bulkTitle}>Bulk Savings:</h3>
              <table className={styles.bulkTable}>
                <thead>
                  <tr>
                    <th>Total Product Qty</th>
                    <th>Discount</th>
                    <th>Price Each</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDiscountTemplate.ranges.sort((a,b) => a.min - b.min).map(range => {
                    let p = originalBasePriceNum;
                    let dText = '';
                    if (range.type === 'percent') {
                      p = originalBasePriceNum * (1 - (range.value / 100));
                      dText = `${range.value}% Off`;
                    } else {
                      p = range.value;
                      dText = `£${(originalBasePriceNum - p).toFixed(2)} Off`;
                    }
                    const l = range.label || `${range.min}${range.max ? '-' + range.max : '+'}`;
                    
                    return (
                      <tr key={range.id}>
                        <td>{l}</td>
                        <td>{dText}</td>
                        <td>£{p.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Dynamic Savings Nudge */}
              {(() => {
                const sortedRanges = [...activeDiscountTemplate.ranges].sort((a, b) => a.min - b.min);
                const nextTargetRange = sortedRanges.find(r => r.min > projectedTotalQty);
                
                if (nextTargetRange) {
                  let nextPrice = originalBasePriceNum;
                  if (nextTargetRange.type === 'percent') {
                    nextPrice = originalBasePriceNum * (1 - (nextTargetRange.value / 100));
                  } else {
                    nextPrice = nextTargetRange.value;
                  }
                  
                  const neededGoal = nextTargetRange.min - cartItemQty;
                  
                  if (quantity >= neededGoal) {
                    return (
                      <div className={styles.savingsNudge}>
                        🥳 <strong>Save More!</strong> Add <strong>{quantity}</strong> more to your cart and pay just <strong>£{nextPrice.toFixed(2)}</strong> per unit!
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.savingsNudge}>
                        🚀 <strong>Add {neededGoal} items</strong> to your cart & pay just <strong>£{nextPrice.toFixed(2)}</strong> per unit!
                      </div>
                    );
                  }
                } else if (isDiscountActive) {
                   return (
                     <div className={styles.savingsNudge}>
                       🥳 <strong>Best Value!</strong> You have reached our lowest available price.
                     </div>
                   );
                }
                return null;
              })()}
            </div>
          )}

          <div className={styles.purchaseSection}>
              {allVariationsOOS ? (
                /* ── Fully out of stock: notify-only ── */
                <div className={styles.notifySection} style={{ marginTop: 0 }}>
                  <div className={styles.oosBadge}>⚠️ Currently Out of Stock</div>
                  <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: '0.5rem 0 1rem' }}>
                    Sign up below and we&apos;ll email you the moment this is back.
                  </p>
                  {notifyResult === 'success' ? (
                    <div className={styles.notifySuccess}>
                      ✅ You&apos;re on the list! We&apos;ll email you when this is back in stock.
                    </div>
                  ) : showNotifyForm && !userEmail ? (
                    <form onSubmit={handleNotifySubmit} className={styles.notifyForm}>
                      <input type="text" placeholder="Your name" value={notifyName} onChange={e => setNotifyName(e.target.value)} className={styles.notifyInput} />
                      <input type="email" placeholder="Your email *" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} className={styles.notifyInput} required />
                      <button type="submit" disabled={notifyLoading || !notifyEmail} className={styles.notifySubmitBtn}>
                        {notifyLoading ? 'Submitting...' : '📩 Notify Me'}
                      </button>
                      {notifyResult === 'error' && <p className={styles.notifyError}>Something went wrong. Please try again.</p>}
                    </form>
                  ) : (
                    <button
                      className={styles.notifyBtn}
                      onClick={() => {
                        if (userEmail) {
                          // Submit directly — but need a productId not variationId for whole-product OOS
                          setNotifyLoading(true);
                          fetch('/api/notify-stock', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId: product.id, email: userEmail, name: userName }),
                          }).then(r => r.json()).then(j => setNotifyResult(j.success ? 'success' : 'error')).catch(() => setNotifyResult('error')).finally(() => setNotifyLoading(false));
                        } else {
                          setShowNotifyForm(true);
                        }
                      }}
                      disabled={notifyLoading}
                    >
                      {notifyLoading ? '⏳ Saving...' : '🔔 Notify Me When Available'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.qtyContainer}>
                    <span className={styles.variationLabel}>Quantity</span>
                    <div className={styles.qtyControls}>
                      <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                      <span className={styles.qtyValue}>{quantity}</span>
                      <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(q => q + 1)} aria-label="Increase quantity">+</button>
                    </div>
                  </div>

                  <button
                    className={styles.cartButton}
                    onClick={handleAddToCart}
                    disabled={!isSelectionComplete || isOutOfStock}
                  >
                    {isSelectionComplete ? (isOutOfStock ? 'Out of Stock' : 'Add to Bag') : 'Select Options'}
                  </button>
                </>
              )}
          </div>

          {/* Compatibility Links Banner */}
          {compatLinks.length > 0 && (
            <div className={styles.compatLinks}>
              {compatLinks.map((cl, i) => (
                <Link key={i} href={`/product/${cl.targetSlug}`} className={styles.compatLink}>
                  🚀 {cl.linkText}
                </Link>
              ))}
            </div>
          )}

          {/* Product Meta: Brand, Category, Tags */}
          {(product.brand || product.category || (product.tags && product.tags.length > 0)) && (
            <div className={styles.productMeta}>
              <div className={styles.metaPills}>
                {product.brand && (
                  <Link href={`/?brand=${encodeURIComponent(product.brand)}`} className={styles.metaPill}>
                    {product.brand}
                  </Link>
                )}
                {product.category && (
                  <Link href={`/?cat=${encodeURIComponent(product.category)}`} className={styles.metaPill}>
                    {product.category}
                  </Link>
                )}
              </div>
              {product.tags && product.tags.length > 0 && (
                <div className={styles.metaTags}>
                  <span className={styles.metaTagLabel}>Tags</span>
                  <div className={styles.metaTagList}>
                    {product.tags.map(tag => (
                      <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`} className={styles.metaTag}>
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Share Buttons */}
          <div className={styles.shareSection}>
            <span className={styles.shareLabel}>Share</span>
            <div className={styles.shareButtons}>
              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shareBtn}
                aria-label="Share on Facebook"
                title="Share on Facebook"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>

              {/* X / Twitter */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shareBtn}
                aria-label="Share on X"
                title="Share on X"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + productUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shareBtn}
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(productUrl)}`}
                className={styles.shareBtn}
                aria-label="Share via Email"
                title="Share via Email"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </a>

              {/* Copy Link */}
              <button
                className={styles.shareBtn}
                onClick={handleCopyLink}
                aria-label="Copy link"
                title="Copy link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              </button>
            </div>
            {shareToast && <span className={styles.shareToast}>Link copied!</span>}
          </div>

          {/* Long Description Accordion */}
          {longDescription && (
            <div className={styles.longDescAccordion}>
              <button
                className={styles.longDescToggle}
                onClick={() => setLongDescOpen(prev => !prev)}
                aria-expanded={longDescOpen}
              >
                <span>Find out more about {product.name}</span>
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: longDescOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                className={styles.longDescContent}
                style={{
                  maxHeight: longDescOpen ? '2000px' : '0',
                  opacity: longDescOpen ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.4s ease, opacity 0.3s ease',
                }}
              >
                <div className={styles.longDescText}>
                  {longDescription.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '1rem 0 0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>{line.replace('## ', '')}</h3>;
                    if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '0.75rem 0 0.4rem', fontSize: '0.95rem', fontWeight: 600 }}>{line.replace('### ', '')}</h4>;
                    if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: '1.25rem', marginBottom: '0.25rem' }}>{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} style={{ margin: '0.4rem 0', lineHeight: 1.7 }}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                  })}
                </div>
              </div>
            </div>
          )}

          <div className={styles.metaInfo}>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {product && <RelatedProducts currentProduct={product} />}
    </div>
  );
}
