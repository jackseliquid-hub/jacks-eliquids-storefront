'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './StorefrontFooter.module.css';

export default function StorefrontFooter() {
  const pathname = usePathname();
  
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
          <Link href="/" className={styles.link}>All Products</Link>
          <Link href="/" className={styles.link}>Nic Salts</Link>
          <Link href="/" className={styles.link}>Shortfills</Link>
          <Link href="/" className={styles.link}>Hardware</Link>
        </div>

        <div className={styles.linkGroup}>
          <h3 className={styles.groupTitle}>Discover</h3>
          <Link href="/blog" className={styles.link}>The Base (Blog)</Link>
          <Link href="/" className={styles.link}>About Us</Link>
          <Link href="/" className={styles.link}>Contact</Link>
          <Link href="/" className={styles.link}>Wholesale</Link>
        </div>

        <div className={styles.linkGroup}>
          <h3 className={styles.groupTitle}>Legal</h3>
          <Link href="/p/terms-and-conditions" className={styles.link}>Terms and Conditions</Link>
          <Link href="/p/privacy-policy" className={styles.link}>Privacy Policy</Link>
          <Link href="/p/cookie-policy" className={styles.link}>Cookie Policy</Link>
          <Link href="/p/delivery-postage" className={styles.link}>Delivery / Postage</Link>
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
