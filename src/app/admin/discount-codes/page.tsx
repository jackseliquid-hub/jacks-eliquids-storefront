'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DiscountCode {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  enabled: boolean;
  created_at: string;
}

const emptyCode: Omit<DiscountCode, 'id' | 'created_at'> = {
  code: '',
  description: '',
  type: 'percentage',
  value: 0,
  min_order: null,
  max_uses: null,
  used_count: 0,
  starts_at: null,
  expires_at: null,
  enabled: true,
};

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // id or 'new'
  const [form, setForm] = useState<any>(emptyCode);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  async function loadCodes() {
    const { data } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes((data || []) as DiscountCode[]);
    setLoading(false);
  }

  useEffect(() => { loadCodes(); }, []);

  function startEdit(code: DiscountCode) {
    setEditing(code.id);
    setForm({
      code: code.code,
      description: code.description || '',
      type: code.type,
      value: code.value,
      min_order: code.min_order,
      max_uses: code.max_uses,
      starts_at: code.starts_at ? code.starts_at.slice(0, 16) : '',
      expires_at: code.expires_at ? code.expires_at.slice(0, 16) : '',
      enabled: code.enabled,
    });
  }

  function startNew() {
    setEditing('new');
    setForm({ ...emptyCode, starts_at: '', expires_at: '' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyCode);
  }

  async function handleSave() {
    if (!form.code.trim()) { showToast('Code is required'); return; }
    setSaving(true);

    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      type: form.type,
      value: parseFloat(form.value) || 0,
      min_order: form.min_order ? parseFloat(form.min_order) : null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      enabled: form.enabled,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing === 'new') {
      const res = await supabase.from('discount_codes').insert(payload);
      error = res.error;
    } else {
      const res = await supabase.from('discount_codes').update(payload).eq('id', editing);
      error = res.error;
    }

    if (error) {
      showToast(error.message.includes('idx_discount_codes_code_lower') 
        ? 'A code with that name already exists' 
        : error.message);
    } else {
      showToast(editing === 'new' ? 'Code created!' : 'Code updated!');
      setEditing(null);
      await loadCodes();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount code?')) return;
    await supabase.from('discount_codes').delete().eq('id', id);
    showToast('Code deleted');
    await loadCodes();
  }

  async function toggleEnabled(code: DiscountCode) {
    await supabase.from('discount_codes').update({ enabled: !code.enabled }).eq('id', code.id);
    await loadCodes();
  }

  function getStatus(code: DiscountCode) {
    if (!code.enabled) return { label: 'Disabled', color: '#6b7280', bg: '#f3f4f6' };
    const now = new Date();
    if (code.expires_at && new Date(code.expires_at) < now) return { label: 'Expired', color: '#dc2626', bg: '#fef2f2' };
    if (code.starts_at && new Date(code.starts_at) > now) return { label: 'Scheduled', color: '#d97706', bg: '#fffbeb' };
    if (code.max_uses !== null && code.used_count >= code.max_uses) return { label: 'Used Up', color: '#dc2626', bg: '#fef2f2' };
    return { label: 'Active', color: '#059669', bg: '#ecfdf5' };
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading Discount Codes...</div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Discount Codes</h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
            Create coupon codes that customers enter at checkout.
          </p>
        </div>
        <button
          onClick={startNew}
          style={{
            padding: '0.6rem 1.2rem', fontWeight: 600, fontSize: '0.85rem',
            background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
          }}
        >
          + New Code
        </button>
      </div>

      {/* Edit / Create Form */}
      {editing && (
        <div style={{
          background: '#fff', border: '2px solid #0d9488', borderRadius: '12px',
          padding: '1.5rem', marginBottom: '1.5rem',
          boxShadow: '0 4px 15px rgba(13, 148, 136, 0.1)',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 600 }}>
            {editing === 'new' ? '✨ Create New Code' : '✏️ Edit Code'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Code *</label>
              <input
                style={inputStyle}
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME10"
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (£)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Value {form.type === 'percentage' ? '(%)' : '(£)'}</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Description (internal note)</label>
            <input
              style={inputStyle}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Welcome offer for new customers"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Min Order (£)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.min_order ?? ''}
                onChange={e => setForm({ ...form, min_order: e.target.value || null })}
                placeholder="No minimum"
              />
            </div>
            <div>
              <label style={labelStyle}>Max Uses</label>
              <input
                style={inputStyle}
                type="number"
                value={form.max_uses ?? ''}
                onChange={e => setForm({ ...form, max_uses: e.target.value || null })}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label style={labelStyle}>Starts At</label>
              <input
                style={inputStyle}
                type="datetime-local"
                value={form.starts_at || ''}
                onChange={e => setForm({ ...form, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Expires At</label>
              <input
                style={inputStyle}
                type="datetime-local"
                value={form.expires_at || ''}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Enabled</label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '0.85rem',
                background: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}
            >
              {saving ? 'Saving...' : editing === 'new' ? 'Create Code' : 'Save Changes'}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '0.85rem',
                background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Codes Table */}
      {codes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <span style={{ fontSize: '3rem' }}>🏷️</span>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '1rem' }}>No discount codes yet</p>
          <p style={{ fontSize: '0.9rem' }}>Create your first code to offer customers discounts at checkout.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Discount</th>
                <th style={thStyle}>Min Order</th>
                <th style={thStyle}>Usage</th>
                <th style={thStyle}>Expires</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => {
                const status = getStatus(code);
                return (
                  <tr key={code.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem',
                        background: '#f0fdf4', padding: '0.2rem 0.5rem', borderRadius: '4px',
                      }}>
                        {code.code}
                      </span>
                      {code.description && (
                        <span style={{ display: 'block', fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
                          {code.description}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {code.type === 'percentage' ? `${code.value}%` : `£${Number(code.value).toFixed(2)}`}
                    </td>
                    <td style={tdStyle}>
                      {code.min_order ? `£${Number(code.min_order).toFixed(2)}` : '—'}
                    </td>
                    <td style={tdStyle}>
                      {code.used_count}{code.max_uses !== null ? ` / ${code.max_uses}` : ''}
                    </td>
                    <td style={tdStyle}>
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                        borderRadius: '999px', color: status.color, background: status.bg,
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => toggleEnabled(code)} style={actionBtnStyle} title={code.enabled ? 'Disable' : 'Enable'}>
                          {code.enabled ? '⏸️' : '▶️'}
                        </button>
                        <button onClick={() => startEdit(code)} style={actionBtnStyle} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(code.id)} style={{ ...actionBtnStyle, color: '#dc2626' }} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, background: '#10b981',
          color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px',
          fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 9999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem',
  border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem',
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', verticalAlign: 'middle',
};

const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem',
};
