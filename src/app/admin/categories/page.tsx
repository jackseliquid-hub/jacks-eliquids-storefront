'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCategories, saveCategories } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [productCats, setProductCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getCategories(),
      // Lightweight query — just fetch category column for all products
      supabase.from('products').select('category').range(0, 9999),
    ]).then(([cats, { data: prods }]) => {
      setCategories([...cats].sort());
      setProductCats((prods || []).map(p => p.category || '').filter(Boolean));
      setLoading(false);
    });
  }, []);

  // Count products per category
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of productCats) {
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return map;
  }, [productCats]);

  const totalProducts = productCats.length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name || categories.includes(name)) return;
    const updated = [...categories, name].sort();
    setSaving(true);
    try {
      await saveCategories(updated);
      setCategories(updated);
      setNewName('');
      showToast(`"${name}" added`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: string) {
    const count = countMap.get(cat) || 0;
    const msg = count > 0
      ? `Delete category "${cat}"? ${count} product${count > 1 ? 's' : ''} will lose this category.`
      : `Delete category "${cat}"?`;
    if (!confirm(msg)) return;
    const updated = categories.filter(c => c !== cat);
    await saveCategories(updated);
    setCategories(updated);
    showToast(`"${cat}" removed`);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Categories</h1>
          <p className={styles.pageSubtitle}>
            {categories.length} categories · {totalProducts} products assigned
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
                <span>Category Name</span>
                <span style={{ minWidth: '120px', textAlign: 'right' }}>Products</span>
              </div>

              <div className={styles.taxonomyList}>
                {categories.map(cat => {
                  const count = countMap.get(cat) || 0;
                  return (
                    <div key={cat} className={styles.taxonomyItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span className={styles.taxonomyName}>{cat}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                          href={`/admin?cat=${encodeURIComponent(cat)}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: '36px', padding: '0.2rem 0.6rem',
                            background: count > 0 ? '#e8f8f0' : '#f5f5f7',
                            color: count > 0 ? '#1c8f55' : '#999',
                            borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                            textDecoration: 'none',
                          }}
                          title={count > 0 ? `View ${count} products in "${cat}"` : 'No products'}
                        >
                          {count}
                        </Link>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(cat)}
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
                  placeholder="New category name…"
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
                  + Add Category
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
