'use client';

import { useState, useEffect } from 'react';
import { getBrands, addBrand, deleteBrand, TaxonomyItem } from '@/lib/data';
import styles from '../admin.module.css';

export default function BrandsPage() {
  const [brands, setBrands] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getBrands().then(b => { setBrands(b); setLoading(false); });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await addBrand(name);
      const updated = await getBrands();
      setBrands(updated);
      setNewName('');
      showToast(`"${name}" added`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(brand: TaxonomyItem) {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    await deleteBrand(brand.id);
    setBrands(prev => prev.filter(b => b.id !== brand.id));
    showToast(`"${brand.name}" removed`);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Brands</h1>
          <p className={styles.pageSubtitle}>{brands.length} brands</p>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
          ) : (
            <>
              <div className={styles.taxonomyList}>
                {brands.length === 0 && (
                  <div style={{ padding: '2rem', color: '#86868b', textAlign: 'center', fontSize: '0.9rem' }}>
                    No brands yet. Add your first one below.
                  </div>
                )}
                {brands.map(brand => (
                  <div key={brand.id} className={styles.taxonomyItem}>
                    <span className={styles.taxonomyName}>{brand.name}</span>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(brand)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.addForm}>
                <input
                  className={styles.input}
                  placeholder="New brand name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  style={{ flex: 1 }}
                />
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleAdd}
                  disabled={saving || !newName.trim()}
                >
                  + Add Brand
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  );
}
