'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import SearchOverlay from './SearchOverlay';
import { createClient } from '@/utils/supabase/client';
import styles from '../app/home.module.css';

export default function StorefrontHeader() {
  const pathname = usePathname();
  const { cartCount, openCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isKitchenStaff, setIsKitchenStaff] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Check role client-side to show/hide the Kitchen link
  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('customers')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data?.role === 'head_chef' || data?.role === 'sous_chef') {
        setIsKitchenStaff(true);
      }
    }
    checkRole();
  }, []);

  // Hide global storefront header if we are inside the admin dashboard
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Kitchen Staff Banner */}
      {isKitchenStaff && (
        <div style={{
          background: '#0f766e', color: '#fff', textAlign: 'center',
          padding: '6px 16px', fontSize: '0.82rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
        }}>
          <span>👨‍🍳 You&apos;re viewing the storefront as staff</span>
          <Link
            href="/admin"
            style={{
              color: '#fff', background: 'rgba(255,255,255,0.2)',
              padding: '3px 12px', borderRadius: '9999px',
              textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem',
              border: '1px solid rgba(255,255,255,0.4)'
            }}
          >
            → Back to Kitchen
          </Link>
        </div>
      )}

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

        <div className={styles.headerActions}>
          {/* Search Trigger */}
          <button className={styles.headerIconBtn} onClick={openSearch} aria-label="Search products">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Account */}
          <Link href="/account" className={styles.headerIconBtn} aria-label="Customer Account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>

          {/* Cart */}
          <button className={styles.cartBtn} onClick={openCart} aria-label="Open cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cartCount > 0 && <span className={styles.cartBadge} suppressHydrationWarning>{cartCount}</span>}
          </button>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
    </>
  );
}
