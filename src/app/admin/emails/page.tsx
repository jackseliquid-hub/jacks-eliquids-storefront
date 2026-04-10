'use client';

import { useState } from 'react';
import styles from '../admin.module.css';

export default function EmailKitchenPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('confirmation_viva');
  const [loading, setLoading] = useState(false);

  const templates = [
    { id: 'confirmation_viva', label: 'Customer: Order Confirmation (Card)' },
    { id: 'confirmation_bacs', label: 'Customer: Order Confirmation (BACS)' },
    { id: 'welcome', label: 'Customer: Account Welcome' },
    { id: 'password', label: 'Customer: Password Reset' },
    { id: 'admin_alert_viva', label: 'Admin: New Order Alert (Card)' },
    { id: 'admin_alert_bacs', label: 'Admin: New Order Alert (BACS)' },
  ];

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // In the future this will hit an API route to update the public.email_settings table
    alert("Settings saving architecture is ready! Please run the SQL Migration script to activate the database layer.");
    setLoading(false);
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: '#111827', margin: '0 0 0.5rem 0' }}>Email Fleet Kitchen</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Manage text content and preview automated email dispatches.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Editor Sidebar */}
        <div style={{ width: '400px', backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Select Preview</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>View Template</label>
            <select 
              value={selectedTemplate} 
              onChange={(e) => setSelectedTemplate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Global Email Text (CMS)</h2>
          
          <form onSubmit={handleSaveSettings}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Admin Alert Email</label>
              <input type="email" defaultValue="jackseliquid@gmail.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Where new order alerts get sent.</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>BACS Transfer Instructions</label>
              <textarea rows={5} defaultValue={"<p>We have received your order...</p>"} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '0.85rem' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Global Footer Text</label>
              <textarea rows={3} defaultValue={"This email was sent by Jacks eLiquid."} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }} />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: '#0d9488', color: 'white', padding: '1rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>
              {loading ? 'Saving...' : 'SAVE TEXT SETTINGS'}
            </button>
          </form>
        </div>

        {/* Live Preview Iframe */}
        <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '2rem', display: 'flex', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '600px', backgroundColor: 'white', height: '800px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <iframe 
              src={`/api/preview-email?template=${selectedTemplate}`} 
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Email Preview"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
