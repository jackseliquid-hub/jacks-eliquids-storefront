'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/utils/supabase/client';
import { getEnabledShippingMethodsForCountry, calculateAllQuotes, ShippingQuote } from '@/lib/shipping';
import { processOrder } from './actions';
import styles from './checkout.module.css';

const InputGroup = ({ label, name, defaultValue, type = 'text', required = false }: any) => (
  <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
    <label>{label} {required && '*'}</label>
    <input name={name} type={type} defaultValue={defaultValue} required={required} />
  </div>
);

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function CheckoutAuthGate({ onGuest, cartItems, shippingQuote, cartSubtotal, getCalculatedItemPrice }: any) {
  const [mode, setMode] = useState<'choose' | 'login' | 'register'>('choose');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) { setAuthError(error.message); setAuthLoading(false); }
    else { router.refresh(); window.location.reload(); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { data: { first_name: regFirst, last_name: regLast } }
    });
    if (error) { setAuthError(error.message); setAuthLoading(false); }
    else { router.refresh(); window.location.reload(); }
  }

  const finalTotal = parseFloat(cartSubtotal.replace(/[^0-9.]/g, '')) + (shippingQuote?.shippingCost || 0);

  return (
    <div className={styles.checkoutContainer}>
      <header className={styles.checkoutHeader}>
        <Link href="/">
          <Image src="/logo.png" alt="Jack's E-Liquid" width={140} height={50} className={styles.logo} />
        </Link>
      </header>

      <div className={styles.checkoutBody}>
        {/* Left: Auth Gate */}
        <div>
          {mode === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className={styles.sectionTitle}>How would you like to continue?</h2>

              {/* Login Option */}
              <div
                onClick={() => setMode('login')}
                style={{
                  border: '2px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem',
                  cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s',
                  display: 'flex', gap: '1rem', alignItems: 'flex-start'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <span style={{ fontSize: '2rem' }}>🔑</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>Sign In to Your Account</p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Your saved addresses will be pre-filled. Track your orders easily.</p>
                </div>
              </div>

              {/* Register Option */}
              <div
                onClick={() => setMode('register')}
                style={{
                  border: '2px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem',
                  cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s',
                  display: 'flex', gap: '1rem', alignItems: 'flex-start'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <span style={{ fontSize: '2rem' }}>✨</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>Create an Account</p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Save your details for faster checkout next time. View order history.</p>
                </div>
              </div>

              {/* Guest Option */}
              <div
                onClick={onGuest}
                style={{
                  border: '2px dashed #d1d5db', borderRadius: '12px', padding: '1.5rem',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                  display: 'flex', gap: '1rem', alignItems: 'flex-start'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#9ca3af'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#d1d5db'; }}
              >
                <span style={{ fontSize: '2rem' }}>👤</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>Continue as Guest</p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>No account needed. You can create one after checkout.</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div>
              <button onClick={() => setMode('choose')} style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', marginBottom: '1rem', padding: 0, fontSize: '0.9rem' }}>
                ← Back
              </button>
              <h2 className={styles.sectionTitle}>Sign In</h2>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label>Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Password</label>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="••••••••" />
                  <div style={{ textAlign: 'right', marginTop: '4px' }}>
                    <Link href="/forgot-password" style={{ fontSize: '0.82rem', color: '#0d9488' }}>Forgot password?</Link>
                  </div>
                </div>
                {authError && <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.75rem', borderRadius: '6px', margin: 0, fontSize: '0.85rem' }}>{authError}</p>}
                <button type="submit" className={styles.checkoutBtn} disabled={authLoading}>
                  {authLoading ? 'Signing in...' : 'Sign In & Continue'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                  Or{' '}<button type="button" onClick={onGuest} style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', padding: 0 }}>continue as guest</button>
                </p>
              </form>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <button onClick={() => setMode('choose')} style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', marginBottom: '1rem', padding: 0, fontSize: '0.9rem' }}>
                ← Back
              </button>
              <h2 className={styles.sectionTitle}>Create Account</h2>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>First Name *</label>
                    <input type="text" value={regFirst} onChange={e => setRegFirst(e.target.value)} required placeholder="Jane" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Last Name *</label>
                    <input type="text" value={regLast} onChange={e => setRegLast(e.target.value)} required placeholder="Smith" />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Email *</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Password *</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="Min. 8 characters" minLength={8} />
                </div>
                {authError && <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.75rem', borderRadius: '6px', margin: 0, fontSize: '0.85rem' }}>{authError}</p>}
                <button type="submit" className={styles.checkoutBtn} disabled={authLoading}>
                  {authLoading ? 'Creating account...' : 'Create Account & Continue'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                  Or{' '}<button type="button" onClick={onGuest} style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', padding: 0 }}>continue as guest</button>
                </p>
              </form>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <aside className={styles.summarySection}>
          <h2 className={styles.sectionTitle}>Order Summary</h2>
          <div className={styles.itemList}>
            {cartItems.map((item: any, i: number) => {
              const priceInfo = getCalculatedItemPrice(item);
              return (
                <div key={i} className={styles.itemRow}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className={styles.itemImage} />
                  ) : <div className={styles.itemImage} />}
                  <div className={styles.itemDetails}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.variantName && <span className={styles.itemVariant}>{item.variantName}</span>}
                    <span className={styles.itemVariant}>Qty: {item.quantity}</span>
                  </div>
                  <span className={styles.itemPrice}>{priceInfo.formattedPrice}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.totalsBlock}>
            <div className={styles.totalRow}>
              <span>Subtotal</span><span>{cartSubtotal}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Shipping</span><span>{shippingQuote?.formattedCost || '—'}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Total</span><span>£{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Main Checkout Page ───────────────────────────────────────────────────────
// ─── Order Bump Types ──────────────────────────────────────────────────────
interface BumpConfig {
  id: string; title: string; status: string; display_mode: string;
  trigger_products: { id: string; name: string }[];
  offer_product: { id: string; name: string; slug: string; image: string; price: string; variations: string[] } | null;
  default_variation: string; discount_value: number; discount_type: string;
  allow_multiple: boolean; max_qty: number; checkbox_text: string;
  description: string; sort_order: number;
}

// ─── Order Bump Component ──────────────────────────────────────────────────
function OrderBumpSection({ bumps, cartItems, addToCart, removeFromCart }: {
  bumps: BumpConfig[]; cartItems: any[]; addToCart: any; removeFromCart: any;
}) {
  const [selectedVar, setSelectedVar] = useState<Record<string, string>>({});

  // Filter: only show bumps whose offer product isn't already in the cart organically
  const visibleBumps = bumps.filter(b => {
    if (!b.offer_product) return false;
    // Check targeting: 'all' shows always, 'specific' only if a trigger product is in cart
    if (b.display_mode === 'specific') {
      const triggerIds = b.trigger_products.map(t => t.id);
      const cartProductIds = cartItems.filter((c: any) => !c.orderBump).map((c: any) => c.productId || c.id);
      if (!triggerIds.some(tid => cartProductIds.includes(tid))) return false;
    }
    return true;
  });

  if (visibleBumps.length === 0) return null;

  const calcBumpPrice = (b: BumpConfig) => {
    const base = parseFloat((b.offer_product?.price || '0').replace(/[^0-9.]/g, ''));
    return b.discount_type === '£' ? Math.max(0, base - b.discount_value) : base * (1 - b.discount_value / 100);
  };

  return (
    <div>
      <h2 className={styles.sectionTitle}>🎯 Special Offers</h2>
      {visibleBumps.map(bump => {
        if (!bump.offer_product) return null;
        const bumpPrice = calcBumpPrice(bump);
        const origPrice = parseFloat((bump.offer_product.price || '0').replace(/[^0-9.]/g, ''));
        const hasVariations = bump.offer_product.variations.length > 0;
        const currentVar = selectedVar[bump.id] || bump.default_variation || (hasVariations ? '' : '__none__');

        // Find bump items already in cart for THIS bump
        const bumpItemsInCart = cartItems.filter((c: any) =>
          c.orderBump && (c.productId || c.id) === bump.offer_product!.id
        );
        const isSingleChecked = bumpItemsInCart.length > 0;

        const addBumpItem = (variation?: string) => {
          const itemId = variation
            ? `${bump.offer_product!.id}_bump_${variation.replace(/\s+/g, '_')}`
            : `${bump.offer_product!.id}_bump`;
          // Check if already added
          if (cartItems.find((c: any) => c.id === itemId)) return;
          addToCart({
            id: itemId,
            productId: bump.offer_product!.id,
            slug: bump.offer_product!.slug,
            name: bump.offer_product!.name,
            image: bump.offer_product!.image,
            price: bump.offer_product!.price,
            variantName: variation || undefined,
            weight: 0,
            orderBump: true,
            bumpDiscount: { value: bump.discount_value, type: bump.discount_type as '£' | '%' },
          }, 1);
        };

        const removeBumpItem = (itemId: string) => removeFromCart(itemId);

        const handleSingleToggle = () => {
          if (isSingleChecked) {
            bumpItemsInCart.forEach((c: any) => removeFromCart(c.id));
          } else {
            addBumpItem(currentVar === '__none__' ? undefined : currentVar);
          }
        };

        return (
          <div key={bump.id} className={styles.bumpCard}>
            <div className={styles.bumpHeader} onClick={!bump.allow_multiple ? handleSingleToggle : undefined}>
              {!bump.allow_multiple && (
                <input type="checkbox" className={styles.bumpCheckbox}
                  checked={isSingleChecked} onChange={handleSingleToggle} />
              )}
              <label>{bump.checkbox_text}</label>
            </div>
            <div className={styles.bumpBody}>
              <div className={styles.bumpTop}>
                <div className={styles.bumpImage}>
                  {bump.offer_product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bump.offer_product.image} alt={bump.offer_product.name} />
                  )}
                </div>
                <p className={styles.bumpDesc}>{bump.description}</p>
              </div>

              {hasVariations && (
                <select className={styles.bumpVariation} value={currentVar}
                  onChange={e => setSelectedVar(prev => ({ ...prev, [bump.id]: e.target.value }))}>
                  <option value="">-- Choose Option --</option>
                  {bump.offer_product.variations.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              )}

              {bump.allow_multiple ? (
                <>
                  <button className={styles.bumpAddBtn}
                    disabled={hasVariations && !currentVar}
                    onClick={() => {
                      if (bumpItemsInCart.length >= bump.max_qty) return;
                      addBumpItem(currentVar === '__none__' ? undefined : currentVar);
                    }}>
                    Add to Order (£{bumpPrice.toFixed(2)})
                  </button>
                  {bumpItemsInCart.length > 0 && (
                    <div className={styles.bumpAddedList}>
                      <p className={styles.bumpAddedTitle}>Added ({bumpItemsInCart.length}/{bump.max_qty}):</p>
                      {bumpItemsInCart.map((c: any) => (
                        <div key={c.id} className={styles.bumpAddedItem}>
                          <span>{c.variantName || bump.offer_product!.name}</span>
                          <button className={styles.bumpRemoveBtn} onClick={() => removeBumpItem(c.id)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.bumpPrice}>
                  £{bumpPrice.toFixed(2)}
                  {origPrice > bumpPrice && <span className={styles.bumpPriceOld}>£{origPrice.toFixed(2)}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Checkout Page ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartSubtotal, getCalculatedItemPrice, addToCart, removeFromCart, isMounted } = useCart();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [shipDifferent, setShipDifferent] = useState(false);
  const billingObj = profile?.billing_address || {};
  const shippingObj = profile?.shipping_address || {};

  const [paymentMethod, setPaymentMethod] = useState<'viva' | 'bacs'>('viva');
  const [shippingOptions, setShippingOptions] = useState<ShippingQuote[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingQuote | null>(null);

  // Country dropdown — populated from shipping zones
  const [availableCountries, setAvailableCountries] = useState<string[]>(['United Kingdom (UK)']);
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom (UK)');

  // Discount code
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountApplying, setDiscountApplying] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    description: string;
    discountAmount: number;
  } | null>(null);

  // Customer notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Order bumps
  const [activeBumps, setActiveBumps] = useState<BumpConfig[]>([]);

  // Load shipping methods for a country
  const loadShippingForCountry = useCallback(async (country: string) => {
    const methods = await getEnabledShippingMethodsForCountry(country);
    const quotes = calculateAllQuotes(methods, cartItems);
    setShippingOptions(quotes);
    if (quotes.length > 0) setSelectedShipping(quotes[0]);
    else setSelectedShipping(null);
  }, [cartItems]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: customerData } = await supabase.from('customers').select('*').eq('id', user.id).single();
        if (customerData) setProfile(customerData);
      }

      if (!isMounted) return;
      if (cartItems.length === 0) { router.push('/'); return; }

      // Fetch all shipping zones to build country dropdown
      const { data: zones } = await supabase
        .from('shipping_zones')
        .select('countries')
        .order('sort_order', { ascending: true });

      if (zones && zones.length > 0) {
        const allCountries: string[] = [];
        zones.forEach((z: any) => {
          if (z.countries && Array.isArray(z.countries)) {
            z.countries.forEach((c: string) => {
              if (!allCountries.includes(c)) allCountries.push(c);
            });
          }
        });
        if (allCountries.length > 0) {
          setAvailableCountries(allCountries);
          // Set default: prefer UK, else first
          if (!allCountries.includes('United Kingdom (UK)')) {
            setSelectedCountry(allCountries[0]);
          }
        }
      }

      await loadShippingForCountry('United Kingdom (UK)');

      // Fetch active order bumps
      const { data: bumpRows } = await supabase.from('order_bumps').select('*').eq('status', 'active').order('sort_order', { ascending: true });
      if (bumpRows) setActiveBumps(bumpRows as BumpConfig[]);

      setLoading(false);
    }
    loadData();
  }, [cartItems, isMounted, router, loadShippingForCountry]);

  // Re-fetch shipping when country changes
  async function handleCountryChange(country: string) {
    setSelectedCountry(country);
    await loadShippingForCountry(country);
  }

  // Apply discount code
  async function handleApplyDiscount() {
    if (!discountInput.trim()) return;
    setDiscountApplying(true);
    setDiscountError('');

    try {
      const subtotalNum = parseFloat(cartSubtotal.replace(/[^0-9.]/g, ''));
      const res = await fetch('/api/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountInput.trim(), subtotal: subtotalNum }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setDiscountError(data.error || 'Invalid code');
      } else {
        setAppliedDiscount({
          code: data.code,
          description: data.description,
          discountAmount: data.discountAmount,
        });
        setDiscountError('');
      }
    } catch {
      setDiscountError('Failed to validate code');
    }
    setDiscountApplying(false);
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountInput('');
    setDiscountError('');
  }

  if (loading || (shippingOptions.length === 0 && availableCountries.length > 0)) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>Loading Checkout...</div>;
  }

  // Show gate for unauthenticated users who haven't chosen yet
  if (!isLoggedIn && !guestMode) {
    return (
      <CheckoutAuthGate
        onGuest={() => setGuestMode(true)}
        cartItems={cartItems}
        shippingQuote={selectedShipping}
        cartSubtotal={cartSubtotal}
        getCalculatedItemPrice={getCalculatedItemPrice}
      />
    );
  }

  const subtotalNum = parseFloat(cartSubtotal.replace(/[^0-9.]/g, ''));
  const shippingCost = selectedShipping?.shippingCost ?? 0;
  const couponDiscount = appliedDiscount?.discountAmount ?? 0;
  const finalTotal = subtotalNum + shippingCost - couponDiscount;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const shipDifferentDOM = formData.get('ship_to_different_checkbox') === 'on';

    const payload = {
      paymentMethod,
      cartItems,
      selectedShipping: selectedShipping!,
      shipToDifferent: shipDifferentDOM,
      billingAddress: {
        first_name: formData.get('b_first_name') as string,
        last_name:  formData.get('b_last_name') as string,
        country:    formData.get('b_country') as string,
        address:    formData.get('b_address') as string,
        city:       formData.get('b_city') as string,
        county:     formData.get('b_county') as string,
        postcode:   formData.get('b_postcode') as string,
        phone:      formData.get('b_phone') as string,
        email:      formData.get('b_email') as string,
      },
      shippingAddress: shipDifferentDOM ? {
        first_name: formData.get('s_first_name') as string,
        last_name:  formData.get('s_last_name') as string,
        country:    formData.get('s_country') as string,
        address:    formData.get('s_address') as string,
        city:       formData.get('s_city') as string,
        county:     formData.get('s_county') as string,
        postcode:   formData.get('s_postcode') as string,
        phone:      formData.get('s_phone') as string,
        email:      formData.get('s_email') as string,
      } : null,
      discountCode: appliedDiscount?.code || null,
      couponDiscount,
      customerNotes: customerNotes.trim() || null,
    };

    try {
      const res = await processOrder(payload);
      if (res.error) {
        setSubmitError(res.error);
        setSubmitting(false);
      } else if (res.redirectUrl) {
        localStorage.removeItem('jacks-cart');
        window.location.href = res.redirectUrl;
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.checkoutContainer}>
      <header className={styles.checkoutHeader}>
        <Link href="/">
          <Image src="/logo.png" alt="Jack's E-Liquid" width={140} height={50} className={styles.logo} />
        </Link>
        {!isLoggedIn && (
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Checking out as guest —{' '}
            <button onClick={() => setGuestMode(false)} style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', padding: 0 }}>
              sign in instead
            </button>
          </span>
        )}
      </header>

      <div className={styles.checkoutBody}>
        {/* Left: Forms */}
        <div>
          <form className={styles.formSection} onSubmit={handleSubmit}>
            <h2 className={styles.sectionTitle}>Billing Details</h2>

            {/* EMAIL FIRST — for abandoned cart capture */}
            <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ marginBottom: '1.25rem' }}>
              <InputGroup label="Email address" name="b_email" type="email" defaultValue={billingObj.email || profile?.email || ''} required />
            </div>

            <div className={styles.formGrid}>
              <InputGroup label="First name" name="b_first_name" defaultValue={billingObj.first_name || profile?.first_name || ''} required />
              <InputGroup label="Last name"  name="b_last_name"  defaultValue={billingObj.last_name  || profile?.last_name  || ''} required />
            </div>

            <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ marginBottom: '1rem' }}>
              <label>Country / Region *</label>
              <select
                name="b_country"
                value={selectedCountry}
                onChange={e => handleCountryChange(e.target.value)}
                required
              >
                {availableCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGrid}>
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <InputGroup label="Street address" name="b_address"  defaultValue={billingObj.address  || ''} required />
              </div>
              <InputGroup label="Town / City"       name="b_city"    defaultValue={billingObj.city     || ''} required />
              <InputGroup label="County (optional)" name="b_county"  defaultValue={billingObj.county   || ''} />
              <InputGroup label="Postcode"          name="b_postcode" defaultValue={billingObj.postcode || ''} required />
              <InputGroup label="Phone"             name="b_phone"   defaultValue={billingObj.phone || profile?.phone || ''} required />
            </div>

            {/* Shipping Toggle */}
            <h3 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                name="ship_to_different_checkbox"
                checked={shipDifferent}
                onChange={e => setShipDifferent(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }} onClick={() => setShipDifferent(!shipDifferent)}>
                Ship to a different address?
              </label>
            </h3>

            {shipDifferent && (
              <div style={{ padding: '1.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div className={styles.formGrid}>
                  <InputGroup label="First name" name="s_first_name" defaultValue={shippingObj.first_name || ''} required />
                  <InputGroup label="Last name"  name="s_last_name"  defaultValue={shippingObj.last_name  || ''} required />
                </div>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ marginBottom: '1rem' }}>
                  <label>Country / Region *</label>
                  <select name="s_country" defaultValue={shippingObj.country || 'United Kingdom (UK)'} required>
                    {availableCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGrid}>
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <InputGroup label="Street address" name="s_address"  defaultValue={shippingObj.address  || ''} required />
                  </div>
                  <InputGroup label="Town / City"       name="s_city"    defaultValue={shippingObj.city     || ''} required />
                  <InputGroup label="County (optional)" name="s_county"  defaultValue={shippingObj.county   || ''} />
                  <InputGroup label="Postcode"          name="s_postcode" defaultValue={shippingObj.postcode || ''} required />
                  <InputGroup label="Phone"             name="s_phone"   defaultValue={shippingObj.phone    || ''} required />
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <InputGroup label="Email address" name="s_email" type="email" defaultValue={shippingObj.email || ''} required />
                  </div>
                </div>
              </div>
            )}

            {/* ── Order Notes ─────────────────────────────────────── */}
            <div className={styles.notesSection}>
              <div className={styles.inputGroup}>
                <label>Order Notes (optional)</label>
                <textarea
                  placeholder="Special delivery instructions, gift messages, etc."
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                />
              </div>
            </div>

            {/* ── Shipping Method Selector ─────────────────────────── */}
            <h2 className={styles.sectionTitle}>Shipping</h2>
            <div className={styles.shippingOptions}>
              {shippingOptions.map(opt => (
                <label
                  key={opt.methodId}
                  className={`${styles.shippingOption} ${selectedShipping?.methodId === opt.methodId ? styles.shippingOptionActive : ''}`}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={opt.methodId}
                    checked={selectedShipping?.methodId === opt.methodId}
                    onChange={() => setSelectedShipping(opt)}
                    style={{ display: 'none' }}
                  />
                  <span className={styles.shippingRadio} />
                  <span className={styles.shippingLabel}>{opt.label}</span>
                  <span className={styles.shippingCost}>{opt.formattedCost}</span>
                </label>
              ))}
              {shippingOptions.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '0.75rem' }}>No shipping methods available for this country.</p>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.25rem 0 0' }}>
              Cart weight: {selectedShipping?.totalWeight ?? 0}g
            </p>

            {/* ── Order Bumps ──────────────────────────────────────── */}
            {activeBumps.length > 0 && (
              <OrderBumpSection
                bumps={activeBumps}
                cartItems={cartItems}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
              />
            )}

            <h2 className={styles.sectionTitle}>Payment Method</h2>
            <div className={styles.paymentMethodsGrid}>
              <label className={`${styles.paymentOption} ${paymentMethod === 'viva' ? styles.paymentOptionActive : ''}`}>
                <input type="radio" name="paymentMethod" value="viva" checked={paymentMethod === 'viva'} onChange={() => setPaymentMethod('viva')} />
                <div className={styles.paymentOptionDetails}>
                  <strong>Credit / Debit Card</strong>
                  <span>Pay securely via Viva Wallet</span>
                </div>
              </label>
              <label className={`${styles.paymentOption} ${paymentMethod === 'bacs' ? styles.paymentOptionActive : ''}`}>
                <input type="radio" name="paymentMethod" value="bacs" checked={paymentMethod === 'bacs'} onChange={() => setPaymentMethod('bacs')} />
                <div className={styles.paymentOptionDetails}>
                  <strong>Direct Bank Transfer (BACS)</strong>
                  <span>Your order stays pending until we confirm payment.</span>
                </div>
              </label>
            </div>

            {submitError && <div className={styles.errorMessage}>{submitError}</div>}

            <button type="submit" className={styles.checkoutBtn} disabled={submitting}>
              {submitting ? 'Processing...' : (paymentMethod === 'viva' ? 'Proceed to Payment (Card)' : 'Confirm Order (BACS)')}
            </button>
          </form>
        </div>

        {/* Right: Order Summary */}
        <aside className={styles.summarySection}>
          <h2 className={styles.sectionTitle}>Order Summary</h2>
          <div className={styles.itemList}>
            {cartItems.map((item, i) => {
              const priceInfo = getCalculatedItemPrice(item);
              return (
                <div key={i} className={styles.itemRow}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className={styles.itemImage} />
                  ) : <div className={styles.itemImage} />}
                  <div className={styles.itemDetails}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.variantName && <span className={styles.itemVariant}>{item.variantName}</span>}
                    <span className={styles.itemVariant}>Qty: {item.quantity}</span>
                  </div>
                  <span className={styles.itemPrice}>{priceInfo.formattedPrice}</span>
                </div>
              );
            })}
          </div>

          {/* ── Discount Code ─────────────────────────────────── */}
          <div className={styles.discountSection}>
            {!appliedDiscount ? (
              <>
                <button
                  type="button"
                  className={styles.discountToggle}
                  onClick={() => setDiscountOpen(!discountOpen)}
                >
                  🏷️ {discountOpen ? 'Hide' : 'Got a discount code?'}
                </button>
                {discountOpen && (
                  <>
                    <div className={styles.discountInputRow}>
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={discountInput}
                        onChange={e => setDiscountInput(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyDiscount(); } }}
                      />
                      <button
                        type="button"
                        className={styles.discountApplyBtn}
                        onClick={handleApplyDiscount}
                        disabled={discountApplying || !discountInput.trim()}
                      >
                        {discountApplying ? '...' : 'Apply'}
                      </button>
                    </div>
                    {discountError && <p className={styles.discountError}>{discountError}</p>}
                  </>
                )}
              </>
            ) : (
              <div className={styles.discountApplied}>
                <span>🏷️ {appliedDiscount.code} — {appliedDiscount.description}</span>
                <button type="button" className={styles.discountRemoveBtn} onClick={removeDiscount}>Remove</button>
              </div>
            )}
          </div>

          <div className={styles.totalsBlock}>
            <div className={styles.totalRow}><span>Subtotal</span><span>{cartSubtotal}</span></div>
            <div className={styles.totalRow}><span>Shipping</span><span>{selectedShipping?.formattedCost ?? '—'}</span></div>
            {appliedDiscount && (
              <div className={styles.totalRow} style={{ color: '#059669' }}>
                <span>Discount ({appliedDiscount.code})</span>
                <span>−£{appliedDiscount.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Total</span><span>£{finalTotal.toFixed(2)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
