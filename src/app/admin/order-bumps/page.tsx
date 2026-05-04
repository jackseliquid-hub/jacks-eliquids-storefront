'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '../admin.module.css';

interface BumpProduct {
  id: string; name: string; slug: string; image: string;
  price: string; variations: string[];
}
interface TriggerProduct { id: string; name: string; }
interface OrderBump {
  id: string; title: string; status: string; display_mode: string;
  trigger_products: TriggerProduct[]; offer_product: BumpProduct | null;
  default_variation: string; discount_value: number; discount_type: string;
  allow_multiple: boolean; max_qty: number; checkbox_text: string;
  description: string; sort_order: number; created_at: number;
}

const emptyBump = (): OrderBump => ({
  id: `bump_${Date.now()}`, title: 'New Order Bump', status: 'active',
  display_mode: 'all', trigger_products: [], offer_product: null,
  default_variation: '', discount_value: 1, discount_type: '£',
  allow_multiple: false, max_qty: 5,
  checkbox_text: 'Yes! I want to add this offer',
  description: '', sort_order: 0, created_at: Date.now(),
});

// ── Product Search ──────────────────────────────────────────────────────────
function ProductSearch({ onSelect, label }: { onSelect: (p: BumpProduct) => void; label?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.from('products').select('id, name, slug, image, price, attributes, status')
        .ilike('name', `%${q}%`).eq('status', 'published').limit(15);
      if (!data) return;
      // Get variations for these products
      const ids = data.map(p => p.id);
      const { data: vars } = await supabase.from('product_variations').select('product_id, attributes')
        .in('product_id', ids);
      const varMap: Record<string, string[]> = {};
      (vars || []).forEach((v: any) => {
        if (!varMap[v.product_id]) varMap[v.product_id] = [];
        const label = Object.values(v.attributes || {}).join(' / ');
        if (label) varMap[v.product_id].push(label);
      });
      setResults(data.map(p => ({
        id: p.id, name: p.name, slug: p.slug, image: p.image || '',
        price: p.price || '0.00', variations: varMap[p.id] || [],
      })));
      setOpen(true);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>{label}</label>}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products..."
        style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem' }} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 260, overflowY: 'auto' }}>
          {results.map(p => (
            <div key={p.id} onClick={() => { onSelect(p); setOpen(false); setQ(''); }}
              style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', fontSize: '0.88rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              {p.image && <img src={p.image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
              <span style={{ flex: 1, fontWeight: 600, color: '#0f766e' }}>{p.name}</span>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>#{p.id.slice(0,8)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bump Editor ─────────────────────────────────────────────────────────────
function BumpEditor({ bump, onSave, onCancel, presets }: {
  bump: OrderBump; onSave: (b: OrderBump) => void; onCancel: () => void; presets: string[];
}) {
  const [b, setB] = useState<OrderBump>(bump);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const up = (patch: Partial<OrderBump>) => setB(prev => ({ ...prev, ...patch }));

  const calcPrice = () => {
    const base = parseFloat((b.offer_product?.price || '0').replace(/[^0-9.]/g, ''));
    const disc = b.discount_value || 0;
    return b.discount_type === '£' ? Math.max(0, base - disc).toFixed(2) : (base * (1 - disc / 100)).toFixed(2);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(b);
    setSaving(false);
  };

  const tabs = ['Targeting', 'Offer', 'Design'];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>←</button>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{bump.id.startsWith('bump_') && !bump.created_at ? 'New' : 'Edit'} Order Bump</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
        {/* Left: Form */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Internal Title</label>
            <input value={b.title} onChange={e => up({ title: e.target.value })}
              style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: 8 }} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
            {tabs.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                style={{ flex: 1, padding: '0.7rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  borderBottom: tab === i ? '2px solid #0d9488' : '2px solid transparent', color: tab === i ? '#0d9488' : '#9ca3af', marginBottom: -2 }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab: Targeting */}
          {tab === 0 && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['all', 'specific'].map(m => (
                  <button key={m} onClick={() => up({ display_mode: m })}
                    style={{ flex: 1, padding: '0.6rem', border: `2px solid ${b.display_mode === m ? '#0d9488' : '#e5e7eb'}`, borderRadius: 8, cursor: 'pointer',
                      background: b.display_mode === m ? '#f0fdfa' : '#fff', fontWeight: 600, fontSize: '0.85rem', color: b.display_mode === m ? '#0f766e' : '#6b7280' }}>
                    {m === 'all' ? 'All Products' : 'Specific Products'}
                  </button>
                ))}
              </div>
              {b.display_mode === 'specific' && (
                <div>
                  <ProductSearch label="Trigger Products" onSelect={p => {
                    if (!b.trigger_products.find(t => t.id === p.id)) up({ trigger_products: [...b.trigger_products, { id: p.id, name: p.name }] });
                  }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {b.trigger_products.map(t => (
                      <span key={t.id} style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '4px 10px', borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, color: '#0f766e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.name}
                        <button onClick={() => up({ trigger_products: b.trigger_products.filter(x => x.id !== t.id) })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.9rem', padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Offer */}
          {tab === 1 && (
            <div>
              <ProductSearch label="Offer Product" onSelect={p => up({ offer_product: p, default_variation: '' })} />
              {b.offer_product && (
                <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {b.offer_product.image && <img src={b.offer_product.image} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                    <span style={{ fontWeight: 600, color: '#0f766e', fontSize: '0.9rem' }}>{b.offer_product.name}</span>
                  </div>
                  <button onClick={() => up({ offer_product: null })} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>×</button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Discount</label>
                  <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" value={b.discount_value} onChange={e => up({ discount_value: parseFloat(e.target.value) || 0 })}
                      style={{ flex: 1, padding: '0.6rem', border: 'none', outline: 'none' }} />
                    <select value={b.discount_type} onChange={e => up({ discount_type: e.target.value })}
                      style={{ padding: '0.5rem', background: '#f0fdfa', border: 'none', fontWeight: 700, color: '#0f766e' }}>
                      <option>£</option><option>%</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Default Variation</label>
                  <select value={b.default_variation} onChange={e => up({ default_variation: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', border: '1px solid #d1d5db', borderRadius: 8 }}>
                    <option value="">-- Choose --</option>
                    {(b.offer_product?.variations || []).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#0f766e' }}>Allow multiple selections</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>Customer can add multiple flavors/options</p>
                  </div>
                  <input type="checkbox" checked={b.allow_multiple} onChange={e => up({ allow_multiple: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: 'pointer' }} />
                </div>
                {b.allow_multiple && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f766e' }}>Max selections</label>
                    <input type="number" value={b.max_qty} onChange={e => up({ max_qty: parseInt(e.target.value) || 1 })}
                      style={{ width: 60, padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: 6, textAlign: 'center' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Design */}
          {tab === 2 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Checkbox Text</label>
              <input value={b.checkbox_text} onChange={e => up({ checkbox_text: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 16 }} />
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Description</label>
              <textarea value={b.description} onChange={e => up({ description: e.target.value })} rows={3}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
              {presets.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Quick Presets:</p>
                  {presets.map((p, i) => (
                    <button key={i} onClick={() => up({ description: p })}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.7rem', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: '0.82rem', color: '#374151', marginBottom: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#0d9488')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                      {p.slice(0, 100)}{p.length > 100 ? '...' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={onCancel} style={{ padding: '0.7rem 1.5rem', border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '0.7rem 2rem', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
              {saving ? 'Saving...' : 'Save & Activate'}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <p style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Live Preview</p>
            <div style={{ border: '2px solid #ccfbf1', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', background: '#f0fdfa', display: 'flex', alignItems: 'center', gap: 8 }}>
                {b.allow_multiple
                  ? <span style={{ fontSize: 14 }}>🛒</span>
                  : <input type="checkbox" readOnly style={{ width: 16, height: 16 }} />}
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f766e' }}>{b.checkbox_text}</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 56, height: 56, background: '#f0fdfa', borderRadius: 8, overflow: 'hidden', border: '1px solid #99f6e4', flexShrink: 0 }}>
                    {b.offer_product?.image && <img src={b.offer_product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#0f766e', fontStyle: 'italic', lineHeight: 1.4, margin: 0, flex: 1 }}>{b.description || 'Description preview...'}</p>
                </div>
                {(b.offer_product?.variations?.length || 0) > 0 && (
                  <select disabled style={{ width: '100%', padding: 8, border: '1px solid #99f6e4', borderRadius: 6, fontSize: '0.78rem', marginBottom: 8, color: '#0f766e' }}>
                    <option>-- Choose Option --</option>
                    {b.offer_product?.variations.map(v => <option key={v}>{v}</option>)}
                  </select>
                )}
                {b.allow_multiple ? (
                  <button disabled style={{ width: '100%', padding: 8, background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem' }}>
                    Add to Order (£{calcPrice()})
                  </button>
                ) : (
                  <div style={{ fontWeight: 700, color: '#0f766e' }}>
                    £{calcPrice()} <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 400, marginLeft: 4 }}>£{parseFloat((b.offer_product?.price || '0').replace(/[^0-9.]/g, '')).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function OrderBumpsPage() {
  const [bumps, setBumps] = useState<OrderBump[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OrderBump | null>(null);
  const [presets, setPresets] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('order_bumps').select('*').order('sort_order', { ascending: true });
      setBumps((data || []) as OrderBump[]);
      // Load presets
      const { data: ps } = await supabase.from('global_settings').select('value').eq('key', 'order_bump_presets').single();
      if (ps?.value && Array.isArray(ps.value)) setPresets(ps.value);
      setLoading(false);
    })();
  }, []);

  const saveBump = async (b: OrderBump) => {
    const supabase = createClient();
    const row = {
      id: b.id, title: b.title, status: b.status, display_mode: b.display_mode,
      trigger_products: b.trigger_products, offer_product: b.offer_product,
      default_variation: b.default_variation, discount_value: b.discount_value,
      discount_type: b.discount_type, allow_multiple: b.allow_multiple,
      max_qty: b.max_qty, checkbox_text: b.checkbox_text, description: b.description,
      sort_order: b.sort_order, created_at: b.created_at,
    };
    await supabase.from('order_bumps').upsert(row, { onConflict: 'id' });
    setBumps(prev => {
      const exists = prev.find(x => x.id === b.id);
      return exists ? prev.map(x => x.id === b.id ? b : x) : [...prev, b];
    });
    setEditing(null);
  };

  const deleteBump = async (id: string) => {
    if (!confirm('Delete this order bump?')) return;
    const supabase = createClient();
    await supabase.from('order_bumps').delete().eq('id', id);
    setBumps(prev => prev.filter(x => x.id !== id));
  };

  const toggleStatus = async (b: OrderBump) => {
    const newStatus = b.status === 'active' ? 'paused' : 'active';
    const supabase = createClient();
    await supabase.from('order_bumps').update({ status: newStatus }).eq('id', b.id);
    setBumps(prev => prev.map(x => x.id === b.id ? { ...x, status: newStatus } : x));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;

  if (editing) return (
    <div className={styles.pageCard}>
      <BumpEditor bump={editing} onSave={saveBump} onCancel={() => setEditing(null)} presets={presets} />
    </div>
  );

  return (
    <div className={styles.pageCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>🎯 Order Bumps</h1>
        <button onClick={() => setEditing(emptyBump())}
          style={{ padding: '0.6rem 1.5rem', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          + New Bump
        </button>
      </div>

      {bumps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🎯</p>
          <p>No order bumps yet. Create your first one to start upselling at checkout!</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Title</th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Offer Product</th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Status</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bumps.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '14px 8px', fontWeight: 600, color: '#0f766e' }}>{b.title}</td>
                <td style={{ padding: '14px 8px', color: '#374151', fontSize: '0.9rem' }}>{b.offer_product?.name || '—'}</td>
                <td style={{ padding: '14px 8px' }}>
                  <button onClick={() => toggleStatus(b)}
                    style={{ padding: '3px 10px', borderRadius: 12, border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      background: b.status === 'active' ? '#f0fdfa' : '#f3f4f6', color: b.status === 'active' ? '#0f766e' : '#9ca3af' }}>
                    {b.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                  </button>
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                  <button onClick={() => setEditing(b)} style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', fontWeight: 600, marginRight: 12 }}>Edit</button>
                  <button onClick={() => deleteBump(b.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
