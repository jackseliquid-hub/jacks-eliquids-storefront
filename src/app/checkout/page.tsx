'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/utils/supabase/client';
import { getShippingConfig, calculateShippingQuote, ShippingConfig } from '@/lib/shipping';
import { processOrder } from './actions';
import styles from './checkout.module.css';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartSubtotal, getCalculatedItemPrice, isMounted } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Custom Profile & Dual Address States
  const [profile, setProfile] = useState<any>(null);
  const [shipDifferent, setShipDifferent] = useState(false);
  
  const billingObj = profile?.billing_address || {};
  const shippingObj = profile?.shipping_address || {};

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'viva' | 'bacs'>('viva');
  
  // Shipping Engine State
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{
    packageType: string;
    totalWeight: number;
    shippingName: string;
    shippingCost: number;
    formattedCost: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .single();
        if (customerData) setProfile(customerData);
      }

      const config = await getShippingConfig();
      setShippingConfig(config);

      if (!isMounted) return; 

      if (cartItems.length > 0) {
        const quote = calculateShippingQuote(cartItems, config);
        setShippingQuote(quote);
      } else {
        router.push('/');
      }

      setLoading(false);
    }
    loadData();
  }, [cartItems, isMounted, router]);

  if (loading || !shippingQuote) {
    return <div style={{textAlign: 'center', padding: '5rem'}}>Loading Checkout...</div>;
  }

  const subtotalNum = parseFloat(cartSubtotal.replace(/[^0-9.]/g, ''));
  const finalTotal = subtotalNum + shippingQuote.shippingCost;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    const payload = {
      paymentMethod,
      cartItems,
      shippingConfig: shippingConfig!,
      shipToDifferent: shipDifferent,
      
      billingAddress: {
        first_name: formData.get('b_first_name') as string,
        last_name: formData.get('b_last_name') as string,
        country: formData.get('b_country') as string,
        address: formData.get('b_address') as string,
        city: formData.get('b_city') as string,
        county: formData.get('b_county') as string,
        postcode: formData.get('b_postcode') as string,
        phone: formData.get('b_phone') as string,
        email: formData.get('b_email') as string,
      },
      shippingAddress: shipDifferent ? {
        first_name: formData.get('s_first_name') as string,
        last_name: formData.get('s_last_name') as string,
        country: formData.get('s_country') as string,
        address: formData.get('s_address') as string,
        city: formData.get('s_city') as string,
        county: formData.get('s_county') as string,
        postcode: formData.get('s_postcode') as string,
        phone: formData.get('s_phone') as string,
        email: formData.get('s_email') as string,
      } : null
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
    } catch (err) {
      setSubmitError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  const InputGroup = ({ label, name, defaultValue, type = 'text', required = false }: any) => (
    <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
      <label>{label} {required && '*'}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );

  return (
    <div className={styles.checkoutContainer}>
      <header className={styles.checkoutHeader}>
        <Link href="/">
          <Image src="/logo.png" alt="Jack's E-Liquid" width={140} height={50} className={styles.logo} />
        </Link>
      </header>

      <div className={styles.checkoutBody}>
        {/* Left: Forms */}
        <div>
          <form className={styles.formSection} onSubmit={handleSubmit}>
            <h2 className={styles.sectionTitle}>Billing Data</h2>
            
            <div className={styles.formGrid}>
              <InputGroup label="First name" name="b_first_name" defaultValue={billingObj.first_name || profile?.first_name || ''} required />
              <InputGroup label="Last name" name="b_last_name" defaultValue={billingObj.last_name || profile?.last_name || ''} required />
            </div>

            <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ marginBottom: '1rem' }}>
              <label>Country / Region *</label>
              <select name="b_country" defaultValue={billingObj.country || 'United Kingdom (UK)'} required>
                <option value="United Kingdom (UK)">United Kingdom (UK)</option>
              </select>
            </div>

            <div className={styles.formGrid}>
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <InputGroup label="Street address" name="b_address" defaultValue={billingObj.address || ''} required />
              </div>
              <InputGroup label="Town / City" name="b_city" defaultValue={billingObj.city || ''} required />
              <InputGroup label="County (optional)" name="b_county" defaultValue={billingObj.county || ''} />
              <InputGroup label="Postcode" name="b_postcode" defaultValue={billingObj.postcode || ''} required />
              <InputGroup label="Phone" name="b_phone" defaultValue={billingObj.phone || profile?.phone || ''} required />
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <InputGroup label="Email address" name="b_email" type="email" defaultValue={billingObj.email || profile?.email || ''} required />
              </div>
            </div>

            {/* Shipping Toggle */}
            <h3 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                type="checkbox" 
                name="ship_to_different_checkbox"
                checked={shipDifferent}
                onChange={(e) => setShipDifferent(e.target.checked)}
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
                  <InputGroup label="Last name" name="s_last_name" defaultValue={shippingObj.last_name || ''} required />
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ marginBottom: '1rem' }}>
                  <label>Country / Region *</label>
                  <select name="s_country" defaultValue={shippingObj.country || 'United Kingdom (UK)'} required>
                    <option value="United Kingdom (UK)">United Kingdom (UK)</option>
                  </select>
                </div>

                <div className={styles.formGrid}>
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <InputGroup label="Street address" name="s_address" defaultValue={shippingObj.address || ''} required />
                  </div>
                  <InputGroup label="Town / City" name="s_city" defaultValue={shippingObj.city || ''} required />
                  <InputGroup label="County (optional)" name="s_county" defaultValue={shippingObj.county || ''} />
                  <InputGroup label="Postcode" name="s_postcode" defaultValue={shippingObj.postcode || ''} required />
                  <InputGroup label="Phone" name="s_phone" defaultValue={shippingObj.phone || ''} required />
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <InputGroup label="Email address" name="s_email" type="email" defaultValue={shippingObj.email || ''} required />
                  </div>
                </div>
              </div>
            )}

            <div className={styles.shippingInfoBox}>
              <h4>📦 Custom Delivery Class Detected</h4>
              <p>Total Cart Weight: <strong>{shippingQuote.totalWeight}g</strong></p>
              <p>Generated Package Protocol: <strong>{shippingQuote.packageType === 'large-letter' ? 'Large Letter' : 'Small Parcel'}</strong></p>
              <p>Selected Courier Bracket: <strong>{shippingQuote.shippingName}</strong></p>
            </div>

            <h2 className={styles.sectionTitle}>Payment Method</h2>
            <div className={styles.paymentMethodsGrid}>
              <label className={`${styles.paymentOption} ${paymentMethod === 'viva' ? styles.paymentOptionActive : ''}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="viva" 
                  checked={paymentMethod === 'viva'} 
                  onChange={() => setPaymentMethod('viva')} 
                />
                <div className={styles.paymentOptionDetails}>
                  <strong>Credit / Debit Card</strong>
                  <span>Pay securely via Viva Wallet</span>
                </div>
              </label>

              <label className={`${styles.paymentOption} ${paymentMethod === 'bacs' ? styles.paymentOptionActive : ''}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="bacs" 
                  checked={paymentMethod === 'bacs'} 
                  onChange={() => setPaymentMethod('bacs')} 
                />
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

          <div className={styles.totalsBlock}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{cartSubtotal}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Shipping</span>
              <span>{shippingQuote.formattedCost}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Total</span>
              <span>£{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
