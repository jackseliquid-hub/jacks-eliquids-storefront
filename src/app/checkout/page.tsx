'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { getShippingConfig, calculateShippingQuote, ShippingConfig } from '@/lib/shipping';
import { processOrder } from './actions';
import styles from './checkout.module.css';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartSubtotal, getCalculatedItemPrice, isMounted } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
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
      // 1. Fetch user to auto-fill address if possible
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .single();
        if (customerData) setProfile(customerData);
      }

      // 2. Fetch the dynamic shipping config
      const config = await getShippingConfig();
      setShippingConfig(config);

      // 3. Hand off the local cart state to the Shipping Engine!
      if (!isMounted) return; // Wait for localStorage to inject to cart

      if (cartItems.length > 0) {
        const quote = calculateShippingQuote(cartItems, config);
        setShippingQuote(quote);
      } else {
        // If cart is completely loaded but empty, kick them back home so they can't checkout nothing
        router.push('/');
      }

      setLoading(false);
    }
    loadData();
  }, [cartItems, isMounted, router]);

  if (loading || !shippingQuote) {
    return <div style={{textAlign: 'center', padding: '5rem'}}>Loading Checkout...</div>;
  }

  // Calculate final Grand Total
  const subtotalNum = parseFloat(cartSubtotal.replace(/[^0-9.]/g, ''));
  const finalTotal = subtotalNum + shippingQuote.shippingCost;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    const payload = {
      email: formData.get('email') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      postcode: formData.get('postcode') as string,
      paymentMethod,
      cartItems,
      shippingConfig: shippingConfig!
    };

    try {
      const res = await processOrder(payload);
      if (res.error) {
        setSubmitError(res.error);
        setSubmitting(false);
      } else if (res.redirectUrl) {
        // Clear the cart securely locally before we leave the page
        localStorage.removeItem('jacks-cart'); 
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      setSubmitError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.checkoutContainer}>
      <header className={styles.checkoutHeader}>
        <Link href="/">
          <Image 
            src="/logo.png" 
            alt="Jack's E-Liquid" 
            width={140} 
            height={50} 
            className={styles.logo}
          />
        </Link>
      </header>

      <div className={styles.checkoutBody}>
        {/* Left: Forms */}
        <div>
          <form className={styles.formSection} onSubmit={handleSubmit}>
            <h2 className={styles.sectionTitle}>Contact information</h2>
            
            <div className={styles.inputGroup} style={{marginBottom: '2rem'}}>
              <label>Email address</label>
              <input 
                name="email"
                type="email" 
                defaultValue={profile?.email || ''} 
                required 
                placeholder="you@email.com"
              />
            </div>

            <h2 className={styles.sectionTitle}>Shipping address</h2>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>First name</label>
                <input name="firstName" type="text" defaultValue={profile?.first_name || ''} required />
              </div>
              <div className={styles.inputGroup}>
                <label>Last name</label>
                <input name="lastName" type="text" defaultValue={profile?.last_name || ''} required />
              </div>
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label>Address</label>
                <input name="address" type="text" placeholder="House number and street name" required />
              </div>
              <div className={styles.inputGroup}>
                <label>City</label>
                <input name="city" type="text" required />
              </div>
              <div className={styles.inputGroup}>
                <label>Postcode</label>
                <input name="postcode" type="text" required />
              </div>
            </div>

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
