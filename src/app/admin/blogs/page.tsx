'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getAllBlogs, Blog } from '@/lib/data';
import styles from '../admin.module.css';

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    getAllBlogs().then(data => {
      setBlogs(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = blogs;

    if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(b => {
            const t = b.title || '';
            const i = b.id || '';
            return t.toLowerCase().includes(q) || i.toLowerCase().includes(q);
        });
    }

    return result;
  }, [search, blogs]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Blogs</h1>
          <p className={styles.pageSubtitle}>{filtered.length} blogs showing</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href={`/admin/blogs/new`}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ borderRadius: 20 }}
          >
            + Add Blog
          </Link>

          <div className={styles.searchBar} style={{ margin: 0, borderRadius: 20 }}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              style={{ padding: '0.45rem', fontSize: '0.9rem', width: 200, background: 'transparent' }}
              type="text"
              placeholder="Search by title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              Loading blogs…
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Image</th>
                    <th>Title</th>
                    <th>Slug</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((blog, index) => (
                    <tr key={blog.id || `blog-${index}`}>
                      <td>
                        {blog.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={blog.image} alt={blog.title} className={styles.thumb} />
                        ) : (
                          <div className={styles.thumbPlaceholder}>📝</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, maxWidth: 300 }}>
                        <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {blog.title}
                        </div>
                      </td>
                      <td style={{ color: '#86868b', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {blog.slug || '—'}
                      </td>
                      <td style={{ color: '#555', fontSize: '0.85rem' }}>{blog.author}</td>
                      <td>
                        {blog.status === 'published' ? (
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>Published</span>
                        ) : (
                          <span style={{ padding: '2px 8px', backgroundColor: '#f5f5f7', color: '#86868b', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #d2d2d7' }}>
                            Draft
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/blogs/${blog.id}`}
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#86868b' }}>
                        No blogs match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
