'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updateProduct } from '@/lib/data';
import styles from '../admin.module.css';

// ── Column definitions ──────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'id',          label: 'ID' },
  { key: 'name',        label: 'Name' },
  { key: 'sku',         label: 'SKU' },
  { key: 'brand',       label: 'Brand' },
  { key: 'category',    label: 'Category' },
  { key: 'tags',        label: 'Tags' },
  { key: 'price',       label: 'Price' },
  { key: 'price_from',  label: 'Price From' },
  { key: 'sale_price',  label: 'Sale Price' },
  { key: 'cost_price',  label: 'Cost Price' },
  { key: 'stock_qty',   label: 'Stock Qty' },
  { key: 'track_stock', label: 'Track Stock' },
  { key: 'status',      label: 'Status' },
  { key: 'slug',        label: 'Slug' },
  { key: 'description', label: 'Description' },
  { key: 'image',       label: 'Image URL' },
  { key: 'weight',      label: 'Weight' },
];

const DEFAULT_COLS = ['id','name','sku','brand','category','price','price_from','sale_price','cost_price','stock_qty','status'];

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = Array.isArray(val) ? val.join(', ') : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function ExportPage() {
  // Filter state
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [includeVariations, setIncludeVariations] = useState(false);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(DEFAULT_COLS));

  // UI state
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  }

  // Load filter options
  useEffect(() => {
    Promise.all([
      supabase.from('products').select('brand').neq('brand', null),
      supabase.from('products').select('category').neq('category', null),
      supabase.from('products').select('tags'),
    ]).then(([b, c, t]) => {
      const uniqueBrands = [...new Set((b.data || []).map((r: any) => r.brand).filter(Boolean))].sort() as string[];
      const uniqueCats   = [...new Set((c.data || []).map((r: any) => r.category).filter(Boolean))].sort() as string[];
      const allTags: string[] = [];
      (t.data || []).forEach((r: any) => { if (Array.isArray(r.tags)) allTags.push(...r.tags.filter(Boolean)); });
      const uniqueTags = [...new Set(allTags)].sort() as string[];
      setBrands(uniqueBrands);
      setCategories(uniqueCats);
      setTags(uniqueTags);
    });
  }, []);

  // Build query
  async function fetchProducts() {
    let q = supabase.from('products').select('*, product_variations(*)');
    if (filterBrand)    q = q.eq('brand', filterBrand);
    if (filterCategory) q = q.eq('category', filterCategory);
    if (filterTag)      q = q.contains('tags', [filterTag]);
    if (filterStatus)   q = q.eq('status', filterStatus);
    const { data, error } = await q.order('name');
    if (error) throw error;
    return data || [];
  }

  async function handlePreview() {
    setLoading(true);
    try {
      const rows = await fetchProducts();
      setPreviewCount(rows.length);
      setPreview(rows.slice(0, 5)); // just show first 5
    } catch (e: any) {
      showToast('Failed to fetch: ' + e.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const rows = await fetchProducts();
      if (rows.length === 0) { showToast('No products match your filters', true); return; }

      const cols = ALL_COLUMNS.filter(c => selectedCols.has(c.key));
      const lines: string[] = [];

      if (includeVariations) {
        // Headers: product cols + variation cols
        lines.push([...cols.map(c => c.label), 'Var SKU', 'Var Price', 'Var Attributes', 'Var Stock Qty', 'Var In Stock'].join(','));
        for (const product of rows) {
          const vars = (product.product_variations as any[]) || [];
          if (vars.length > 0) {
            for (const v of vars) {
              lines.push([
                ...cols.map(c => escapeCSV((product as any)[c.key])),
                escapeCSV(v.sku),
                escapeCSV(v.price),
                escapeCSV(JSON.stringify(v.attributes || {})),
                escapeCSV(v.stock_qty),
                escapeCSV(v.in_stock),
              ].join(','));
            }
          } else {
            lines.push([...cols.map(c => escapeCSV((product as any)[c.key])), '', '', '', '', ''].join(','));
          }
        }
      } else {
        lines.push(cols.map(c => c.label).join(','));
        for (const product of rows) {
          lines.push(cols.map(c => escapeCSV((product as any)[c.key])).join(','));
        }
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      const parts = [filterBrand || filterCategory || filterTag || 'all', date].filter(Boolean);
      a.download = `products_${parts.join('_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${rows.length} product${rows.length !== 1 ? 's' : ''}`);
    } catch (e: any) {
      showToast('Download failed: ' + e.message, true);
    } finally {
      setLoading(false);
    }
  }

  // ── CSV Import ──────────────────────────────────────────────────────────────
  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let inQuote = false, current = '';
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { values.push(current.replace(/^"|"$/g, '').trim()); current = ''; }
        else { current += ch; }
      }
      values.push(current.replace(/^"|"$/g, '').trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });
  }

  // Map CSV header label -> DB field
  const LABEL_TO_KEY: Record<string, string> = {
    'Name':        'name',
    'SKU':         'sku',
    'Brand':       'brand',
    'Category':    'category',
    'Tags':        'tags',
    'Price':       'price',
    'Price From':  'priceFrom',
    'Sale Price':  'salePrice',
    'Cost Price':  'costPrice',
    'Stock Qty':   'stockQty',
    'Track Stock': 'trackStock',
    'Status':      'status',
    'Slug':        'slug',
    'Description': 'description',
    'Image URL':   'image',
    'Weight':      'weight',
  };

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { showToast('No data rows found in CSV', true); return; }
      if (!rows[0]['ID']) { showToast('CSV must contain an ID column to match products', true); return; }

      let updated = 0, failed = 0;
      for (const row of rows) {
        const id = row['ID']?.trim();
        if (!id) { failed++; continue; }
        const patch: Record<string, unknown> = {};
        for (const [label, fieldKey] of Object.entries(LABEL_TO_KEY)) {
          if (row[label] !== undefined && row[label] !== '') {
            if (fieldKey === 'tags') {
              patch[fieldKey] = row[label].split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (fieldKey === 'trackStock') {
              patch[fieldKey] = row[label].toLowerCase() === 'true';
            } else if (['stockQty', 'weight'].includes(fieldKey)) {
              const n = parseFloat(row[label]);
              if (!isNaN(n)) patch[fieldKey] = n;
            } else {
              patch[fieldKey] = row[label];
            }
          }
        }
        try {
          await updateProduct(id, patch as any);
          updated++;
        } catch {
          failed++;
        }
      }
      setImportResult(`✅ Updated ${updated} product${updated !== 1 ? 's' : ''}${failed > 0 ? ` · ⚠️ ${failed} failed (check IDs)` : ''}`);
    } catch (e: any) {
      showToast('Import failed: ' + e.message, true);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const toggleCol = (key: string) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filterActive = filterBrand || filterCategory || filterTag || filterStatus;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Downloads</h1>
          <p className={styles.pageSubtitle}>Export product data as CSV · Edit offline · Re-import changes</p>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── Step 1: Filters ── */}
        <div className={styles.card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>1 · Filter Products</h2>
            <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '0.25rem 0 0' }}>Leave blank to include all</p>
          </div>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Brand */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 160 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand</label>
              <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className={styles.select} style={{ minWidth: 160 }}>
                <option value="">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {/* Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 160 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={styles.select} style={{ minWidth: 160 }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Tag */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 160 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tag</label>
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={styles.select} style={{ minWidth: 160 }}>
                <option value="">All Tags</option>
                {tags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 140 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={styles.select} style={{ minWidth: 140 }}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            {/* Preview count */}
            <button
              onClick={handlePreview}
              disabled={loading}
              style={{ padding: '0.55rem 1.1rem', background: '#f5f5f7', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }}
            >
              {loading ? '…' : '🔍 Preview Count'}
            </button>
            {previewCount !== null && (
              <span style={{ alignSelf: 'flex-end', fontSize: '0.9rem', fontWeight: 700, color: '#0f766e', padding: '0.5rem 0' }}>
                {previewCount} product{previewCount !== 1 ? 's' : ''} match
              </span>
            )}
          </div>

          {/* Active filter chips */}
          {filterActive && (
            <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {filterBrand    && <span style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '2px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>Brand: {filterBrand}</span>}
              {filterCategory && <span style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '2px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>Category: {filterCategory}</span>}
              {filterTag      && <span style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '2px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>Tag: {filterTag}</span>}
              {filterStatus   && <span style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '2px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>Status: {filterStatus}</span>}
              <button onClick={() => { setFilterBrand(''); setFilterCategory(''); setFilterTag(''); setFilterStatus(''); setPreviewCount(null); }} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>✕ Clear</button>
            </div>
          )}
        </div>

        {/* ── Step 2: Columns ── */}
        <div className={styles.card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>2 · Choose Columns</h2>
              <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '0.25rem 0 0' }}>{selectedCols.size} of {ALL_COLUMNS.length} selected</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setSelectedCols(new Set(ALL_COLUMNS.map(c => c.key)))} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.25rem 0.7rem', fontSize: '0.78rem', cursor: 'pointer' }}>Select All</button>
              <button onClick={() => setSelectedCols(new Set())} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.25rem 0.7rem', fontSize: '0.78rem', cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem' }}>
            {ALL_COLUMNS.map(col => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.87rem', userSelect: 'none', padding: '0.25rem 0' }}>
                <input
                  type="checkbox"
                  checked={selectedCols.has(col.key)}
                  onChange={() => toggleCol(col.key)}
                  style={{ cursor: 'pointer', width: 14, height: 14 }}
                />
                {col.label}
              </label>
            ))}
          </div>
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.87rem' }}>
              <input
                type="checkbox"
                checked={includeVariations}
                onChange={e => setIncludeVariations(e.target.checked)}
                style={{ cursor: 'pointer', width: 14, height: 14 }}
              />
              Include product variations (adds extra rows per variant)
            </label>
          </div>
        </div>

        {/* ── Step 3: Download ── */}
        <div className={styles.card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>3 · Download CSV</h2>
          </div>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownload}
              disabled={loading || selectedCols.size === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: selectedCols.size === 0 ? '#f5f5f7' : 'var(--deep-teal)',
                color: selectedCols.size === 0 ? '#9ca3af' : '#fff',
                border: 'none', borderRadius: 10, padding: '0.7rem 1.5rem',
                fontSize: '0.95rem', fontWeight: 700, cursor: selectedCols.size === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? '⏳ Preparing…' : '⬇️ Download CSV'}
            </button>
            {selectedCols.size === 0 && <span style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 500 }}>Select at least one column</span>}
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#86868b' }}>
              File will be named <code style={{ background: '#f5f5f7', padding: '1px 5px', borderRadius: 4 }}>products_[filter]_[date].csv</code>
            </p>
          </div>
        </div>

        {/* ── Step 4: Import / Upload Back ── */}
        <div className={styles.card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>4 · Import Changes</h2>
            <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '0.25rem 0 0' }}>
              Edit the downloaded CSV, then upload it here — changes are applied by matching the <strong>ID</strong> column.
            </p>
          </div>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 520 }}>
              <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
                ⚠️ <strong>Important:</strong> Do not remove the <strong>ID</strong> column — it&apos;s used to match products. You can remove any other columns you don&apos;t want to update. Empty cells are ignored.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#f0fdfa', color: '#0f766e', border: '1.5px solid #99f6e4',
                  borderRadius: 10, padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  {importing ? '⏳ Importing…' : '📂 Choose CSV to Upload'}
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
                </label>
                {importResult && (
                  <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: '#15803d' }}>
                    {importResult}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#86868b', marginBottom: '0.5rem' }}>Preview of first {preview.length} results:</p>
              <div style={{ overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                      {ALL_COLUMNS.filter(c => selectedCols.has(c.key)).map(c => (
                        <th key={c.key} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#86868b', whiteSpace: 'nowrap' }}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f5f5f7' }}>
                        {ALL_COLUMNS.filter(c => selectedCols.has(c.key)).map(c => (
                          <td key={c.key} style={{ padding: '0.45rem 0.75rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {Array.isArray((row as any)[c.key]) ? ((row as any)[c.key] as string[]).join(', ') : String((row as any)[c.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999,
          background: toast.err ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.err ? '#fca5a5' : '#bbf7d0'}`,
          color: toast.err ? '#dc2626' : '#15803d',
          padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
