'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getMenuBySlug, MenuItem } from '@/lib/menus';
import styles from './StorefrontFooter.module.css';

export default function StorefrontFooter() {
  const pathname = usePathname();
  const [shopLinks, setShopLinks] = useState<MenuItem[]>([]);
  const [discoverLinks, setDiscoverLinks] = useState<MenuItem[]>([]);

  useEffect(() => {
    async function loadMenus() {
      const [shop, discover] = await Promise.all([
        getMenuBySlug('footer-shop'),
        getMenuBySlug('footer-discover'),
      ]);
      setShopLinks(shop);
      setDiscoverLinks(discover);
    }
    loadMenus();
  }, []);

  // We do not want the universal storefront footer showing up inside the kitchen admin dashboard
  if (pathname.startsWith('/admin')) {
      return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.brandSection}>
          <div className={styles.logoWrapper}>
            <Image src="/logo.png" alt="Jack's E-Liquid" width={160} height={60} style={{ objectFit: 'contain' }} />
          </div>
          <p className={styles.tagline}>Premium e-liquids and vape juices crafted for perfect flavour profiles. Satisfaction in every draw.</p>
        </div>
        
        <div className={styles.linkGroup}>
          <h3 className={styles.groupTitle}>Shop</h3>
          {shopLinks.length > 0 ? (
            shopLinks.map(item => (
              <Link key={item.id} href={item.url || '/'} className={styles.link}>{item.label}</Link>
            ))
          ) : (
            <>
              <Link href="/" className={styles.link}>All Products</Link>
              <Link href="/" className={styles.link}>Nic Salts</Link>
              <Link href="/" className={styles.link}>Shortfills</Link>
              <Link href="/" className={styles.link}>Hardware</Link>
            </>
          )}
        </div>

        <div className={styles.linkGroup}>
          <h3 className={styles.groupTitle}>Discover</h3>
          {discoverLinks.length > 0 ? (
            discoverLinks.map(item => (
              <Link key={item.id} href={item.url || '/'} className={styles.link}>{item.label}</Link>
            ))
          ) : (
            <>
              <Link href="/blog" className={styles.link}>Vape Base</Link>
              <Link href="/contact" className={styles.link}>Contact</Link>
            </>
          )}
        </div>

        <div className={styles.linkGroup}>
          <h3 className={styles.groupTitle}>Legal</h3>
          <Link href="/p/terms-and-conditions" className={styles.link}>Terms &amp; Conditions</Link>
          <Link href="/p/privacy-policy" className={styles.link}>Privacy Policy</Link>
          <Link href="/p/returns-policy" className={styles.link}>Returns &amp; Refunds</Link>
          <Link href="/p/cookie-policy" className={styles.link}>Cookie Policy</Link>
          <Link href="/p/delivery-postage" className={styles.link}>Delivery &amp; Postage</Link>
          <button
            className={styles.link}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', font: 'inherit' }}
            onClick={() => (window as any).__openCookiePreferences?.()}
          >
            🍪 Cookie Settings
          </button>
          <Link href="/sitemap.xml" className={styles.link}>Site Map</Link>
        </div>

      </div>
      
      <div className={styles.bottomBar}>
        <div className="container">
          <p className={styles.copyright}>&copy; {new Date().getFullYear()} Jacks E-Liquid. All rights reserved. <br/> <span style={{fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px', display: 'block'}}>WARNING: This product contains nicotine. Nicotine is an addictive chemical.</span></p>
        </div>
      </div>
    </footer>
  );
}
