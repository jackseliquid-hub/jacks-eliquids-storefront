'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { ShippingMethod, ShippingZone } from '@/lib/shipping';
import ShippingMethodModal from './ShippingMethodModal';
import ShippingZoneModal from './ShippingZoneModal';
import { toggleShippingMethod, deleteShippingMethod, deleteShippingZone, updateShippingMethod } from './actions';
import styles from './shipping.module.css';
import adminStyles from '../admin.module.css';

type ZoneWithMethods = ShippingZone & { methods: ShippingMethod[] };

export default function ShippingPage() {
  const [zones, setZones] = useState<ZoneWithMethods[]>([]);
  const [loading, setLoading] = useState(true);

  // Method modal
  const [methodModal, setMethodModal] = useState<{ open: boolean; method?: ShippingMethod; zoneId?: string }>({ open: false });
  // Zone modal
  const [zoneModal, setZoneModal] = useState<{ open: boolean; zone?: ShippingZone }>({ open: false });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: zonesData }, { data: methodsData }] = await Promise.all([
      supabase.from('shipping_zones').select('*').order('sort_order', { ascending: true }),
      supabase.from('shipping_methods').select('*').order('sort_order', { ascending: true }),
    ]);

    const zList = (zonesData || []) as ShippingZone[];
    const mList = (methodsData || []) as ShippingMethod[];

    setZones(zList.map(z => ({
      ...z,
      methods: mList.filter(m => m.zone_id === z.id),
    })));

    // Also keep unassigned methods visible (shouldn't happen after migration)
    const unassigned = mList.filter(m => !m.zone_id);
    if (unassigned.length > 0) {
      setZones(prev => [...prev, {
        id: '__unassigned__',
        name: 'Unassigned Methods',
        countries: [],
        sort_order: 999,
        methods: unassigned,
      }]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function toggleZoneCollapse(id: string) {
    setCollapsedZones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggleMethod(id: string, current: boolean) {
    setZones(prev => prev.map(z => ({
      ...z,
      methods: z.methods.map(m => m.id === id ? { ...m, enabled: !current } : m),
    })));
    await toggleShippingMethod(id, !current);
  }

  async function handleDeleteMethod(id: string, title: string) {
    if (!confirm(`Delete shipping method "${title}"?`)) return;
    setDeletingId(id);
    await deleteShippingMethod(id);
    setZones(prev => prev.map(z => ({ ...z, methods: z.methods.filter(m => m.id !== id) })));
    setDeletingId(null);
  }

  async function handleDeleteZone(id: string, name: string) {
    if (!confirm(`Delete zone "${name}"? All methods in this zone will become unassigned.`)) return;
    setDeletingId(id);
    await deleteShippingZone(id);
    await loadData();
    setDeletingId(null);
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={adminStyles.header}>
        <div>
          <h1 className={adminStyles.title}>Shipping</h1>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage shipping zones and methods</span>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading…</div>
      )}

      {!loading && zones.length === 0 && (
        <div className={styles.zoneCard} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          No shipping zones yet. Run the SQL migration first, then click "+ Add zone".
        </div>
      )}

      {/* ── Zone Panels ─────────────────────────────────────────────── */}
      {zones.map(zone => {
        const isCollapsed = collapsedZones.has(zone.id);
        const isPhantom = zone.id === '__unassigned__';
        return (
          <div key={zone.id} className={styles.zoneCard} style={{ marginBottom: '1.25rem' }}>
            {/* Zone Header */}
            <div className={styles.zoneHeader}>
              <div className={styles.zoneInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => toggleZoneCollapse(zone.id)}
                    style={{ background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', color: '#6b7280', padding: 0 }}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </button>
                  <h2 className={styles.zoneName}>🌍 {zone.name}</h2>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.25rem' }}>
                    {zone.methods.length} method{zone.methods.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {zone.countries.length > 0 && (
                  <p className={styles.zoneDesc} style={{ marginLeft: '1.75rem' }}>
                    {zone.countries.join(' · ')}
                  </p>
                )}
              </div>
              {!isPhantom && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={styles.editBtn} onClick={() => setZoneModal({ open: true, zone })}>Edit zone</button>
                  <button
                    className={styles.deleteBtn}
                    disabled={deletingId === zone.id}
                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Methods Table */}
            {!isCollapsed && (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}></th>
                        <th>Title</th>
                        <th>LL Max</th>
                        <th>Parcel from</th>
                        <th style={{ width: 80, textAlign: 'center' }}>Enabled</th>
                        <th style={{ width: 160 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {zone.methods.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                            No methods in this zone yet.
                          </td>
                        </tr>
                      )}
                      {zone.methods.map(m => (
                        <tr key={m.id} style={{ opacity: deletingId === m.id ? 0.4 : 1 }}>
                          <td style={{ color: '#d1d5db', textAlign: 'center' }}>⋮⋮</td>
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
                              onClick={() => handleToggleMethod(m.id, m.enabled)}
                            >
                              <span className={styles.toggleKnob} />
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <button
                                className={styles.editBtn}
                                onClick={() => setMethodModal({ open: true, method: m, zoneId: zone.id })}
                              >
                                Edit
                              </button>
                              <button
                                className={styles.deleteBtn}
                                disabled={deletingId === m.id}
                                onClick={() => handleDeleteMethod(m.id, m.title)}
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

                <div className={styles.addRow}>
                  <button
                    className={styles.addBtn}
                    onClick={() => setMethodModal({ open: true, zoneId: zone.id })}
                  >
                    + Add shipping method
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ── Add Zone Card ───────────────────────────────────────────── */}
      {!loading && (
        <div
          style={{
            border: '2px dashed #e5e7eb',
            borderRadius: 14,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            background: '#fafafa',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => setZoneModal({ open: true })}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLDivElement).style.background = '#f0fdfa'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.95rem' }}>+ Add shipping zone</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' }}>e.g. Republic of Ireland, Europe, Rest of World</div>
          </div>
          <span style={{ fontSize: '1.5rem', color: '#d1d5db' }}>🌍</span>
        </div>
      )}

      {!loading && (
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>💡 How shipping zones work</h3>
          <ul className={styles.infoList}>
            <li>Each zone has one or more <strong>countries</strong>. At checkout, the customer's billing country determines which zone they're in.</li>
            <li>Each zone has its own <strong>shipping methods</strong> with independent weight brackets and prices.</li>
            <li>If no zone matches the customer's country, the <strong>first zone</strong> is used as a fallback.</li>
            <li>Cart weight is totalled from each product's <strong>weight (g)</strong> field × quantity.</li>
          </ul>
        </div>
      )}

      {/* ── Method Modal ────────────────────────────────────────────── */}
      {methodModal.open && (
        <ShippingMethodModal
          method={methodModal.method}
          zoneId={methodModal.zoneId}
          onClose={() => setMethodModal({ open: false })}
          onSaved={loadData}
        />
      )}

      {/* ── Zone Modal ──────────────────────────────────────────────── */}
      {zoneModal.open && (
        <ShippingZoneModal
          zone={zoneModal.zone}
          nextSortOrder={zones.length + 1}
          onClose={() => setZoneModal({ open: false })}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
