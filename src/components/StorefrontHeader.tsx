'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import SearchOverlay from './SearchOverlay';
import MobileMenu from './MobileMenu';
import { createClient } from '@/utils/supabase/client';
import { getMenuBySlug, MenuItem } from '@/lib/menus';
import styles from '../app/home.module.css';
import megaStyles from './MegaMenu.module.css';

export default function StorefrontHeader() {
  const pathname = usePathname();
  const { cartCount, openCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isKitchenStaff, setIsKitchenStaff] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Delayed close — gives user time to move mouse from trigger to panel
  const startClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setMegaOpen(null), 250);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openMega = useCallback((id: string) => {
    cancelClose();
    setMegaOpen(id);
  }, [cancelClose]);

  // Load menu + check role
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('customers').select('role').eq('id', user.id).single();
        if (data?.role === 'head_chef' || data?.role === 'sous_chef') setIsKitchenStaff(true);
      }
      const items = await getMenuBySlug('main');
      setMenuItems(items);
    }
    init();
  }, []);

  // Close mobile/mega on route change
  useEffect(() => { setMobileOpen(false); setMegaOpen(null); }, [pathname]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  if (pathname.startsWith('/admin')) return null;

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
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className={styles.logo}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Image src="/logo.png" alt="Jack's E-Liquid" width={160} height={60} style={{ objectFit: 'contain' }} priority />
          </Link>
        </div>

        {/* ── Desktop Nav ───────────────────────────────────────── */}
        <nav className={styles.nav}>
          {menuItems.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isMega = item.type === 'mega' && hasChildren;

            if (isMega) {
              return (
                <div
                  key={item.id}
                  className={megaStyles.triggerWrap}
                  onMouseEnter={() => openMega(item.id)}
                  onMouseLeave={startClose}
                >
                  <Link
                    href={item.url || '/'}
                    className={`${styles.navLink} ${megaOpen === item.id ? megaStyles.navLinkActive : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {item.label}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, marginTop: 1, transition: 'transform 0.2s', transform: megaOpen === item.id ? 'rotate(180deg)' : 'none' }}>
                      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>

                  {/* Mega panel — inside trigger for contained positioning */}
                  {megaOpen === item.id && (
                    <>
                      <div className={megaStyles.backdrop} onClick={() => setMegaOpen(null)} />
                      <div
                        className={megaStyles.panel}
                        onMouseEnter={cancelClose}
                        onMouseLeave={startClose}
                      >
                        <div className={megaStyles.inner}>
                          <div className={megaStyles.columns}>
                            {item.children!.map(child => (
                              <Link
                                key={child.id}
                                href={child.url || '/'}
                                className={megaStyles.columnLink}
                                onClick={() => setMegaOpen(null)}
                              >
                                <div className={megaStyles.linkIcon}>
                                  {child.label.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className={megaStyles.linkLabel}>{child.label}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link key={item.id} href={item.url || '/'} className={styles.navLink} target={item.open_in_new_tab ? '_blank' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className={styles.headerActions}>
          <button className={styles.headerIconBtn} onClick={openSearch} aria-label="Search products">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link href="/account" className={styles.headerIconBtn} aria-label="Customer Account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <button className={styles.cartBtn} onClick={openCart} aria-label="Open cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cartCount > 0 && <span className={styles.cartBadge} suppressHydrationWarning>{cartCount}</span>}
          </button>
          <button className={`${styles.headerIconBtn} ${styles.hamburger}`} onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
      <MobileMenu items={menuItems} isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
