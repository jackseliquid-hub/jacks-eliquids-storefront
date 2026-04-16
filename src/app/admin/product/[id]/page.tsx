'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  getProductById,
  getCategories,
  saveCategories,
  getTags,
  addTag,
  getBrands,
  addBrand,
  updateProduct,
  Product,
  Variation,
  TaxonomyItem,
} from '@/lib/data';
import styles from '../../admin.module.css';
import MediaModal from '@/components/MediaModal';
import SeoEditorCard from '@/components/SeoEditorCard';
import AiGenerateButton from '@/components/AiGenerateButton';

// Load MDEditor only on client to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TaxonomyItem[]>([]);
  const [allBrands, setAllBrands] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  // Media Modal state
  const [mediaModalOpen, setMediaModalOpen] = useState<{
    isOpen: boolean;
    target: 'main' | 'gallery' | null;
  }>({ isOpen: false, target: null });

  // Bulk variation fields
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkQty, setBulkQty] = useState('');
  const [rawAttributes, setRawAttributes] = useState<Record<string, string>>({});

  // Inline create states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTag, setShowNewTag] = useState(false);
  useEffect(() => {
    async function load() {
      const [prod, cats, tags, brands] = await Promise.all([
        getProductById(id),
        getCategories(),
        getTags(),
        getBrands(),
      ]);
      if (prod) setProduct(prod);
      setCategories(cats);
      setAllTags(tags);
      setAllBrands(brands);
      setLoading(false);
    }
    load();
  }, [id]);

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Field Handlers ────────────────────────────────────────────────────────

  function setField<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct(prev => prev ? { ...prev, [key]: value } : null);
  }

  function setVariationField(index: number, key: keyof Variation, value: string | boolean | number | null) {
    setProduct(prev => {
      if (!prev) return null;
      const variations = [...prev.variations];
      variations[index] = { ...variations[index], [key]: value };
      return { ...prev, variations };
    });
  }

  function applyPriceToAll() {
    if (!bulkPrice.trim()) return;
    const formatted = bulkPrice.startsWith('£') ? bulkPrice : `£${bulkPrice}`;
    setProduct(prev => {
      if (!prev) return null;
      return {
        ...prev,
        price: formatted,
        variations: prev.variations.map(v => ({ ...v, price: formatted })),
      };
    });
    showToast(`Price ${formatted} applied to all ${product?.variations.length} variations`);
  }

  function applyStockToAll() {
    const inStock = bulkStock === 'true';
    setProduct(prev => {
      if (!prev) return null;
      return {
        ...prev,
        variations: prev.variations.map(v => ({ ...v, inStock })),
      };
    });
    showToast(`Stock status "${inStock ? 'In Stock' : 'Out of Stock'}" applied to all variations`);
  }

  function applyQtyToAll() {
    const qty = parseInt(bulkQty, 10);
    if (isNaN(qty) || qty < 0) return;
    setProduct(prev => {
      if (!prev) return null;
      return {
        ...prev,
        variations: prev.variations.map(v => ({ ...v, stockQty: qty })),
      };
    });
    showToast(`Quantity ${qty} applied to all ${product?.variations.length} variations`);
  }

  // ── Tag / Brand multi-select ──────────────────────────────────────────────

  function toggleTag(name: string) {
    setProduct(prev => {
      if (!prev) return null;
      const tags = prev.tags || [];
      return {
        ...prev,
        tags: tags.includes(name) ? tags.filter(t => t !== name) : [...tags, name],
      };
    });
  }

  // ── Inline Create Handlers ────────────────────────────────────────────────

  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast('Category already exists', true);
      return;
    }
    try {
      const updated = [...categories, trimmed].sort();
      await saveCategories(updated);
      setCategories(updated);
      setField('category', trimmed);
      setNewCategoryName('');
      setShowNewCategory(false);
      showToast(`Category "${trimmed}" created!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create category', true);
    }
  }

  async function handleCreateBrand() {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;
    if (allBrands.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Brand already exists', true);
      return;
    }
    try {
      await addBrand(trimmed);
      const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
      setAllBrands(prev => [...prev, { id, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
      setField('brand', trimmed);
      setNewBrandName('');
      setShowNewBrand(false);
      showToast(`Brand "${trimmed}" created!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create brand', true);
    }
  }

  async function handleCreateTag() {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    if (allTags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Tag already exists', true);
      return;
    }
    try {
      await addTag(trimmed);
      const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
      setAllTags(prev => [...prev, { id, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
      toggleTag(trimmed);
      setNewTagName('');
      setShowNewTag(false);
      showToast(`Tag "${trimmed}" created & added!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create tag', true);
    }
  }

  // ── Attributes & Variations ───────────────────────────────────────────────

  function addAttribute() {
    setProduct(prev => {
      if (!prev) return null;
      return { ...prev, attributes: { ...prev.attributes, '': [] } };
    });
  }

  function updateAttributeKey(oldKey: string, newKey: string) {
    setProduct(prev => {
      if (!prev) return null;
      const newAttrs = { ...prev.attributes };
      const values = newAttrs[oldKey] || [];
      delete newAttrs[oldKey];
      if (newKey) newAttrs[newKey] = values;
      return { ...prev, attributes: newAttrs };
    });
  }

  function updateAttributeValues(key: string, commaString: string) {
    setProduct(prev => {
      if (!prev) return null;
      const vals = commaString.split(',').map(s => s.trim()).filter(Boolean);
      return { ...prev, attributes: { ...prev.attributes, [key]: vals } };
    });
  }

  function removeAttribute(key: string) {
    setProduct(prev => {
      if (!prev) return null;
      const newAttrs = { ...prev.attributes };
      delete newAttrs[key];
      return { ...prev, attributes: newAttrs };
    });
  }

  function generateVariations() {
    if (!product) return;
    const keys = Object.keys(product.attributes).filter(k => k.trim() !== '' && product.attributes[k].length > 0);
    if (keys.length === 0) {
        showToast('Add at least one attribute with values first', true);
        return;
    }
    
    if (product.variations.length > 0) {
        if (!window.confirm("Generating a new matrix will overwrite your existing variations, SKUs, and custom prices. Are you sure you want to rebuild?")) {
            return;
        }
    }
    
    const valuesArrays = keys.map(k => product.attributes[k]);
    const cartesian = (...a: any[][]) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    
    let combos: string[][] = [];
    if (keys.length === 1) {
        combos = valuesArrays[0].map(v => [v]);
    } else {
        combos = cartesian(...valuesArrays) as string[][] ;
    }
    
    const newVariations: Variation[] = combos.map(combo => {
       const attrObj: Record<string, string> = {};
       combo.forEach((val, i) => attrObj[keys[i]] = val);
       const uniqueId = Math.random().toString(36).substring(2, 9);
       return {
         id: `var_${Date.now()}_${uniqueId}`,
         sku: product.sku ? `${product.sku}-${combo.join('-').toLowerCase()}` : '',
         price: product.price !== 'N/A' ? product.price : '',
         inStock: true,
         attributes: attrObj
       };
    });

    setProduct(prev => prev ? { ...prev, variations: newVariations } : null);
    showToast(`Matrix rebuilt with ${newVariations.length} variations!`);
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(statusText?: 'published' | 'draft') {
    if (!product) return;
    setSaving(true);
    try {
      const payload = { ...product };
      if (statusText) payload.status = statusText;
      
      await updateProduct(product.id, payload);
      setProduct(payload);
      showToast(statusText === 'draft' ? 'Saved as Draft!' : 'Saved successfully!');
    } catch (e) {
      showToast('Save failed — check console', true);
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap} style={{ height: '100vh' }}>
        <div className={styles.spinner} />
        Loading product…
      </div>
    );
  }

  if (!product) {
    return <div style={{ padding: '2rem' }}>Product not found.</div>;
  }

  // Strip HTML for clean display in markdown editor
  const plainDescription = product.description
    ? product.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    : '';

  const plainLongDescription = product.longDescription
    ? product.longDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    : '';

  const shortWordCount = plainDescription ? plainDescription.split(/\s+/).filter(Boolean).length : 0;

  // AI context for generating descriptions
  const aiContext = {
    name: product.name || '',
    category: product.category || '',
    brand: product.brand || '',
    price: product.price || '',
    variations: product.variations?.map(v => Object.values(v.attributes).join(' ')).slice(0, 20).join(', ') || '',
  };

  const calcData = (() => {
    const baseRaw = parseFloat((product.price || '').replace(/[£,]/g, ''));
    const saleRaw = parseFloat((product.salePrice || '').replace(/[£,]/g, ''));
    const costRaw = parseFloat((product.costPrice || '').replace(/[£,]/g, ''));
    
    const activePriceIncVat = (!isNaN(saleRaw) && saleRaw > 0) ? saleRaw : (!isNaN(baseRaw) ? baseRaw : 0);
    const cost = !isNaN(costRaw) ? costRaw : 0;
    
    if (activePriceIncVat > 0 && cost > 0) {
        const activePriceExVat = activePriceIncVat / 1.2;
        const profit = activePriceExVat - cost;
        const margin = (profit / activePriceExVat) * 100;
        
        return {
            activePriceIncVat: activePriceIncVat.toFixed(2),
            priceExVat: activePriceExVat.toFixed(2),
            profit: profit.toFixed(2),
            margin: margin.toFixed(1),
            isLoss: profit < 0
        };
    }
    return null;
  })();

  return (
    <>
      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin" className={styles.storeFrontLink}>← Products</Link>
          </div>
          <h1 className={styles.pageTitle} style={{ marginTop: '0.35rem' }}>{product.name}</h1>
          <p className={styles.pageSubtitle}>ID: {product.id}</p>
        </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={`/product/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            👁 Preview
          </a>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            📋 Save Draft
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            {saving ? 'Saving…' : '🚀 Publish / Update'}
          </button>
      </div>
      </div>

      {/* ── Sections ── */}
      <div className={styles.sections}>

        {/* ── Basic Info ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>Basic Info</div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Product Name</label>
                <input
                  className={styles.input}
                  value={product.name}
                  onChange={e => setField('name', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>SKU</label>
                <input
                  className={styles.input}
                  value={product.sku || ''}
                  onChange={e => setField('sku', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Supplier ID</label>
                <input
                  className={styles.input}
                  placeholder="e.g. EQP01670"
                  value={product.supplierId || ''}
                  onChange={e => setField('supplierId', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Brand</label>
                <select
                  className={styles.select}
                  value={product.brand || ''}
                  onChange={e => setField('brand', e.target.value)}
                >
                  <option value="">— None —</option>
                  {allBrands.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
                {showNewBrand ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      className={styles.input}
                      placeholder="New brand name…"
                      value={newBrandName}
                      onChange={e => setNewBrandName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateBrand()}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleCreateBrand}>Add</button>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setShowNewBrand(false); setNewBrandName(''); }}>✕</button>
                  </div>
                ) : (
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--deep-teal, #009688)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', marginTop: '0.4rem', padding: 0 }} onClick={() => setShowNewBrand(true)}>+ Create New Brand</button>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <select
                  className={styles.select}
                  value={product.category}
                  onChange={e => setField('category', e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {showNewCategory ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      className={styles.input}
                      placeholder="New category name…"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleCreateCategory}>Add</button>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>✕</button>
                  </div>
                ) : (
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--deep-teal, #009688)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', marginTop: '0.4rem', padding: 0 }} onClick={() => setShowNewCategory(true)}>+ Create New Category</button>
                )}
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Tags</label>
                <div className={styles.multiSelect}>
                  {(product.tags || []).map(t => (
                    <span key={t} className={styles.chip}>
                      {t}
                      <span className={styles.chipRemove} onClick={() => toggleTag(t)}>✕</span>
                    </span>
                  ))}
                  {allTags
                    .filter(t => !(product.tags || []).includes(t.name))
                    .map(t => (
                      <span key={t.id} className={styles.chipOption} onClick={() => toggleTag(t.name)}>
                        + {t.name}
                      </span>
                    ))}
                  {showNewTag ? (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        className={styles.input}
                        placeholder="New tag…"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                        autoFocus
                        style={{ width: 140, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      />
                      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={handleCreateTag}>Add</button>
                      <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => { setShowNewTag(false); setNewTagName(''); }}>✕</button>
                    </div>
                  ) : (
                    <span className={styles.chipOption} onClick={() => setShowNewTag(true)} style={{ borderStyle: 'solid', color: 'var(--deep-teal, #009688)' }}>
                      + New Tag
                    </span>
                  )}
                </div>
              </div>

              {/* Short Description — with word counter + AI */}
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <label className={styles.label} style={{ marginBottom: 0 }}>Short Description</label>
                  <AiGenerateButton
                    type="product_short"
                    context={{ ...aiContext, existingContent: plainDescription }}
                    onGenerated={(content) => setField('description', content)}
                    hasContent={!!plainDescription}
                  />
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: shortWordCount > 100 ? '#dc2626' : '#86868b',
                    marginLeft: 'auto',
                  }}>
                    {shortWordCount}/100 words
                    {shortWordCount > 100 && ' ⚠️'}
                  </span>
                </div>
                <div data-color-mode="light">
                  <MDEditor
                    value={plainDescription}
                    onChange={(val: string | undefined) => setField('description', val || '')}
                    height={160}
                    preview="edit"
                  />
                </div>
              </div>

              {/* Long Description — with AI */}
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <label className={styles.label} style={{ marginBottom: 0 }}>Long Description</label>
                  <AiGenerateButton
                    type="product_long"
                    context={{ ...aiContext, existingContent: plainLongDescription }}
                    onGenerated={(content) => setField('longDescription', content)}
                    hasContent={!!plainLongDescription}
                  />
                </div>
                <div data-color-mode="light">
                  <MDEditor
                    value={plainLongDescription}
                    onChange={(val: string | undefined) => setField('longDescription', val || '')}
                    height={280}
                    preview="edit"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pricing & Logistics ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>Pricing & Logistics</div>
          <div className={styles.cardBody} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
            <div className={styles.formGrid} style={{ margin: 0 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Base Price (£) <span style={{fontSize:'0.75rem', color:'#86868b'}}>(Inc VAT)</span></label>
                <input
                  className={styles.input}
                  value={product.price === 'N/A' ? '' : product.price.replace('£', '')}
                  placeholder="e.g. 3.99"
                  onChange={e => setField('price', e.target.value ? `£${e.target.value}` : 'N/A')}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sale Price (£) <span style={{fontSize:'0.75rem', color:'#86868b'}}>(Inc VAT)</span></label>
                <input
                  className={styles.input}
                  value={(product.salePrice || '').replace('£', '')}
                  placeholder="e.g. 2.99"
                  onChange={e => setField('salePrice', e.target.value ? `£${e.target.value}` : '')}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Cost of Goods (£) <span style={{fontSize:'0.75rem', color:'#86868b'}}>(Ex VAT)</span></label>
                <input
                  className={styles.input}
                  value={(product.costPrice || '').replace('£', '')}
                  placeholder="e.g. 1.50"
                  onChange={e => setField('costPrice', e.target.value ? `£${e.target.value}` : '')}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Weight (grams)</label>
                <input
                  className={styles.input}
                  type="number"
                  value={product.weight || ''}
                  onChange={e => setField('weight', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Shipping Class</label>
                <select
                  className={styles.select}
                  value={product.shippingClass || ''}
                  onChange={e => setField('shippingClass', e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="Large Letter">Large Letter</option>
                  <option value="Small Parcel">Small Parcel</option>
                  <option value="Medium Parcel">Medium Parcel</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Track Stock</label>
                <div className={styles.toggleRow} style={{ marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className={`${styles.toggle} ${product.trackStock ? styles.toggleOn : ''}`}
                    onClick={() => setField('trackStock', !product.trackStock)}
                  />
                  <span className={styles.toggleLabel}>
                    {product.trackStock ? 'Yes — stock is tracked' : 'No — always available'}
                  </span>
                </div>
                {/* Stock qty — only for simple products with no variations */}
                {product.trackStock && product.variations.length === 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label className={styles.label} style={{ fontSize: '0.8rem', color: '#666' }}>Stock Quantity</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={product.stockQty ?? ''}
                      onChange={e => setField('stockQty', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                      style={{ maxWidth: '120px' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Profit Calculator Widget */}
            <div style={{ background: '#f5f5f7', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <h3 style={{ margin: 0, fontSize: '1rem', color: '#1d1d1f' }}>Profit Calculator</h3>
               {calcData ? (
                   <>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#555' }}>
                         <span>Retail (Inc VAT):</span>
                         <strong>£{calcData.activePriceIncVat}</strong>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#555' }}>
                         <span>Retail (Ex VAT):</span>
                         <strong>£{calcData.priceExVat}</strong>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#555', paddingBottom: '0.8rem', borderBottom: '1px solid #e5e5e5' }}>
                         <span>Cost (Ex VAT):</span>
                         <strong>£{(parseFloat((product.costPrice || '').replace(/[£,]/g, '')) || 0).toFixed(2)}</strong>
                     </div>
                     
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: calcData.isLoss ? '#ff3b30' : '#34c759', fontWeight: 600, marginTop: '0.2rem' }}>
                         <span>Profit:</span>
                         <span>£{calcData.profit}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: calcData.isLoss ? '#ff3b30' : '#34c759', fontWeight: 500 }}>
                         <span>Margin:</span>
                         <span>{calcData.margin}%</span>
                     </div>
                   </>
               ) : (
                   <p style={{ fontSize: '0.85rem', color: '#86868b', margin: 0, lineHeight: 1.5 }}>
                     Enter a Base Price and Cost Price to automatically calculate your exact profit margins and VAT deductions.
                   </p>
               )}
            </div>
          </div>
        </div>

        {/* ── Media ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>Media</div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Main Image</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {product.image ? (
                    <div style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image}
                        alt="Preview"
                        style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 10, border: '1px solid #e5e5e5', background: '#f5f5f7' }}
                      />
                      <button 
                         type="button"
                         style={{ position: 'absolute', top: -8, right: -8, background: '#fff', border: '1px solid #e5e5e5', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#86868b', fontSize: '0.8rem' }}
                         onClick={() => setField('image', '')}
                         title="Remove Image"
                      >✕</button>
                    </div>
                  ) : (
                    <div style={{ width: 120, height: 120, borderRadius: 10, border: '2px dashed #d2d2d7', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.85rem' }}>
                      No Image
                    </div>
                  )}
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button 
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary}`} 
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => setMediaModalOpen({ isOpen: true, target: 'main' })}
                    >
                      🖼️ Select from Media Library
                    </button>
                    <input
                      className={styles.input}
                      value={product.image}
                      onChange={e => setField('image', e.target.value)}
                      placeholder="Or paste an image URL here…"
                      style={{ maxWidth: 400 }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <label className={styles.label}>Gallery Images</label>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                  {(product.gallery || []).map((url, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Gallery ${index}`}
                        style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e5e5', background: '#f5f5f7' }}
                      />
                      <button 
                         type="button"
                         style={{ position: 'absolute', top: -6, right: -6, background: '#fff', border: '1px solid #e5e5e5', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: 'pointer', color: '#86868b' }}
                         onClick={() => setField('gallery', (product.gallery || []).filter((_, i) => i !== index))}
                         title="Remove from Gallery"
                      >✕</button>
                    </div>
                  ))}
                  
                  <button 
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`} 
                    style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: 0, borderRadius: 8 }}
                    onClick={() => setMediaModalOpen({ isOpen: true, target: 'gallery' })}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🖼️</span>
                    Add
                  </button>
                </div>

                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={(product.gallery || []).join('\n')}
                  placeholder="Or paste URLs here (one per line)…"
                  style={{ maxWidth: 600 }}
                  onChange={e =>
                    setField(
                      'gallery',
                      e.target.value.split('\n').map(u => u.trim()).filter(Boolean)
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Attributes & Variations ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>Attributes & Variations</div>
          <div className={styles.cardBody}>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              Add attributes like <b>Strength</b> (10mg, 20mg) or <b>Flavour</b> (Apple, Mint), then click <b>Generate Variations</b> to automatically build your e-commerce matrix.
            </p>
            
            {/* Attributes Builder */}
            <div style={{ background: '#fafafa', padding: '1rem', borderRadius: 8, border: '1px solid #eaeaea', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1rem' }}>
                {Object.entries(product.attributes || {}).map(([attrName, values], idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      className={styles.input} 
                      style={{ width: '30%' }}
                      placeholder="e.g. Strength" 
                      value={attrName}
                      onChange={e => updateAttributeKey(attrName, e.target.value)}
                    />
                    <input 
                      className={styles.input} 
                      style={{ flex: 1 }}
                      placeholder="e.g. 10mg, 20mg (comma separated)" 
                      value={rawAttributes[attrName] !== undefined ? rawAttributes[attrName] : values.join(', ')}
                      onChange={e => {
                         setRawAttributes(prev => ({ ...prev, [attrName]: e.target.value }));
                         updateAttributeValues(attrName, e.target.value);
                      }}
                    />
                    <button 
                      type="button"
                      className={styles.btnSecondary} 
                      style={{ padding: '0.4rem 0.6rem', border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontSize: '1.2rem' }}
                      onClick={() => removeAttribute(attrName)}
                    >✕</button>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addAttribute}>
                  + Add Attribute
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={generateVariations}>
                  ⚡ Generate Variations
                </button>
              </div>
            </div>

            {/* Generated Variations List */}
            {product.variations.length > 0 && (
              <div style={{ borderTop: '1px solid #eaeaea', paddingTop: '1.5rem' }}>
                 <div className={styles.bulkBar} style={{ marginBottom: '1rem' }}>
                    <span className={styles.bulkLabel}>Bulk Apply:</span>
              <input
                className={styles.bulkInput}
                placeholder="Price e.g. 3.99"
                value={bulkPrice}
                onChange={e => setBulkPrice(e.target.value)}
              />
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                onClick={applyPriceToAll}
              >
                Apply Price to All
              </button>

              <select
                className={styles.bulkInput}
                value={bulkStock}
                onChange={e => setBulkStock(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="">Stock Status</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                onClick={applyStockToAll}
              >
                Apply Stock to All
              </button>
              {product.trackStock && (
                <>
                  <input
                    className={styles.bulkInput}
                    type="number"
                    min="0"
                    placeholder="Set Qty e.g. 10"
                    value={bulkQty}
                    onChange={e => setBulkQty(e.target.value)}
                    style={{ width: '130px' }}
                  />
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                    onClick={applyQtyToAll}
                  >
                    Apply Qty to All
                  </button>
                </>
              )}
            </div>

            {/* Variation Rows */}
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.variationTable}>
                <thead>
                  <tr>
                    <th>Attributes</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>In Stock</th>
                    {product.trackStock && <th>Qty</th>}
                  </tr>
                </thead>
                <tbody>
                      {product.variations.map((v, i) => (
                        <tr key={v.id}>
                          <td style={{ color: '#555', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {Object.entries(v.attributes).map(([k, val]) => (
                              <span key={k} style={{ marginRight: '0.5rem' }}>
                                <b style={{ color: '#86868b' }}>{k}:</b> {val}
                              </span>
                            ))}
                          </td>
                          <td>
                            <input className={styles.varInput} value={v.sku || ''} onChange={e => setVariationField(i, 'sku', e.target.value)} />
                          </td>
                          <td>
                            <input className={styles.varInput} value={(v.price || '').replace('£', '')} placeholder="0.00" onChange={e => setVariationField(i, 'price', e.target.value ? `£${e.target.value}` : '')} />
                          </td>
                          <td>
                            <button type="button" className={`${styles.toggle} ${v.inStock ? styles.toggleOn : ''}`} onClick={() => setVariationField(i, 'inStock', !v.inStock)} />
                          </td>
                          {product.trackStock && (
                            <td>
                              <input
                                className={styles.varInput}
                                type="number"
                                min="0"
                                placeholder="—"
                                value={v.stockQty ?? ''}
                                onChange={e => setVariationField(i, 'stockQty', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                style={{ width: '70px' }}
                              />
                            </td>
                          )}
                          <td>
                             <button type="button" onClick={() => setProduct(prev => { if(!prev) return null; return {...prev, variations: prev.variations.filter((_, idx) => idx !== i)}})} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEO Editor injected here */}
        <SeoEditorCard 
           seo={product.seo} 
           onChange={(seo) => setField('seo', seo)}
           titlePlaceholder={product.name ? `${product.name} | Jacks` : undefined}
           descPlaceholder={plainDescription ? plainDescription.slice(0, 150) + '...' : undefined}
           aiContext={{
             name: product.name || '',
             category: product.category || '',
             brand: product.brand || '',
             price: product.price || '',
             description: plainDescription || '',
           }}
        />

        {/* Bottom Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '2rem', gap: '0.75rem' }}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            📋 Save Draft
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            {saving ? 'Saving…' : '🚀 Publish / Update'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.toastError : ''}`}>
          {toast.msg}
        </div>
      )}

      {/* Media Modal */}
      {mediaModalOpen.isOpen && (
        <MediaModal
          title={mediaModalOpen.target === 'gallery' ? "Select Image for Gallery" : "Select Main Image"}
          onClose={() => setMediaModalOpen({ isOpen: false, target: null })}
          onSelect={(url) => {
            if (mediaModalOpen.target === 'main') {
              setField('image', url);
            } else if (mediaModalOpen.target === 'gallery') {
              const currentGallery = product.gallery || [];
              if (!currentGallery.includes(url)) {
                setField('gallery', [...currentGallery, url]);
              }
            }
            setMediaModalOpen({ isOpen: false, target: null });
          }}
        />
      )}
    </>
  );
}
