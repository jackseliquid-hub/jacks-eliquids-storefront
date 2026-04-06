'use client';

import { useState, useEffect } from 'react';
import { getCategories, saveCategories } from '@/lib/data';
import styles from '../admin.module.css';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(c => {
      setCategories([...c].sort());
      setLoading(false);
    });
  }, []);

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
    if (!confirm(`Delete category "${cat}"? This will not affect existing products.`)) return;
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
          <p className={styles.pageSubtitle}>{categories.length} categories</p>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
          ) : (
            <>
              <div className={styles.taxonomyList}>
                {categories.map(cat => (
                  <div key={cat} className={styles.taxonomyItem}>
                    <span className={styles.taxonomyName}>{cat}</span>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(cat)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
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
