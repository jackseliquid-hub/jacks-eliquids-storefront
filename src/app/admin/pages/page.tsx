'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getAllPages, deletePage, Page } from '@/lib/data';
import styles from '../admin.module.css';

export default function AdminPagesList() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const data = await getAllPages();
      setPages(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await deletePage(id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    }
  }

  const filtered = useMemo(() => {
    if (!search) return pages;
    const low = search.toLowerCase();
    return pages.filter(p => p.title.toLowerCase().includes(low) || (p.slug && p.slug.toLowerCase().includes(low)));
  }, [pages, search]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pages</h1>
          <p className={styles.pageSubtitle}>Manage generic pages like Terms, Privacy, and About Us.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/pages/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            + Add Page
          </Link>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e5e5', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search pages by title or slug..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
             {search ? 'No pages match your search.' : 'No pages created yet. Click Add Page to create some.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Title / Slug</th>
                <th>Status</th>
                <th>Created</th>
                <th className={styles.actionsCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(page => (
                <tr key={page.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{page.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#86868b', marginTop: '2px' }}>/p/{page.slug}</div>
                  </td>
                  <td>
                     <span style={{ 
                        display: 'inline-block', 
                        padding: '2px 8px', 
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: page.status === 'published' ? '#e0f2f1' : '#f5f5f7',
                        color: page.status === 'published' ? '#00695c' : '#86868b'
                     }}>
                        {page.status}
                     </span>
                  </td>
                  <td style={{ color: '#86868b' }}>
                    {page.createdAt ? new Date(page.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className={styles.actionsCell}>
                     <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link href={`/admin/pages/${page.id}`} className={styles.actionBtn}>
                          Edit
                        </Link>
                        <button className={styles.actionBtn} style={{ color: '#ff3b30' }} onClick={() => handleDelete(page.id)}>
                          Delete
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
