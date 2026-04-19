'use client';

import { useState, useEffect, useMemo } from 'react';
import { getBrands, addBrand, deleteBrand, updateBrandTags, updateBrandLogo, getTags, TaxonomyItem } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function BrandsPage() {
  const [brands, setBrands] = useState<TaxonomyItem[]>([]);
  const [allTags, setAllTags] = useState<TaxonomyItem[]>([]);
  const [productBrands, setProductBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [logoInput, setLogoInput] = useState('');

  useEffect(() => {
    Promise.all([
      getBrands(),
      getTags(),
      supabase.from('products').select('brand').range(0, 9999),
    ]).then(([b, tags, { data: prods }]) => {
      setBrands(b);
      setAllTags(tags);
      setProductBrands((prods || []).map(p => p.brand || '').filter(Boolean));
      setLoading(false);
    });
  }, []);

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

  async function handleToggleTag(brandId: string, tagName: string) {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;
    const currentTags = brand.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    try {
      await updateBrandTags(brandId, newTags);
      setBrands(prev => prev.map(b => b.id === brandId ? { ...b, tags: newTags } : b));
    } catch {
      showToast('Failed to update tags');
    }
  }

  function openLogoEdit(brand: TaxonomyItem) {
    setEditingLogoId(brand.id);
    setLogoInput(brand.logo_url || '');
  }

  async function handleSaveLogo(brandId: string) {
    try {
      const url = logoInput.trim() || null;
      await updateBrandLogo(brandId, url);
      setBrands(prev => prev.map(b => b.id === brandId ? { ...b, logo_url: url } : b));
      setEditingLogoId(null);
      showToast('Logo updated');
    } catch {
      showToast('Failed to update logo');
    }
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
                  const isEditingTags = editingTagsId === brand.id;
                  return (
                    <div key={brand.id}>
                      <div className={styles.taxonomyItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                          {brand.logo_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={brand.logo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
                          )}
                          <span className={styles.taxonomyName}>{brand.name}</span>
                          {(brand.tags && brand.tags.length > 0) && (
                            <span style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 500 }}>
                              {brand.tags.length} tag{brand.tags.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => editingLogoId === brand.id ? setEditingLogoId(null) : openLogoEdit(brand)}
                            style={{
                              background: editingLogoId === brand.id ? '#fef3c7' : 'none', border: '1px solid',
                              borderColor: editingLogoId === brand.id ? '#f59e0b' : '#e5e7eb',
                              borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.78rem',
                              cursor: 'pointer', color: editingLogoId === brand.id ? '#92400e' : '#6b7280',
                              fontWeight: editingLogoId === brand.id ? 600 : 400,
                            }}
                          >
                            🖼️ Logo
                          </button>
                          <button
                            onClick={() => setEditingTagsId(isEditingTags ? null : brand.id)}
                            style={{
                              background: isEditingTags ? '#f0fdfa' : 'none', border: '1px solid',
                              borderColor: isEditingTags ? '#0d9488' : '#e5e7eb',
                              borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.78rem',
                              cursor: 'pointer', color: isEditingTags ? '#0f766e' : '#6b7280',
                              fontWeight: isEditingTags ? 600 : 400,
                            }}
                          >
                            🏷️ Tags
                          </button>
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
                      {/* Logo URL panel */}
                      {editingLogoId === brand.id && (
                        <div style={{
                          padding: '0.6rem 1.5rem 0.8rem', background: '#fffbeb',
                          borderBottom: '1px solid #fde68a',
                          display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap',
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400e' }}>Logo URL:</span>
                          <input
                            value={logoInput}
                            onChange={e => setLogoInput(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            style={{ flex: 1, minWidth: 200, padding: '0.35rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'monospace' }}
                          />
                          {logoInput && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={logoInput} alt="preview" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                          )}
                          <button onClick={() => handleSaveLogo(brand.id)} style={{
                            background: '#f59e0b', color: '#fff', border: 'none', padding: '0.3rem 0.7rem',
                            borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          }}>Save</button>
                          <button onClick={() => setEditingLogoId(null)} style={{
                            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem',
                          }}>Cancel</button>
                        </div>
                      )}
                      {/* Tag assignment panel */}
                      {isEditingTags && (
                        <div style={{
                          padding: '0.6rem 1.5rem 0.8rem', background: '#fafafa',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex', flexWrap: 'wrap', gap: '0.35rem',
                        }}>
                          {allTags.length === 0 && (
                            <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No tags created yet. Add tags first.</span>
                          )}
                          {allTags.map(tag => {
                            const isActive = (brand.tags || []).includes(tag.name);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => handleToggleTag(brand.id, tag.name)}
                                style={{
                                  padding: '0.25rem 0.7rem', borderRadius: 9999,
                                  fontSize: '0.78rem', cursor: 'pointer',
                                  border: '1px solid',
                                  borderColor: isActive ? '#0d9488' : '#e5e7eb',
                                  background: isActive ? '#0d9488' : '#fff',
                                  color: isActive ? '#fff' : '#555',
                                  fontWeight: isActive ? 600 : 400,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {isActive ? '✓ ' : ''}{tag.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
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
