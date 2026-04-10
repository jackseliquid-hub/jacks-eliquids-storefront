'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../checkout.module.css';

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const router = useRouter();
  const params = use(searchParams);
  
  const orderId = typeof params.order_id === 'string' ? params.order_id : null;
  const method = typeof params.method === 'string' ? params.method : null;

  useEffect(() => {
    if (!orderId) {
      router.push('/');
    }
  }, [orderId, router]);

  if (!orderId) return null;

  const shortOrderId = orderId.substring(0, 8).toUpperCase();

  return (
    <div className={styles.checkoutContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className={styles.formSection} style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 className={styles.sectionTitle} style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>Order Received!</h1>
        <p style={{ color: '#4b5563', marginBottom: '2rem' }}>Order Reference: <strong>#{shortOrderId}</strong></p>

        {method === 'bacs' ? (
          <div className={styles.shippingInfoBox} style={{ textAlign: 'left' }}>
            <h4>🏦 Bank Transfer Required</h4>
            <p>Your order is currently <strong>Pending</strong>.</p>
            <p>We have sent an email with our BACS account details and instructions on how to complete the payment.</p>
            <p>Once we receive the transfer, your order will be shipped!</p>
          </div>
        ) : method === 'viva_simulation' ? (
          <div className={styles.shippingInfoBox} style={{ textAlign: 'left', borderColor: '#fde047', backgroundColor: '#fefce8' }}>
            <h4 style={{ color: '#ca8a04' }}>🚧 Developer Flow: Viva Wallet Simulated</h4>
            <p style={{ color: '#ca8a04' }}>Because the live Viva Wallet API keys are not yet configured in `.env.local`, we bypassed the external redirect.</p>
            <p style={{ color: '#ca8a04' }}>Your order has been saved successfully to the database!</p>
          </div>
        ) : (
          <div className={styles.shippingInfoBox} style={{ textAlign: 'left' }}>
            <h4>💳 Payment Successful</h4>
            <p>Your Viva Wallet payment has been processed.</p>
            <p>We will email you the tracking details as soon as your package ships.</p>
          </div>
        )}

        <Link href="/" className={styles.checkoutBtn} style={{ display: 'inline-block', marginTop: '2rem', textDecoration: 'none' }}>
          Return to Shop
        </Link>
      </div>
    </div>
  );
}
