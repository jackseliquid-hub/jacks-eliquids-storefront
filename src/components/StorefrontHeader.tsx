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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePreview] = useState(false); // kept to avoid removing the import, but feature removed
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [panelTop, setPanelTop] = useState(62);
  const [panelLeft, setPanelLeft] = useState<number | null>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Delayed close
  const startClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setMegaOpen(null), 300);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const openMega = useCallback((id: string, triggerEl?: HTMLElement) => {
    cancelClose();
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      setPanelTop(rect.bottom + 5);
    }
    if (triggerEl) {
      const tRect = triggerEl.getBoundingClientRect();
      setPanelLeft(tRect.left);
    }
    setMegaOpen(id);
  }, [cancelClose]);

  // Load menu + check role
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data } = await supabase.from('customers').select('role').eq('id', user.id).single();
        if (data?.role === 'head_chef' || data?.role === 'sous_chef') setIsKitchenStaff(true);
      }
      const items = await getMenuBySlug('main');
      setMenuItems(items);
    }
    init();
  }, []);

  // Close on route change
  useEffect(() => { setMobileOpen(false); setMegaOpen(null); }, [pathname]);

  // Close on click outside
  useEffect(() => {
    if (!megaOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the panel or trigger
      if (target.closest(`.${megaStyles.panel}`) || target.closest(`.${megaStyles.triggerWrap}`)) return;
      setMegaOpen(null);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [megaOpen]);

  // Cleanup
  useEffect(() => { return () => { if (closeTimer.current) clearTimeout(closeTimer.current); }; }, []);



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
          <Link href="/admin" style={{
            color: '#fff', background: 'rgba(255,255,255,0.2)',
            padding: '3px 12px', borderRadius: '9999px',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem',
            border: '1px solid rgba(255,255,255,0.4)'
          }}>→ Back to Kitchen</Link>
        </div>
      )}

      <div ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid var(--border-color)' }}>
        {/* ═══ TOP BAR: Logo | Blog | Search | Any Questions? | Account + Cart ═══ */}
        <div className="container" style={{
          display: 'flex', alignItems: 'center',
          padding: '0.55rem 0', gap: '1rem',
        }}>
          {/* Logo — always links to homepage */}
          <div className={styles.logo} style={{ flexShrink: 0 }}>
            <Link href="/" onClick={() => { if (typeof window !== 'undefined') window.location.href = '/'; }} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <Image src="/logo.png" alt="Jack's E-Liquid" width={138} height={51} style={{ objectFit: 'contain' }} priority />
            </Link>
          </div>

          {/* Blog link — hidden on mobile */}
          <div className={styles.topBarLinks} style={{ display: 'flex', fontSize: '0.82rem', flexShrink: 0 }}>
            <Link href="/blog" style={{
              color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500,
              opacity: 0.75, transition: 'opacity 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Read Our Blog
            </Link>
          </div>

          {/* Search bar — grows to fill space */}
          <button
            onClick={openSearch}
            aria-label="Search products"
            className={styles.searchBar}
            style={{
              flex: '1 1 auto',
              maxWidth: '420px',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: '#f5f5f7', border: '1px solid #e5e5e5',
              borderRadius: '9999px', padding: '0.4rem 0.85rem',
              cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s',
              color: '#86868b', fontSize: '0.82rem',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f766e'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(15,118,110,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
          </button>

          {/* Right: Any Questions | Mobile search | Account | Cart | Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexShrink: 0 }}>
            {/* Any Questions — hidden on mobile */}
            <Link href="/contact" className={styles.topBarLinks} style={{
              color: 'var(--deep-teal)', textDecoration: 'none', fontWeight: 600,
              opacity: 0.9, transition: 'opacity 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', fontSize: '0.82rem',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Any Questions?
            </Link>

            {/* Mobile search icon — only visible on mobile */}
            <button
              onClick={openSearch}
              aria-label="Search"
              className={styles.mobileSearchBtn}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', display: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <Link href="/account" className={styles.topBarLinks} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              color: 'var(--text-primary)', textDecoration: 'none',
              fontWeight: 500, opacity: 0.8, transition: 'opacity 0.2s',
              fontSize: '0.82rem', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              {isLoggedIn ? 'My Account' : 'Login'}
            </Link>

            <button className={styles.cartBtn} onClick={openCart} aria-label="Open cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        </div>

        {/* ═══ NAV BAR: Main Navigation — centred ═══ */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="container" style={{ padding: '0', display: 'flex', justifyContent: 'center' }}>
            <nav className={styles.nav}>
            {menuItems.map(item => {
              const hasChildren = item.children && item.children.length > 0;
              const isMega = item.type === 'mega' && hasChildren;

              if (isMega) {
                return (
                  <div
                    key={item.id}
                    className={megaStyles.triggerWrap}
                    onMouseEnter={e => openMega(item.id, e.currentTarget as HTMLElement)}
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
          </div>
        </div>
      </div>

      {/* ── Mega-menu Panel (rendered outside header, positioned dynamically) ── */}
      {megaOpen && (() => {
        const activeItem = menuItems.find(i => i.id === megaOpen);
        if (!activeItem?.children?.length) return null;
        return (
          <div
            className={megaStyles.panel}
            style={{ top: panelTop, left: panelLeft ?? undefined }}
            onMouseEnter={cancelClose}
            onMouseLeave={startClose}
          >
            <div className={megaStyles.inner}>
              <div className={megaStyles.columns}>
                {activeItem.children!.map(child => (
                  <Link
                    key={child.id}
                    href={child.url || '/'}
                    className={megaStyles.columnLink}
                    onClick={() => setMegaOpen(null)}
                  >
                    {child.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={child.image_url} alt="" className={megaStyles.linkIconImg} />
                    ) : (
                      <div className={megaStyles.linkIcon}>
                        {child.label.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className={megaStyles.linkLabel}>{child.label}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
      <MobileMenu items={menuItems} isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
