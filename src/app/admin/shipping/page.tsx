'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { ShippingMethod } from '@/lib/shipping';
import ShippingMethodModal from './ShippingMethodModal';
import { toggleShippingMethod, deleteShippingMethod } from './actions';
import styles from './shipping.module.css';
import adminStyles from '../admin.module.css';

export default function ShippingPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ShippingMethod | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('shipping_methods')
      .select('*')
      .order('sort_order', { ascending: true });
    setMethods((data || []) as ShippingMethod[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  async function handleToggle(id: string, current: boolean) {
    setMethods(m => m.map(x => x.id === id ? { ...x, enabled: !current } : x));
    await toggleShippingMethod(id, !current);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete shipping method "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await deleteShippingMethod(id);
    setMethods(m => m.filter(x => x.id !== id));
    setDeletingId(null);
  }

  function openAdd() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(method: ShippingMethod) {
    setEditTarget(method);
    setModalOpen(true);
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={adminStyles.header}>
        <div>
          <h1 className={adminStyles.title}>Shipping</h1>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Manage shipping zones and methods
          </span>
        </div>
      </div>

      {/* ── Zone Panel ──────────────────────────────────────────────── */}
      <div className={styles.zoneCard}>
        <div className={styles.zoneHeader}>
          <div className={styles.zoneInfo}>
            <h2 className={styles.zoneName}>🌍 Zone: United Kingdom (UK)</h2>
            <p className={styles.zoneDesc}>
              All UK mainland orders. Customers are automatically matched to this zone.
            </p>
          </div>
        </div>

        {/* ── Methods Table ──────────────────────────────────────────── */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Title</th>
                <th>LL Max</th>
                <th>Parcel from</th>
                <th style={{ width: 80, textAlign: 'center' }}>Enabled</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading…</td></tr>
              )}
              {!loading && methods.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No shipping methods yet. Add one below.</td></tr>
              )}
              {methods.map(m => (
                <tr key={m.id} style={{ opacity: deletingId === m.id ? 0.4 : 1 }}>
                  <td style={{ color: '#d1d5db', textAlign: 'center', cursor: 'grab' }}>⋮⋮</td>
                  <td>
                    <strong style={{ color: '#111' }}>{m.title}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                      Set custom weight brackets and prices
                    </div>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>{m.ll_max_weight}g</td>
                  <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    £{Number(m.parcel_cost_1).toFixed(2)} (≤{m.parcel_tier_1_weight}g)
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`${styles.toggle} ${m.enabled ? styles.toggleOn : ''}`}
                      onClick={() => handleToggle(m.id, m.enabled)}
                      title={m.enabled ? 'Disable' : 'Enable'}
                    >
                      <span className={styles.toggleKnob} />
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className={styles.editBtn} onClick={() => openEdit(m)}>Edit</button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(m.id, m.title)}
                        disabled={deletingId === m.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Add button ─────────────────────────────────────────────── */}
        <div className={styles.addRow}>
          <button className={styles.addBtn} onClick={openAdd}>
            + Add shipping method
          </button>
        </div>
      </div>

      {/* ── How it works info ───────────────────────────────────────── */}
      <div className={styles.infoCard}>
        <h3 className={styles.infoTitle}>💡 How shipping is calculated</h3>
        <ul className={styles.infoList}>
          <li>The cart weight is totalled from each product's <strong>weight (g)</strong> field × quantity.</li>
          <li>If the total exceeds a method's <strong>LL Max Weight</strong>, it's treated as a <strong>Small Parcel</strong>.</li>
          <li>Products with shipping class <strong>"small-parcel"</strong> always force the parcel rate.</li>
          <li>At checkout, customers see <strong>all enabled methods</strong> with their calculated cost and can pick their preferred option.</li>
        </ul>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <ShippingMethodModal
          method={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={loadMethods}
        />
      )}
    </div>
  );
}
