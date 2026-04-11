'use client';

import { useState } from 'react';
import type { ShippingZone } from '@/lib/shipping';
import { createShippingZone, updateShippingZone, deleteShippingZone } from './actions';
import styles from './shipping.module.css';

const COMMON_COUNTRIES = [
  'United Kingdom (UK)', 'Republic of Ireland', 'France', 'Germany', 'Spain',
  'Italy', 'Netherlands', 'Belgium', 'Portugal', 'Australia', 'Canada',
  'United States', 'New Zealand',
];

interface Props {
  zone?: ShippingZone;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShippingZoneModal({ zone, nextSortOrder, onClose, onSaved }: Props) {
  const isEdit = !!zone;
  const [name, setName] = useState(zone?.name ?? '');
  const [countries, setCountries] = useState<string[]>(zone?.countries ?? []);
  const [customCountry, setCustomCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleCountry(country: string) {
    setCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  }

  function addCustom() {
    const c = customCountry.trim();
    if (c && !countries.includes(c)) setCountries(prev => [...prev, c]);
    setCustomCountry('');
  }

  async function handleSave() {
    if (!name.trim()) { setError('Zone name is required.'); return; }
    if (countries.length === 0) { setError('Add at least one country.'); return; }
    setSaving(true);
    setError('');

    const res = isEdit
      ? await updateShippingZone(zone!.id, { name, countries })
      : await createShippingZone({ name, countries, sort_order: nextSortOrder });

    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onSaved();
    onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? `Edit Zone: ${zone!.name}` : 'Add shipping zone'}</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Zone Name *</label>
            <p className={styles.fieldHint}>e.g. "Republic of Ireland", "Europe", "Rest of World"</p>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Zone name"
            />
          </div>

          <div className={styles.sectionDivider}>🌍 Countries in this zone</div>
          <p className={styles.fieldHint} style={{ margin: '0 0 0.75rem' }}>
            Customers choosing one of these countries at checkout will see this zone's shipping methods.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {COMMON_COUNTRIES.map(c => {
              const active = countries.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: 20,
                    border: '1.5px solid',
                    borderColor: active ? '#0d9488' : '#e5e7eb',
                    background: active ? '#f0fdfa' : '#fff',
                    color: active ? '#0f766e' : '#6b7280',
                    fontSize: '0.78rem',
                    fontWeight: active ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {active ? '✓ ' : ''}{c}
                </button>
              );
            })}
          </div>

          {/* Custom country input */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className={styles.fieldInput}
              value={customCountry}
              onChange={e => setCustomCountry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="Other country… press Enter"
            />
            <button className={styles.saveBtn} onClick={addCustom} style={{ flexShrink: 0 }}>Add</button>
          </div>

          {/* Selected summary */}
          {countries.length > 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: '#f0fdfa', borderRadius: 8, fontSize: '0.82rem', color: '#0f766e' }}>
              <strong>Selected:</strong> {countries.join(', ')}
            </div>
          )}

          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Zone'}
          </button>
        </div>
      </div>
    </div>
  );
}
