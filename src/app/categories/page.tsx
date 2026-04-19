'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getCategoriesWithTags, CategoryItem } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import styles from './categories.module.css';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [productCounts, setProductCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCategoriesWithTags(),
      supabase.from('products').select('category').eq('status', 'active').range(0, 9999),
    ]).then(([cats, { data: prods }]) => {
      setCategories(cats);
      const counts = new Map<string, number>();
      for (const p of prods || []) {
        const cat = p.category || '';
        if (cat) counts.set(cat, (counts.get(cat) || 0) + 1);
      }
      setProductCounts(counts);
      setLoading(false);
    });
  }, []);

  // Only show categories that have at least 1 active product
  const visibleCategories = useMemo(() => {
    return categories.filter(c => (productCounts.get(c.name) || 0) > 0);
  }, [categories, productCounts]);

  // Group by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    for (const c of visibleCategories) {
      const letter = c.name.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleCategories]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#9ca3af' }}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.spinner} />
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Hero */}
        <div className={styles.hero}>
          <h1 className={styles.title}>Shop by Category</h1>
          <p className={styles.subtitle}>
            Browse our {visibleCategories.length} product categories to find exactly what you&apos;re looking for.
          </p>
        </div>

        {/* Category Grid */}
        <div className={styles.grid}>
          {visibleCategories.map(cat => {
            const count = productCounts.get(cat.name) || 0;
            return (
              <Link
                key={cat.id}
                href={`/?cat=${encodeURIComponent(cat.name)}`}
                className={styles.card}
              >
                <div className={styles.cardInner}>
                  <div className={styles.iconPlaceholder}>
                    <span className={styles.iconLetter}>
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className={styles.catName}>{cat.name}</h2>
                  <span className={styles.catCount}>{count} product{count !== 1 ? 's' : ''}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Alphabetical Index */}
        {grouped.length > 3 && (
          <div className={styles.alphaIndex}>
            <h3 className={styles.alphaTitle}>Browse by Letter</h3>
            <div className={styles.letterGrid}>
              {grouped.map(([letter, items]) => (
                <div key={letter} className={styles.letterGroup}>
                  <span className={styles.letter}>{letter}</span>
                  <div className={styles.letterCats}>
                    {items.map(c => (
                      <Link
                        key={c.id}
                        href={`/?cat=${encodeURIComponent(c.name)}`}
                        className={styles.letterLink}
                      >
                        {c.name}
                        <span className={styles.letterCount}>({productCounts.get(c.name) || 0})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
