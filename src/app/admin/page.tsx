'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getAllProducts, Product } from '@/lib/data';
import styles from './admin.module.css';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Extract unique taxonomies for dropdowns
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(), [products]);

  useEffect(() => {
    getAllProducts().then(data => {
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProducts(sorted);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = products;

    if (categoryFilter) {
        result = result.filter(p => p.category === categoryFilter);
    }
    
    if (brandFilter) {
        result = result.filter(p => p.brand === brandFilter);
    }

    if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(p => {
            const n = p.name || '';
            const s = p.sku || '';
            const i = p.id || '';
            return n.toLowerCase().includes(q) || s.toLowerCase().includes(q) || i.toLowerCase().includes(q);
        });
    }

    return result;
  }, [search, categoryFilter, brandFilter, products]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Products</h1>
          <p className={styles.pageSubtitle}>{filtered.length} products showing</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
             className={styles.select} 
             style={{ minWidth: 160, padding: '0.45rem 1rem', borderRadius: 20 }} 
             value={categoryFilter} 
             onChange={e => setCategoryFilter(e.target.value)}
          >
             <option value="">All Categories</option>
             {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
             className={styles.select} 
             style={{ minWidth: 160, padding: '0.45rem 1rem', borderRadius: 20 }} 
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
              style={{ padding: '0.45rem', fontSize: '0.9rem', width: 200, background: 'transparent' }}
              type="text"
              placeholder="Search by name or SKU…"
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
                    <th>Price</th>
                    <th>Stock</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product, index) => (
                    <tr key={product.id || `prod-${index}`}>
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
                      <td style={{ color: '#555', fontSize: '0.85rem' }}>{product.category}</td>
                      <td style={{ fontWeight: 500 }}>
                        {product.price !== 'N/A' ? product.price : <span style={{ color: '#86868b' }}>See options</span>}
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#86868b' }}>
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
    </>
  );
}
