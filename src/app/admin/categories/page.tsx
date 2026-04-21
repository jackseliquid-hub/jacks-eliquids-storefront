'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCategoriesWithTags, saveCategories, deleteCategory, updateCategoryTags, updateCategoryImage, getTags, CategoryItem, TaxonomyItem } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allTags, setAllTags] = useState<TaxonomyItem[]>([]);
  const [productCats, setProductCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageInput, setImageInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      getCategoriesWithTags(),
      getTags(),
      supabase.from('products').select('category').range(0, 9999),
    ]).then(([cats, tags, { data: prods }]) => {
      setCategories(cats);
      setAllTags(tags);
      setProductCats((prods || []).map(p => p.category || '').filter(Boolean));
      setLoading(false);
    });
  }, []);

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
    if (!name || categories.some(c => c.name === name)) return;
    const updated = [...categories.map(c => c.name), name].sort();
    setSaving(true);
    try {
      await saveCategories(updated);
      const refreshed = await getCategoriesWithTags();
      setCategories(refreshed);
      setNewName('');
      showToast(`"${name}" added`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: CategoryItem) {
    const count = countMap.get(cat.name) || 0;
    const msg = count > 0
      ? `Delete category "${cat.name}"? ${count} product${count > 1 ? 's' : ''} will lose this category.`
      : `Delete category "${cat.name}"?`;
    if (!confirm(msg)) return;
    await deleteCategory(cat.id);
    setCategories(prev => prev.filter(c => c.id !== cat.id));
    setSelected(prev => { const next = new Set(prev); next.delete(cat.id); return next; });
    showToast(`"${cat.name}" removed`);
  }

  async function handleBulkDelete() {
    const toDelete = categories.filter(c => selected.has(c.id));
    if (toDelete.length === 0) return;
    const affected = toDelete.reduce((sum, c) => sum + (countMap.get(c.name) || 0), 0);
    const msg = affected > 0
      ? `Delete ${toDelete.length} categor${toDelete.length > 1 ? 'ies' : 'y'}? This affects ${affected} product${affected > 1 ? 's' : ''}.`
      : `Delete ${toDelete.length} categor${toDelete.length > 1 ? 'ies' : 'y'}?`;
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      await Promise.all(toDelete.map(c => deleteCategory(c.id)));
      setCategories(prev => prev.filter(c => !selected.has(c.id)));
      setSelected(new Set());
      showToast(`${toDelete.length} categor${toDelete.length > 1 ? 'ies' : 'y'} deleted`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTag(catId: string, tagName: string) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const currentTags = cat.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    try {
      await updateCategoryTags(catId, newTags);
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, tags: newTags } : c));
    } catch {
      showToast('Failed to update tags');
    }
  }

  function openImageEdit(cat: CategoryItem) {
    setEditingImageId(cat.id);
    setImageInput(cat.image_url || '');
  }

  async function handleSaveImage(catId: string) {
    try {
      const url = imageInput.trim() || null;
      await updateCategoryImage(catId, url);
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, image_url: url } : c));
      setEditingImageId(null);
      showToast('Image updated');
    } catch {
      showToast('Failed to update image');
    }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={categories.length > 0 && categories.every(c => selected.has(c.id))}
                    onChange={() => {
                      if (categories.every(c => selected.has(c.id))) setSelected(new Set());
                      else setSelected(new Set(categories.map(c => c.id)));
                    }}
                    style={{ cursor: 'pointer', width: 15, height: 15 }}
                    title="Select all"
                  />
                  <span>Category Name</span>
                  {selected.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={saving}
                      style={{
                        background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                        borderRadius: 6, padding: '0.2rem 0.7rem', fontSize: '0.75rem',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      🗑 Delete {selected.size} selected
                    </button>
                  )}
                </div>
                <span style={{ minWidth: '120px', textAlign: 'right' }}>Products</span>
              </div>

              <div className={styles.taxonomyList}>
                {categories.map(cat => {
                  const count = countMap.get(cat.name) || 0;
                  const isEditingTags = editingTagsId === cat.id;
                  const isSelected = selected.has(cat.id);
                  return (
                    <div key={cat.id} style={{ background: isSelected ? '#fef9f0' : undefined }}>
                      <div className={styles.taxonomyItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelected(prev => { const next = new Set(prev); isSelected ? next.delete(cat.id) : next.add(cat.id); return next; })}
                            style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
                          />
                          {cat.image_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={cat.image_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
                          )}
                          <span className={styles.taxonomyName}>{cat.name}</span>
                          {(cat.tags && cat.tags.length > 0) && (
                            <span style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 500 }}>
                              {cat.tags.length} tag{cat.tags.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => editingImageId === cat.id ? setEditingImageId(null) : openImageEdit(cat)}
                            style={{
                              background: editingImageId === cat.id ? '#fef3c7' : 'none', border: '1px solid',
                              borderColor: editingImageId === cat.id ? '#f59e0b' : '#e5e7eb',
                              borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.78rem',
                              cursor: 'pointer', color: editingImageId === cat.id ? '#92400e' : '#6b7280',
                              fontWeight: editingImageId === cat.id ? 600 : 400,
                            }}
                          >
                            🖼️ Image
                          </button>
                          <button
                            onClick={() => setEditingTagsId(isEditingTags ? null : cat.id)}
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
                            href={`/admin?cat=${encodeURIComponent(cat.name)}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: '36px', padding: '0.2rem 0.6rem',
                              background: count > 0 ? '#e8f8f0' : '#f5f5f7',
                              color: count > 0 ? '#1c8f55' : '#999',
                              borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                              textDecoration: 'none',
                            }}
                            title={count > 0 ? `View ${count} products in "${cat.name}"` : 'No products'}
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
                      {/* Image URL panel */}
                      {editingImageId === cat.id && (
                        <div style={{
                          padding: '0.6rem 1.5rem 0.8rem', background: '#fffbeb',
                          borderBottom: '1px solid #fde68a',
                          display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap',
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400e' }}>Image URL:</span>
                          <input
                            value={imageInput}
                            onChange={e => setImageInput(e.target.value)}
                            placeholder="https://example.com/category-image.png"
                            style={{ flex: 1, minWidth: 200, padding: '0.35rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'monospace' }}
                          />
                          {imageInput && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={imageInput} alt="preview" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                          )}
                          <button onClick={() => handleSaveImage(cat.id)} style={{
                            background: '#f59e0b', color: '#fff', border: 'none', padding: '0.3rem 0.7rem',
                            borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          }}>Save</button>
                          <button onClick={() => setEditingImageId(null)} style={{
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
                            const isActive = (cat.tags || []).includes(tag.name);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => handleToggleTag(cat.id, tag.name)}
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
