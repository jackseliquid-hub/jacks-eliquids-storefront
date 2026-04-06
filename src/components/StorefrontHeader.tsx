'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import styles from '../app/home.module.css';

export default function StorefrontHeader() {
  const pathname = usePathname();
  const { cartCount, openCart } = useCart();
  
  // Hide global storefront header if we are inside the admin dashboard
  if (pathname.startsWith('/admin')) {
      return null;
  }

  return (
      <header className={`${styles.header} container`}>
        <div className={styles.logo}>
           <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
             <Image 
               src="/logo.png" 
               alt="Jack's E-Liquid" 
               width={160} 
               height={60} 
               style={{ objectFit: 'contain' }} 
               priority 
             />
           </Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Shop All</Link>
          <Link href="/blog" className={styles.navLink}>Blog</Link>
          <Link href="/" className={styles.navLink}>Categories</Link>
          <Link href="/" className={styles.navLink}>About Us</Link>
        </nav>
        
        <button className={styles.cartBtn} onClick={openCart} aria-label="Open cart">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          {cartCount > 0 && <span className={styles.cartBadge} suppressHydrationWarning>{cartCount}</span>}
        </button>
      </header>
  );
}
