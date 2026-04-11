'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getAllProducts, getCategories, getTags, updateProduct, Product, TaxonomyItem } from '@/lib/data';
import styles from './admin.module.css';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TaxonomyItem[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [missingFilter, setMissingFilter] = useState<'weight' | 'sku' | 'cost' | null>(null);

  // Inline editing state  
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Extract unique taxonomies for filters
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(), [products]);

  useEffect(() => {
    Promise.all([
      getAllProducts(),
      getCategories(),
      getTags()
    ]).then(([prodData, catData, tagData]) => {
      const sorted = [...prodData].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProducts(sorted);
      setAllCategories(catData);
      setAllTags(tagData);
      setLoading(false);
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const filtered = useMemo(() => {
    let result = products;
    if (categoryFilter) result = result.filter(p => p.category === categoryFilter);
    if (brandFilter) result = result.filter(p => p.brand === brandFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => {
        const n = p.name || '';
        const s = p.sku || '';
        const i = p.id || '';
        return n.toLowerCase().includes(q) || s.toLowerCase().includes(q) || i.toLowerCase().includes(q);
      });
    }
    // Missing data filters
    if (missingFilter === 'weight') result = result.filter(p => !p.weight || Number(p.weight) === 0);
    if (missingFilter === 'sku')    result = result.filter(p => !p.sku || p.sku.trim() === '');
    if (missingFilter === 'cost')   result = result.filter(p => !p.costPrice || p.costPrice.trim() === '');
    return result;
  }, [search, categoryFilter, brandFilter, missingFilter, products]);

  // ─── Inline Save Helper ──────────────────────────────────────────────
  async function inlineSave(productId: string, field: string, value: string | string[]) {
    setSavingId(productId);
    try {
      await updateProduct(productId, { [field]: value } as Partial<Product>);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: value } : p));
      showToast('Saved ✓');
    } catch (err) {
      console.error('Inline save failed:', err);
      showToast('Save failed!');
    } finally {
      setSavingId(null);
      setEditingCell(null);
    }
  }

  // ─── Inline Price/Cost Edit ──────────────────────────────────────────
  function startEdit(productId: string, field: string, currentValue: string) {
    setEditingCell({ id: productId, field });
    setEditValue(currentValue || '');
  }

  function handleEditKeyDown(e: React.KeyboardEvent, productId: string, field: string) {
    if (e.key === 'Enter') {
      inlineSave(productId, field, editValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }

  // ─── Category Quick-Change ───────────────────────────────────────────
  function handleCategoryChange(productId: string, newCategory: string) {
    inlineSave(productId, 'category', newCategory);
  }

  // ─── Tag Toggle ──────────────────────────────────────────────────────
  function handleTagToggle(product: Product, tagName: string) {
    const currentTags = product.tags || [];
    const updated = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    inlineSave(product.id, 'tags', updated);
  }

  // ─── Tag Popover State ───────────────────────────────────────────────
  const [tagPopoverId, setTagPopoverId] = useState<string | null>(null);

  return (
    <>
      <div className={styles.pageHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className={styles.pageTitle}>Products</h1>
            <p className={styles.pageSubtitle}>{filtered.length} products showing</p>
          </div>
          {/* ── Row 1: Main filters ───────────────────────────────── */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <select
              className={styles.select}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 20, fontSize: '0.85rem' }}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              className={styles.select}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 20, fontSize: '0.85rem' }}
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
            >
              <option value="">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <div className={styles.searchBar} style={{ margin: 0, borderRadius: 20 }}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                style={{ padding: '0.4rem', fontSize: '0.85rem', width: 180, background: 'transparent' }}
                type="text"
                placeholder="Search by name or SKU…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Row 2: Missing data filter ───────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Find Products Missing:
          </span>
          {(['weight', 'sku', 'cost'] as const).map(type => {
            const labels = { weight: '⚖️ Weight', sku: '🔖 SKU', cost: '💷 Cost Price' };
            const active = missingFilter === type;
            return (
              <button
                key={type}
                onClick={() => setMissingFilter(active ? null : type)}
                style={{
                  padding: '0.32rem 0.75rem',
                  borderRadius: 20,
                  border: '1.5px solid',
                  borderColor: active ? '#ef4444' : '#e5e7eb',
                  background: active ? '#fef2f2' : '#fff',
                  color: active ? '#dc2626' : '#6b7280',
                  fontSize: '0.8rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {labels[type]}
              </button>
            );
          })}
          {missingFilter && (
            <button
              onClick={() => setMissingFilter(null)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              Loading products…
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Image</th>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Tags</th>
                    <th>Cost</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product, index) => (
                    <tr key={product.id || `prod-${index}`} style={{ opacity: savingId === product.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                      <td>
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt={product.name} className={styles.thumb} />
                        ) : (
                          <div className={styles.thumbPlaceholder}>📦</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, maxWidth: 300 }}>
                        <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {product.name}
                          {product.status === 'draft' && (
                            <span style={{ marginLeft: '8px', padding: '1px 6px', backgroundColor: '#f5f5f7', color: '#86868b', borderRadius: '4px', fontSize: '0.70rem', fontWeight: 600, border: '1px solid #d2d2d7' }}>
                              DRAFT
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#86868b', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {product.sku || '—'}
                      </td>

                      {/* ─── Inline Category Selector ─── */}
                      <td>
                        <select
                          className={styles.select}
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: 8, minWidth: 100, background: '#fafafa' }}
                          value={product.category || ''}
                          onChange={e => handleCategoryChange(product.id, e.target.value)}
                        >
                          <option value="">—</option>
                          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>

                      {/* ─── Inline Tags ─── */}
                      <td style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                          {(product.tags || []).map(tag => (
                            <span
                              key={tag}
                              className={styles.chip}
                              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', cursor: 'pointer' }}
                              onClick={() => handleTagToggle(product, tag)}
                              title="Click to remove"
                            >
                              {tag}
                              <span className={styles.chipRemove}>✕</span>
                            </span>
                          ))}
                          <button
                            className={styles.chipOption}
                            style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', border: 'none' }}
                            onClick={() => setTagPopoverId(tagPopoverId === product.id ? null : product.id)}
                            title="Add tag"
                          >
                            +
                          </button>
                        </div>

                        {/* Tag Popover */}
                        {tagPopoverId === product.id && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 50,
                            background: '#fff',
                            border: '1px solid #e5e5e5',
                            borderRadius: 10,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            padding: '0.5rem',
                            minWidth: 160,
                            maxHeight: 200,
                            overflowY: 'auto'
                          }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#86868b', padding: '0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Toggle Tags
                            </div>
                            {allTags.length === 0 && (
                              <div style={{ fontSize: '0.8rem', color: '#86868b', padding: '0.5rem' }}>No tags created yet</div>
                            )}
                            {allTags.map(tag => {
                              const isActive = (product.tags || []).includes(tag.name);
                              return (
                                <button
                                  key={tag.id}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '0.4rem 0.5rem',
                                    fontSize: '0.8rem',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    background: isActive ? '#1d1d1f' : 'transparent',
                                    color: isActive ? '#fff' : '#333',
                                    fontWeight: isActive ? 600 : 400,
                                    transition: 'all 0.12s ease'
                                  }}
                                  onClick={() => {
                                    handleTagToggle(product, tag.name);
                                  }}
                                >
                                  {isActive ? '✓ ' : ''}{tag.name}
                                </button>
                              );
                            })}
                            <button
                              style={{ display: 'block', width: '100%', textAlign: 'center', padding: '0.4rem', fontSize: '0.75rem', color: '#86868b', border: 'none', background: 'none', cursor: 'pointer', marginTop: '0.25rem' }}
                              onClick={() => setTagPopoverId(null)}
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </td>

                      {/* ─── Inline Cost Price ─── */}
                      <td>
                        {editingCell?.id === product.id && editingCell?.field === 'costPrice' ? (
                          <input
                            className={styles.varInput}
                            style={{ maxWidth: 80 }}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleEditKeyDown(e, product.id, 'costPrice')}
                            onBlur={() => inlineSave(product.id, 'costPrice', editValue)}
                            autoFocus
                          />
                        ) : (
                          <span
                            style={{ cursor: 'pointer', color: product.costPrice ? '#1d1d1f' : '#ccc', fontSize: '0.85rem', borderBottom: '1px dashed #d2d2d7', paddingBottom: 1 }}
                            onClick={() => startEdit(product.id, 'costPrice', product.costPrice || '')}
                            title="Click to edit cost price"
                          >
                            {product.costPrice || '—'}
                          </span>
                        )}
                      </td>

                      {/* ─── Inline Sale Price ─── */}
                      <td>
                        {editingCell?.id === product.id && editingCell?.field === 'price' ? (
                          <input
                            className={styles.varInput}
                            style={{ maxWidth: 80 }}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleEditKeyDown(e, product.id, 'price')}
                            onBlur={() => inlineSave(product.id, 'price', editValue)}
                            autoFocus
                          />
                        ) : (
                          <span
                            style={{ cursor: 'pointer', fontWeight: 500, borderBottom: '1px dashed #d2d2d7', paddingBottom: 1 }}
                            onClick={() => startEdit(product.id, 'price', product.price || '')}
                            title="Click to edit price"
                          >
                            {product.price !== 'N/A' ? product.price : <span style={{ color: '#86868b' }}>See options</span>}
                          </span>
                        )}
                      </td>

                      <td>
                        {(product.variations || []).length > 0 ? (
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>
                            {product.variations.length} vars
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>Simple</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/product/${product.id}`}
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
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#86868b' }}>
                        No products match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={styles.toast}>{toast}</div>
      )}
    </>
  );
}
