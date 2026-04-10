'use client';

import { useState } from 'react';
import { saveAddress } from './actions';
import styles from '../account.module.css';

export default function AddressForm({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h3>Default Shipping Address</h3>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Save your default delivery address here to speed through checkout on future orders.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>Address Line 1</label>
          <input 
            name="address" 
            type="text" 
            defaultValue={profile?.address || ''} 
            required 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>City</label>
            <input 
              name="city" 
              type="text" 
              defaultValue={profile?.city || ''} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#374151' }}>Postcode</label>
            <input 
              name="postcode" 
              type="text" 
              defaultValue={profile?.postcode || ''} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading} className={styles.actionBtn}>
        {loading ? 'Saving...' : 'Save Default Address'}
      </button>

      {message && (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
          {message}
        </p>
      )}
    </form>
  );
}
