'use client';

import { useState } from 'react';
import type { ShippingMethod } from '@/lib/shipping';
import { createShippingMethod, updateShippingMethod } from './actions';
import styles from './shipping.module.css';

const EMPTY: Omit<ShippingMethod, 'id'> = {
  zone_id: null,
  title: '',
  enabled: true,
  sort_order: 99,
  ll_max_weight: 750,
  ll_tier_1_weight: null,
  ll_cost_1: null,
  ll_tier_2_weight: null,
  ll_cost_2: null,
  ll_tier_3_weight: null,
  ll_cost_3: null,
  ll_cost_4: null,
  parcel_tier_1_weight: 2000,
  parcel_cost_1: 0,
  parcel_cost_heavy: 0,
};

interface Props {
  method?: ShippingMethod;
  zoneId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShippingMethodModal({ method, zoneId, onClose, onSaved }: Props) {
  const isEdit = !!method;
  const [form, setForm] = useState<Omit<ShippingMethod, 'id'>>(
    method ? { ...method } : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(key: keyof typeof form, raw: string) {
    const isNumericKey = key !== 'title' && key !== 'enabled';
    const value = isNumericKey
      ? raw === '' ? null : parseFloat(raw)
      : raw;
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Checkout title is required.'); return; }
    setSaving(true);
    setError('');

    const res = isEdit
      ? await updateShippingMethod(method!.id, form)
      : await createShippingMethod({ ...form, zone_id: zoneId ?? null } as any);

    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onSaved();
    onClose();
  }

  function numVal(v: number | null | undefined) {
    return v === null || v === undefined ? '' : String(v);
  }

  return (
    <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? `Edit: ${method!.title}` : 'Add shipping method'}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Title */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Checkout Title *</label>
            <input
              className={styles.fieldInput}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Royal Mail Tracked"
            />
          </div>

          {/* ── Large Letter ──────────────────────────────────────────── */}
          <div className={styles.sectionDivider}>📮 Large Letter</div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Absolute Max Weight (g)</label>
            <p className={styles.fieldHint}>If cart weight exceeds this, it becomes a Small Parcel regardless.</p>
            <input
              className={styles.fieldInput}
              type="number"
              value={numVal(form.ll_max_weight)}
              onChange={e => setField('ll_max_weight', e.target.value)}
              placeholder="750"
            />
          </div>

          <div className={styles.tierGrid}>
            <div className={styles.tierRow}>
              <span className={styles.tierLabel}>Tier 1</span>
              <div className={styles.tierFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Max Weight (g)</label>
                  <input className={styles.fieldInput} type="number" value={numVal(form.ll_tier_1_weight)}
                    onChange={e => setField('ll_tier_1_weight', e.target.value)} placeholder="100" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Cost (£)</label>
                  <input className={styles.fieldInput} type="number" step="0.01" value={numVal(form.ll_cost_1)}
                    onChange={e => setField('ll_cost_1', e.target.value)} placeholder="1.75" />
                </div>
              </div>
            </div>

            <div className={styles.tierRow}>
              <span className={styles.tierLabel}>Tier 2</span>
              <div className={styles.tierFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Max Weight (g)</label>
                  <input className={styles.fieldInput} type="number" value={numVal(form.ll_tier_2_weight)}
                    onChange={e => setField('ll_tier_2_weight', e.target.value)} placeholder="250" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Cost (£)</label>
                  <input className={styles.fieldInput} type="number" step="0.01" value={numVal(form.ll_cost_2)}
                    onChange={e => setField('ll_cost_2', e.target.value)} placeholder="2.50" />
                </div>
              </div>
            </div>

            <div className={styles.tierRow}>
              <span className={styles.tierLabel}>Tier 3</span>
              <div className={styles.tierFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Max Weight (g)</label>
                  <input className={styles.fieldInput} type="number" value={numVal(form.ll_tier_3_weight)}
                    onChange={e => setField('ll_tier_3_weight', e.target.value)} placeholder="500" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Cost (£)</label>
                  <input className={styles.fieldInput} type="number" step="0.01" value={numVal(form.ll_cost_3)}
                    onChange={e => setField('ll_cost_3', e.target.value)} placeholder="2.80" />
                </div>
              </div>
            </div>

            <div className={styles.tierRow}>
              <span className={styles.tierLabel}>Tier 4 <span className={styles.tierHint}>(heaviest letter)</span></span>
              <div className={styles.tierFields}>
                <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.fieldLabel}>Cost (£)</label>
                  <input className={styles.fieldInput} type="number" step="0.01" value={numVal(form.ll_cost_4)}
                    onChange={e => setField('ll_cost_4', e.target.value)} placeholder="2.95" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Small Parcel ──────────────────────────────────────────── */}
          <div className={styles.sectionDivider}>📦 Small Parcel</div>

          <div className={styles.tierRow}>
            <span className={styles.tierLabel}>Tier 1</span>
            <div className={styles.tierFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Max Weight (g)</label>
                <input className={styles.fieldInput} type="number" value={numVal(form.parcel_tier_1_weight)}
                  onChange={e => setField('parcel_tier_1_weight', e.target.value)} placeholder="2000" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Cost (£)</label>
                <input className={styles.fieldInput} type="number" step="0.01" value={numVal(form.parcel_cost_1)}
                  onChange={e => setField('parcel_cost_1', e.target.value)} placeholder="3.35" />
              </div>
            </div>
          </div>

          <div className={styles.tierRow}>
            <span className={styles.tierLabel}>Heavy <span className={styles.tierHint}>(over tier 1)</span></span>
            <div className={styles.tierFields}>
              <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.fieldLabel}>Cost (£)</label>
                <input className={styles.fieldInput} type="number" step="0.01" value={numVal(form.parcel_cost_heavy)}
                  onChange={e => setField('parcel_cost_heavy', e.target.value)} placeholder="7.99" />
              </div>
            </div>
          </div>

          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
