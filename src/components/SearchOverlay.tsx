'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getAllProducts, Product } from '@/lib/data';
import styles from './SearchOverlay.module.css';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all products once when overlay opens for the first time
  useEffect(() => {
    if (isOpen && !loaded) {
      getAllProducts().then(p => {
        setProducts(p);
        setLoaded(true);
      });
    }
  }, [isOpen, loaded]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const low = value.toLowerCase();
    const matched = products.filter(p =>
      p.name.toLowerCase().includes(low) ||
      p.category?.toLowerCase().includes(low) ||
      p.brand?.toLowerCase().includes(low) ||
      p.sku?.toLowerCase().includes(low) ||
      p.tags?.some(t => t.toLowerCase().includes(low))
    ).slice(0, 8);
    setResults(matched);
  }, [products]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Search products, categories, brands..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            autoComplete="off"
          />
          <kbd className={styles.escBadge} onClick={onClose}>ESC</kbd>
        </div>

        {/* Results */}
        <div className={styles.results}>
          {query.length < 2 && (
            <div className={styles.hint}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>Start typing to search across all products</p>
            </div>
          )}

          {query.length >= 2 && results.length === 0 && (
            <div className={styles.noResults}>
              <p>No products found for &ldquo;<strong>{query}</strong>&rdquo;</p>
              <span>Try adjusting your search terms</span>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className={styles.resultsMeta}>
                <span>{results.length} result{results.length !== 1 ? 's' : ''} found</span>
              </div>
              <ul className={styles.resultsList}>
                {results.map((product, idx) => (
                  <li key={`${product.id}-${idx}`}>
                    <Link
                      href={`/product/${product.slug}`}
                      className={styles.resultItem}
                      onClick={onClose}
                    >
                      <div className={styles.resultImage}>
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <div className={styles.resultPlaceholder}>📦</div>
                        )}
                      </div>
                      <div className={styles.resultInfo}>
                        <span className={styles.resultName}>{product.name}</span>
                        <span className={styles.resultMeta}>
                          {product.category && <span className={styles.resultCategory}>{product.category}</span>}
                          {product.brand && <span className={styles.resultBrand}>{product.brand}</span>}
                        </span>
                      </div>
                      <div className={styles.resultPrice}>
                        {product.salePrice ? (
                          <>
                            <span className={styles.resultSalePrice}>{product.salePrice}</span>
                            <span className={styles.resultOrigPrice}>{product.price}</span>
                          </>
                        ) : (
                          <span>{product.price}</span>
                        )}
                      </div>
                      <svg className={styles.resultArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
