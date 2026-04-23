'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '../admin.module.css';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  cta_url: string;
  image_url: string;
  bg_color: string;
  text_color: string;
  sort_order: number;
  active: boolean;
}

const BLANK: Omit<Banner, 'id'> = {
  title: '',
  subtitle: '',
  badge_text: '',
  cta_text: 'Shop Now',
  cta_url: '/',
  image_url: '',
  bg_color: '#0f766e',
  text_color: 'light',
  sort_order: 0,
  active: true,
};

const PRESET_COLORS = [
  '#0f766e', '#0e7490', '#1e1b4b', '#7c3aed',
  '#be123c', '#b45309', '#166534', '#1e293b',
  '#f97316', '#ec4899', '#6366f1', '#064e3b',
];

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<Omit<Banner, 'id'>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const supabase = createClient();

  async function load() {
    const { data } = await supabase.from('banners').select('*').order('sort_order');
    setBanners(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function notify(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  function startEdit(b: Banner) {
    setEditing(b);
    const { id: _, ...rest } = b;
    setForm(rest);
  }

  function startNew() {
    setEditing({ id: -1, ...BLANK });
    setForm({ ...BLANK });
  }

  function cancel() {
    setEditing(null);
  }

  async function save() {
    if (!form.title.trim()) { notify('Title is required', 'err'); return; }
    setSaving(true);
    if (editing!.id === -1) {
      const { error } = await supabase.from('banners').insert([form]);
      if (error) { notify(error.message, 'err'); } else { notify('Banner created ✓'); }
    } else {
      const { error } = await supabase.from('banners').update(form).eq('id', editing!.id);
      if (error) { notify(error.message, 'err'); } else { notify('Banner saved ✓'); }
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({ active: !b.active }).eq('id', b.id);
    load();
  }

  async function deleteBanner(b: Banner) {
    if (!confirm(`Delete "${b.title}"?`)) return;
    await supabase.from('banners').delete().eq('id', b.id);
    notify('Banner deleted');
    load();
  }

  async function moveOrder(b: Banner, dir: -1 | 1) {
    const sorted = [...banners].sort((a, c) => a.sort_order - c.sort_order);
    const idx = sorted.findIndex(x => x.id === b.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await supabase.from('banners').update({ sort_order: swap.sort_order }).eq('id', b.id);
    await supabase.from('banners').update({ sort_order: b.sort_order }).eq('id', swap.id);
    load();
  }

  const textIsDark = form.text_color === 'dark';

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>🖼️ Hero Banners</h1>
        <button className={styles.saveBtn} onClick={startNew}>+ New Banner</button>
      </div>

      {msg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
          background: msg.type === 'ok' ? '#d1fae5' : '#fee2e2',
          color: msg.type === 'ok' ? '#065f46' : '#991b1b',
          fontWeight: 600, fontSize: '0.9rem',
        }}>
          {msg.text}
        </div>
      )}

      {/* ── Editor panel ── */}
      {editing && (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: '1.5rem', marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111' }}>
            {editing.id === -1 ? 'New Banner' : 'Edit Banner'}
          </h2>

          {/* Live mini-preview */}
          <div style={{
            background: form.bg_color,
            borderRadius: 10,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            minHeight: 90,
          }}>
            <div style={{ flex: 1 }}>
              {form.badge_text && (
                <span style={{
                  display: 'inline-block', background: 'rgba(255,255,255,0.2)',
                  color: textIsDark ? '#111' : '#fff', borderRadius: 9999,
                  padding: '0.1rem 0.65rem', fontSize: '0.68rem', fontWeight: 800,
                  letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  {form.badge_text}
                </span>
              )}
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: textIsDark ? '#111' : '#fff', lineHeight: 1.2 }}>
                {form.title || 'Banner Title'}
              </div>
              {form.subtitle && (
                <div style={{ fontSize: '0.8rem', color: textIsDark ? '#333' : 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  {form.subtitle}
                </div>
              )}
            </div>
            {form.cta_text && (
              <div style={{
                background: textIsDark ? '#0f766e' : '#fff',
                color: textIsDark ? '#fff' : form.bg_color,
                borderRadius: 9999, padding: '0.4rem 1rem',
                fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap',
              }}>
                {form.cta_text} →
              </div>
            )}
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt="preview" style={{ height: 70, objectFit: 'contain', borderRadius: 6 }} />
            )}
          </div>

          {/* Form fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className={styles.label}>Title *</label>
              <input className={styles.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Premium E-Liquids" />
            </div>
            <div>
              <label className={styles.label}>Badge Label</label>
              <input className={styles.input} value={form.badge_text} onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))} placeholder="e.g. HOT DEAL, NEW IN, SALE" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>Subtitle</label>
              <input className={styles.input} value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. 5 for £10 — Mix & Match Your Favourites" />
            </div>
            <div>
              <label className={styles.label}>Button Text</label>
              <input className={styles.input} value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Shop Now" />
            </div>
            <div>
              <label className={styles.label}>Button Link (URL)</label>
              <input className={styles.input} value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} placeholder="/?cat=E-liquids" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>Image URL (paste from Media Library)</label>
              <input className={styles.input} value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>

            {/* Background colour picker */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>Background Colour</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, bg_color: c }))}
                    style={{
                      width: 30, height: 30, borderRadius: 6, background: c, border: 'none',
                      cursor: 'pointer', outline: form.bg_color === c ? '3px solid #0f766e' : 'none',
                      outlineOffset: 2,
                    }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={form.bg_color}
                  onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                  style={{ width: 30, height: 30, border: '1px solid #d1d5db', borderRadius: 6, padding: 2, cursor: 'pointer' }}
                  title="Custom colour"
                />
                <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: 4 }}>{form.bg_color}</span>
              </div>
            </div>

            {/* Text colour */}
            <div>
              <label className={styles.label}>Text Colour</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                {['light', 'dark'].map(v => (
                  <button
                    key={v}
                    onClick={() => setForm(f => ({ ...f, text_color: v }))}
                    style={{
                      padding: '0.35rem 1rem', borderRadius: 6, cursor: 'pointer',
                      border: `2px solid ${form.text_color === v ? '#0f766e' : '#e5e7eb'}`,
                      background: v === 'light' ? '#0f766e' : '#f3f4f6',
                      color: v === 'light' ? '#fff' : '#111',
                      fontWeight: 600, fontSize: '0.82rem',
                    }}
                  >
                    {v === 'light' ? '☀️ White text' : '🌑 Dark text'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={styles.label}>Display Order</label>
              <input type="number" className={styles.input} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className={styles.saveBtn} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing.id === -1 ? 'Create Banner' : 'Save Changes'}
            </button>
            <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Banner list ── */}
      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading banners…</p>
      ) : banners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          No banners yet. Click <strong>+ New Banner</strong> to create your first one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...banners].sort((a, b) => a.sort_order - b.sort_order).map(b => (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                padding: '0.85rem 1rem',
                opacity: b.active ? 1 : 0.55,
              }}
            >
              {/* Colour swatch */}
              <div style={{
                width: 44, height: 44, borderRadius: 8,
                background: b.bg_color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.65rem', fontWeight: 700,
              }}>
                {b.active ? '●' : '○'}
              </div>

              {/* Image thumbnail */}
              {b.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image_url} alt="" style={{ width: 52, height: 44, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>
                  {b.badge_text && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f766e', marginRight: 6, textTransform: 'uppercase' }}>{b.badge_text}</span>}
                  {b.title}
                </div>
                {b.subtitle && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 1 }}>{b.subtitle}</div>}
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                  Order: {b.sort_order} · {b.cta_text} → {b.cta_url}
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button onClick={() => moveOrder(b, -1)} title="Move up" style={iconBtn}>↑</button>
                <button onClick={() => moveOrder(b, 1)} title="Move down" style={iconBtn}>↓</button>
                <button
                  onClick={() => toggleActive(b)}
                  style={{ ...iconBtn, color: b.active ? '#0f766e' : '#9ca3af', fontWeight: 700, fontSize: '0.75rem', minWidth: 60 }}
                >
                  {b.active ? 'Live ✓' : 'Off'}
                </button>
                <button onClick={() => startEdit(b)} className={styles.editBtn} style={{ margin: 0 }}>Edit</button>
                <button onClick={() => deleteBanner(b)} className={styles.deleteBtn} style={{ margin: 0 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6,
  width: 32, height: 32, cursor: 'pointer', fontSize: '0.9rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#374151',
};
