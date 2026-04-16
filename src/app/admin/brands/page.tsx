'use client';

import { useState, useEffect, useMemo } from 'react';
import { getBrands, addBrand, deleteBrand, TaxonomyItem } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function BrandsPage() {
  const [brands, setBrands] = useState<TaxonomyItem[]>([]);
  const [productBrands, setProductBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getBrands(),
      supabase.from('products').select('brand').range(0, 9999),
    ]).then(([b, { data: prods }]) => {
      setBrands(b);
      setProductBrands((prods || []).map(p => p.brand || '').filter(Boolean));
      setLoading(false);
    });
  }, []);

  // Count products per brand
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const brand of productBrands) {
      map.set(brand, (map.get(brand) || 0) + 1);
    }
    return map;
  }, [productBrands]);

  const totalProducts = productBrands.length;

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
    const count = countMap.get(brand.name) || 0;
    const msg = count > 0
      ? `Delete brand "${brand.name}"? ${count} product${count > 1 ? 's' : ''} will lose this brand.`
      : `Delete brand "${brand.name}"?`;
    if (!confirm(msg)) return;
    await deleteBrand(brand.id);
    setBrands(prev => prev.filter(b => b.id !== brand.id));
    showToast(`"${brand.name}" removed`);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Brands</h1>
          <p className={styles.pageSubtitle}>
            {brands.length} brands · {totalProducts} products assigned
          </p>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
          ) : (
            <>
              {/* Header row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.65rem 1.5rem', borderBottom: '2px solid #f0f0f0',
                fontSize: '0.75rem', fontWeight: 600, color: '#86868b',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <span>Brand Name</span>
                <span style={{ minWidth: '120px', textAlign: 'right' }}>Products</span>
              </div>

              <div className={styles.taxonomyList}>
                {brands.length === 0 && (
                  <div style={{ padding: '2rem', color: '#86868b', textAlign: 'center', fontSize: '0.9rem' }}>
                    No brands yet. Add your first one below.
                  </div>
                )}
                {brands.map(brand => {
                  const count = countMap.get(brand.name) || 0;
                  return (
                    <div key={brand.id} className={styles.taxonomyItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span className={styles.taxonomyName}>{brand.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                          href={`/admin?brand=${encodeURIComponent(brand.name)}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: '36px', padding: '0.2rem 0.6rem',
                            background: count > 0 ? '#e8f8f0' : '#f5f5f7',
                            color: count > 0 ? '#1c8f55' : '#999',
                            borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                            textDecoration: 'none',
                          }}
                          title={count > 0 ? `View ${count} products by "${brand.name}"` : 'No products'}
                        >
                          {count}
                        </Link>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(brand)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
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
