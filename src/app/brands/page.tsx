'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getBrands, TaxonomyItem } from '@/lib/data';
import styles from './brands.module.css';

export default function BrandsPage() {
  const [brands, setBrands] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrands().then(b => {
      setBrands(b);
      setLoading(false);
    });
  }, []);

  // Group brands by first letter for visual sectioning
  const grouped = useMemo(() => {
    const map = new Map<string, TaxonomyItem[]>();
    for (const b of brands) {
      const letter = b.name.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(b);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [brands]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#9ca3af' }}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.spinner} />
          <p>Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Hero */}
        <div className={styles.hero}>
          <h1 className={styles.title}>Our Brands</h1>
          <p className={styles.subtitle}>
            Explore our curated collection of {brands.length} premium brands. Click any brand to browse their full range.
          </p>
        </div>

        {/* Brand Grid */}
        <div className={styles.grid}>
          {brands.map(brand => (
            <Link
              key={brand.id}
              href={`/?brand=${encodeURIComponent(brand.name)}`}
              className={styles.card}
            >
              <div className={styles.cardInner}>
                {brand.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className={styles.logo}
                  />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <span className={styles.logoLetter}>
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className={styles.brandName}>{brand.name}</h2>
              </div>
            </Link>
          ))}
        </div>

        {/* Alphabetical Index */}
        {grouped.length > 3 && (
          <div className={styles.alphaIndex}>
            <h3 className={styles.alphaTitle}>Browse by Letter</h3>
            <div className={styles.letterGrid}>
              {grouped.map(([letter, items]) => (
                <div key={letter} className={styles.letterGroup}>
                  <span className={styles.letter}>{letter}</span>
                  <div className={styles.letterBrands}>
                    {items.map(b => (
                      <Link
                        key={b.id}
                        href={`/?brand=${encodeURIComponent(b.name)}`}
                        className={styles.letterLink}
                      >
                        {b.name}
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
