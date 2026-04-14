'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAllProducts,
  getCompatibilityLinks,
  addCompatibilityLink,
  updateCompatibilityLink,
  deleteCompatibilityLink,
  CompatibilityLink,
  Product,
} from '@/lib/data';
import styles from '../admin.module.css';

export default function CompatibilityPage() {
  const [links, setLinks] = useState<CompatibilityLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dropdown visibility
  const [showSourceDrop, setShowSourceDrop] = useState(false);
  const [showTargetDrop, setShowTargetDrop] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    Promise.all([getCompatibilityLinks(), getAllProducts()])
      .then(([linkData, prodData]) => {
        setLinks(linkData);
        setProducts(prodData.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sourceResults = useMemo(() => {
    if (!sourceSearch.trim()) return [];
    const q = sourceSearch.toLowerCase();
    return products
      .filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [sourceSearch, products]);

  const targetResults = useMemo(() => {
    if (!targetSearch.trim()) return [];
    const q = targetSearch.toLowerCase();
    return products
      .filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [targetSearch, products]);

  function selectSource(p: Product) {
    setSourceId(p.id);
    setSourceSearch(p.name || '');
    setShowSourceDrop(false);
  }

  function selectTarget(p: Product) {
    setTargetId(p.id);
    setTargetSearch(p.name || '');
    setShowTargetDrop(false);
  }

  function startEdit(link: CompatibilityLink) {
    setEditId(link.id);
    setSourceId(link.sourceProductId);
    setSourceSearch(link.sourceProductName);
    setTargetId(link.targetProductId);
    setTargetSearch(link.targetProductName);
    setLinkText(link.linkText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditId(null);
    setSourceId('');
    setTargetId('');
    setSourceSearch('');
    setTargetSearch('');
    setLinkText('');
  }

  async function handleSubmit() {
    if (!sourceId || !targetId || !linkText.trim()) return;
    if (sourceId === targetId) { showToast('Source and target must be different'); return; }

    setSaving(true);
    try {
      if (editId) {
        await updateCompatibilityLink(editId, linkText.trim());
        showToast('Link updated');
      } else {
        await addCompatibilityLink(sourceId, targetId, linkText.trim());
        showToast('Link added');
      }
      const updated = await getCompatibilityLinks();
      setLinks(updated);
      resetForm();
    } catch (err: any) {
      showToast(err.message?.includes('duplicate') ? 'This link already exists' : `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(link: CompatibilityLink) {
    if (!confirm(`Delete link from "${link.sourceProductName}" → "${link.targetProductName}"?`)) return;
    await deleteCompatibilityLink(link.id);
    setLinks(prev => prev.filter(l => l.id !== link.id));
    showToast('Link deleted');
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🔗 Compatibility Links</h1>
          <p className={styles.pageSubtitle}>
            Link products together — e.g. &quot;Buy replacement pods for this kit here&quot;
          </p>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        {/* ── Add/Edit Form ──────────────────────────────────────── */}
        <div className={styles.card} style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f' }}>
            {editId ? '✏️ Edit Link' : '➕ Add New Link'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Source Product */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#666', marginBottom: '0.4rem', display: 'block' }}>
                Source Product <span style={{ color: '#999', fontWeight: 400 }}>(where link appears)</span>
              </label>
              <input
                className={styles.input}
                placeholder="Search for a product…"
                value={sourceSearch}
                onChange={e => { setSourceSearch(e.target.value); setSourceId(''); setShowSourceDrop(true); }}
                onFocus={() => setShowSourceDrop(true)}
                onBlur={() => setTimeout(() => setShowSourceDrop(false), 200)}
                disabled={!!editId}
                style={{ width: '100%', background: editId ? '#f5f5f7' : undefined }}
              />
              {showSourceDrop && sourceResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto',
                }}>
                  {sourceResults.map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => selectSource(p)}
                      style={{
                        padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.88rem',
                        borderBottom: '1px solid #f5f5f7',
                      }}
                    >
                      <strong>{p.name}</strong>
                      {p.sku && <span style={{ color: '#999', marginLeft: '8px' }}>({p.sku})</span>}
                    </div>
                  ))}
                </div>
              )}
              {sourceId && <span style={{ fontSize: '0.75rem', color: '#0d9488', marginTop: '2px', display: 'block' }}>✓ Selected</span>}
            </div>

            {/* Target Product */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#666', marginBottom: '0.4rem', display: 'block' }}>
                Target Product <span style={{ color: '#999', fontWeight: 400 }}>(where link points to)</span>
              </label>
              <input
                className={styles.input}
                placeholder="Search for a product…"
                value={targetSearch}
                onChange={e => { setTargetSearch(e.target.value); setTargetId(''); setShowTargetDrop(true); }}
                onFocus={() => setShowTargetDrop(true)}
                onBlur={() => setTimeout(() => setShowTargetDrop(false), 200)}
                disabled={!!editId}
                style={{ width: '100%', background: editId ? '#f5f5f7' : undefined }}
              />
              {showTargetDrop && targetResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto',
                }}>
                  {targetResults.map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => selectTarget(p)}
                      style={{
                        padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.88rem',
                        borderBottom: '1px solid #f5f5f7',
                      }}
                    >
                      <strong>{p.name}</strong>
                      {p.sku && <span style={{ color: '#999', marginLeft: '8px' }}>({p.sku})</span>}
                    </div>
                  ))}
                </div>
              )}
              {targetId && <span style={{ fontSize: '0.75rem', color: '#0d9488', marginTop: '2px', display: 'block' }}>✓ Selected</span>}
            </div>
          </div>

          {/* Link Text */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#666', marginBottom: '0.4rem', display: 'block' }}>
              Link Text <span style={{ color: '#999', fontWeight: 400 }}>(full clickable sentence shown on product page)</span>
            </label>
            <input
              className={styles.input}
              placeholder='e.g. "Buy replacement refillable pods for this kit here."'
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleSubmit}
              disabled={saving || !sourceId || !targetId || !linkText.trim()}
            >
              {saving ? 'Saving...' : editId ? 'Update Link' : '+ Add Link'}
            </button>
            {editId && (
              <button className={`${styles.btn}`} onClick={resetForm} style={{ background: '#f5f5f7', color: '#666' }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* ── Existing Links Table ────────────────────────────────── */}
        <div className={styles.card}>
          <h2 style={{ margin: '0 0 1rem', padding: '1.25rem 1.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#1d1d1f' }}>
            Existing Compatibility Links ({links.length})
          </h2>

          {loading ? (
            <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
          ) : links.length === 0 ? (
            <div style={{ padding: '2rem', color: '#86868b', textAlign: 'center', fontSize: '0.9rem' }}>
              No compatibility links yet. Add your first one above.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 600, color: '#86868b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Product</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#86868b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Product</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#86868b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Link Text</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#86868b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Date</th>
                    <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 600, color: '#86868b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(link => (
                    <tr key={link.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                      <td style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>{link.sourceProductName}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{link.targetProductName}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#555' }}>{link.linkText}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#999', fontSize: '0.82rem' }}>
                        {new Date(link.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => startEdit(link)}
                          style={{ background: 'none', border: 'none', color: '#0d9488', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', marginRight: '8px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(link)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  );
}
