'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTags, addTag, deleteTag, TaxonomyItem } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function TagsPage() {
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getTags(),
      supabase.from('products').select('tags').range(0, 9999),
    ]).then(([t, { data: prods }]) => {
      setTags(t);
      // Flatten all tag arrays into a single list
      const allTags: string[] = [];
      (prods || []).forEach(p => {
        if (Array.isArray(p.tags)) {
          p.tags.forEach((tag: string) => { if (tag) allTags.push(tag); });
        }
      });
      setProductTags(allTags);
      setLoading(false);
    });
  }, []);

  // Count products per tag
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tag of productTags) {
      map.set(tag, (map.get(tag) || 0) + 1);
    }
    return map;
  }, [productTags]);

  const totalAssignments = productTags.length;

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
    const count = countMap.get(tag.name) || 0;
    const msg = count > 0
      ? `Delete tag "${tag.name}"? ${count} product${count > 1 ? 's' : ''} will lose this tag.`
      : `Delete tag "${tag.name}"?`;
    if (!confirm(msg)) return;
    await deleteTag(tag.id);
    setTags(prev => prev.filter(t => t.id !== tag.id));
    showToast(`"${tag.name}" removed`);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tags</h1>
          <p className={styles.pageSubtitle}>
            {tags.length} tags · {totalAssignments} tag assignments
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
                <span>Tag Name</span>
                <span style={{ minWidth: '120px', textAlign: 'right' }}>Products</span>
              </div>

              <div className={styles.taxonomyList}>
                {tags.length === 0 && (
                  <div style={{ padding: '2rem', color: '#86868b', textAlign: 'center', fontSize: '0.9rem' }}>
                    No tags yet. Add your first one below.
                  </div>
                )}
                {tags.map(tag => {
                  const count = countMap.get(tag.name) || 0;
                  return (
                    <div key={tag.id} className={styles.taxonomyItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span className={styles.taxonomyName}>{tag.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                          href={`/admin?tag=${encodeURIComponent(tag.name)}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: '36px', padding: '0.2rem 0.6rem',
                            background: count > 0 ? '#e8f8f0' : '#f5f5f7',
                            color: count > 0 ? '#1c8f55' : '#999',
                            borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                            textDecoration: 'none',
                          }}
                          title={count > 0 ? `View ${count} products tagged "${tag.name}"` : 'No products'}
                        >
                          {count}
                        </Link>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleDelete(tag)}
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
