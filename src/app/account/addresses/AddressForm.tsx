'use client';

import { useState } from 'react';
import { saveAddress } from './actions';
import styles from '../account.module.css';

export default function AddressForm({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [shipDifferent, setShipDifferent] = useState(false);

  const billingConfig = profile?.billing_address || {};
  const shippingConfig = profile?.shipping_address || {};

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const res = await saveAddress(formData);
    
    if (res.error) {
      setMessage(`❌ ${res.error}`);
    } else {
      setMessage('✅ Address saved successfully! It will now auto-fill at checkout.');
    }
    
    setLoading(false);
  }

  const InputGroup = ({ label, name, defaultValue, type = 'text', required = false }: any) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>
        {label} {required && '*'}
      </label>
      <input 
        name={name} 
        type={type} 
        defaultValue={defaultValue} 
        required={required} 
        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
      />
    </div>
  );

  return (
    <form className={styles.card} onSubmit={handleSubmit} style={{ gridColumn: '1 / -1', maxWidth: '800px' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Billing address</h3>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}><InputGroup label="First name" name="b_first_name" defaultValue={billingConfig.first_name || profile?.first_name || ''} required /></div>
        <div style={{ flex: 1 }}><InputGroup label="Last name" name="b_last_name" defaultValue={billingConfig.last_name || profile?.last_name || ''} required /></div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>Country / Region *</label>
        <select name="b_country" defaultValue={billingConfig.country || 'United Kingdom (UK)'} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white' }}>
          <option value="United Kingdom (UK)">United Kingdom (UK)</option>
          {/* Add more countries here if applicable */}
        </select>
      </div>

      <InputGroup label="Street address" name="b_address" defaultValue={billingConfig.address || ''} required />
      <InputGroup label="Town / City" name="b_city" defaultValue={billingConfig.city || ''} required />
      <InputGroup label="County (optional)" name="b_county" defaultValue={billingConfig.county || ''} />
      <InputGroup label="Postcode" name="b_postcode" defaultValue={billingConfig.postcode || ''} required />
      <InputGroup label="Phone" name="b_phone" defaultValue={billingConfig.phone || ''} required />
      <InputGroup label="Email address" name="b_email" type="email" defaultValue={billingConfig.email || profile?.email || ''} required />


      {/* Shipping Toggle */}
      <h3 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input 
          type="checkbox" 
          name="ship_to_different"
          checked={shipDifferent}
          onChange={(e) => setShipDifferent(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label style={{ cursor: 'pointer' }} onClick={() => setShipDifferent(!shipDifferent)}>
          Ship to a different address?
        </label>
      </h3>

      {shipDifferent && (
        <div style={{ padding: '1.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}><InputGroup label="First name" name="s_first_name" defaultValue={shippingConfig.first_name || ''} required /></div>
            <div style={{ flex: 1 }}><InputGroup label="Last name" name="s_last_name" defaultValue={shippingConfig.last_name || ''} required /></div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>Country / Region *</label>
            <select name="s_country" defaultValue={shippingConfig.country || 'United Kingdom (UK)'} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white' }}>
              <option value="United Kingdom (UK)">United Kingdom (UK)</option>
            </select>
          </div>

          <InputGroup label="Street address" name="s_address" defaultValue={shippingConfig.address || ''} required />
          <InputGroup label="Town / City" name="s_city" defaultValue={shippingConfig.city || ''} required />
          <InputGroup label="County (optional)" name="s_county" defaultValue={shippingConfig.county || ''} />
          <InputGroup label="Postcode" name="s_postcode" defaultValue={shippingConfig.postcode || ''} required />
          <InputGroup label="Phone" name="s_phone" defaultValue={shippingConfig.phone || ''} required />
          <InputGroup label="Email address" name="s_email" type="email" defaultValue={shippingConfig.email || ''} required />
        </div>
      )}


      <button type="submit" disabled={loading} className={styles.actionBtn} style={{ width: 'auto', padding: '1rem 2rem', marginTop: '1rem' }}>
        {loading ? 'Saving...' : 'SAVE ADDRESS'}
      </button>

      {message && (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
          {message}
        </p>
      )}
    </form>
  );
}
