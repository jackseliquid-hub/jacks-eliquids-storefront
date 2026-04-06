'use client';

import { useState, useEffect } from 'react';
import { getTags, addTag, deleteTag, TaxonomyItem } from '@/lib/data';
import styles from '../admin.module.css';

export default function TagsPage() {
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getTags().then(t => { setTags(t); setLoading(false); });
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
      await addTag(name);
      const updated = await getTags();
      setTags(updated);
      setNewName('');
      showToast(`"${name}" added`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tag: TaxonomyItem) {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    await deleteTag(tag.id);
    setTags(prev => prev.filter(t => t.id !== tag.id));
    showToast(`"${tag.name}" removed`);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tags</h1>
          <p className={styles.pageSubtitle}>{tags.length} tags</p>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
          ) : (
            <>
              <div className={styles.taxonomyList}>
                {tags.length === 0 && (
                  <div style={{ padding: '2rem', color: '#86868b', textAlign: 'center', fontSize: '0.9rem' }}>
                    No tags yet. Add your first one below.
                  </div>
                )}
                {tags.map(tag => (
                  <div key={tag.id} className={styles.taxonomyItem}>
                    <div>
                      <span className={styles.taxonomyName}>{tag.name}</span>
                    </div>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(tag)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.addForm}>
                <input
                  className={styles.input}
                  placeholder="New tag name…"
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
                  + Add Tag
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
