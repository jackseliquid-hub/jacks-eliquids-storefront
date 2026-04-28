'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleProvider, useRole } from '@/context/RoleContext';
import type { UserRole } from '@/lib/roles';
import { ROLE_LABELS } from '@/lib/roles';
import styles from './admin.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  headChefOnly?: boolean;
}

interface NavGroup {
  type: 'group';
  label: string;
  icon: string;
  headChefOnly?: boolean;
  items: NavItem[];
  // hrefs that count as "active" for the group header
  matchPrefixes: string[];
}

type NavEntry = NavItem | NavGroup;

// ── Nav structure ─────────────────────────────────────────────────────────────

const allNavEntries: NavEntry[] = [
  { href: '/admin/orders',       label: 'Orders',        icon: '🛒' },
  { href: '/admin/customers',    label: 'Customers',     icon: '👥' },
  { href: '/admin/emails',       label: 'Emails',        icon: '✉️' },

  // ── Product Editors group ─────────────────────────────────────────────────
  {
    type: 'group',
    label: 'Product Editors',
    icon: '📦',
    matchPrefixes: ['/admin/categories', '/admin/tags', '/admin/brands', '/admin/product'],
    items: [
      { href: '/admin',              label: 'Products',      icon: '📋', exact: true },
      { href: '/admin/product/new',  label: 'Add Product',   icon: '➕', headChefOnly: true },
      { href: '/admin/categories',   label: 'Categories',    icon: '🗂️' },
      { href: '/admin/tags',         label: 'Tags',          icon: '🏷️' },
      { href: '/admin/brands',       label: 'Brands',        icon: '✦' },
    ],
  },

  { href: '/admin/blogs',        label: 'Blogs',         icon: '📝' },
  { href: '/admin/reviews',      label: 'Reviews',       icon: '⭐' },
  { href: '/admin/pages',        label: 'Pages',         icon: '📄' },
  { href: '/admin/discounts',    label: 'Discounts',     icon: '💰' },
  { href: '/admin/discount-codes', label: 'Coupon Codes', icon: '🏷️' },
  { href: '/admin/compatibility', label: 'Compat Links', icon: '🔗' },
  { href: '/admin/shipping',     label: 'Shipping',      icon: '🚚' },
  { href: '/admin/feed-import',  label: 'Feed Import',   icon: '🔄' },
  { href: '/admin/menus',        label: 'Menus',         icon: '🧭' },
  { href: '/admin/banners',      label: 'Banners',       icon: '🖼️' },
  { href: '/admin/media',        label: 'Media Library', icon: '🗃️' },
  { href: '/admin/seo',          label: 'Global SEO',    icon: '🔍' },
  { href: '/admin/ai-prompts',   label: 'AI Prompts',    icon: '🤖' },
  { href: '/admin/export',       label: 'Downloads',     icon: '⬇️' },
];

// ── Inner component ────────────────────────────────────────────────────────────

function AdminNavInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useRole();
  const isHeadChef = role === 'head_chef';

  // Which groups are open — auto-open if any child is active
  const productGroupActive =
    pathname === '/admin' ||
    ['/admin/categories', '/admin/tags', '/admin/brands', '/admin/product'].some(p => pathname.startsWith(p));

  const [productGroupOpen, setProductGroupOpen] = useState(productGroupActive);

  function renderItem(item: NavItem) {
    if (item.headChefOnly && !isHeadChef) return null;
    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        {item.label}
      </Link>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarLogo}>Jack&apos;s</span>
          <span className={styles.sidebarSub}>The Kitchen</span>
        </div>

        {/* Back to storefront */}
        <Link href="/" className={styles.storeFrontLink} style={{ margin: '0.75rem 1rem 0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🍽️ Back to the Restaurant
        </Link>

        <nav className={styles.sidebarNav}>
          {allNavEntries.map((entry, i) => {
            // ── Group ────────────────────────────────────────────────────────
            if ('type' in entry && entry.type === 'group') {
              const isGroupActive = entry.matchPrefixes.some(p => pathname.startsWith(p)) || pathname === '/admin';
              const isOpen = entry.label === 'Product Editors' ? productGroupOpen : false;
              const toggle = entry.label === 'Product Editors' ? () => setProductGroupOpen(o => !o) : () => {};

              return (
                <div key={`group-${i}`}>
                  {/* Group header button */}
                  <button
                    onClick={toggle}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      width: '100%', padding: '0.65rem 0.85rem',
                      borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontSize: '0.9rem', fontWeight: isGroupActive ? 700 : 500,
                      background: isGroupActive && !isOpen ? '#1d1d1f' : isGroupActive ? '#f0f0f2' : 'transparent',
                      color: isGroupActive && !isOpen ? '#fff' : isGroupActive ? '#1d1d1f' : '#555',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <span className={styles.navIcon}>{entry.icon}</span>
                    <span style={{ flex: 1 }}>{entry.label}</span>
                    <span style={{
                      fontSize: '0.7rem', opacity: 0.6,
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                      display: 'inline-block',
                    }}>▶</span>
                  </button>

                  {/* Expanded child items */}
                  {isOpen && (
                    <div style={{ paddingLeft: '0.85rem', marginTop: '0.1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {entry.items.map(item => renderItem(item))}
                    </div>
                  )}
                </div>
              );
            }

            // ── Plain item ───────────────────────────────────────────────────
            const item = entry as NavItem;
            if (item.headChefOnly && !isHeadChef) return null;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div style={{
            marginBottom: '0.75rem', padding: '6px 12px',
            background: '#f5f5f7', borderRadius: '6px',
            fontSize: '0.78rem', color: '#86868b', textAlign: 'center',
          }}>
            {ROLE_LABELS[role]}
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function AdminNav({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return (
    <RoleProvider role={role}>
      <AdminNavInner>{children}</AdminNavInner>
    </RoleProvider>
  );
}
