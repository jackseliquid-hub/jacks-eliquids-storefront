'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleProvider, useRole } from '@/context/RoleContext';
import type { UserRole } from '@/lib/roles';
import { ROLE_LABELS } from '@/lib/roles';
import styles from './admin.module.css';

const allNavItems = [
  { href: '/admin/orders',    label: 'Orders',        icon: '🛒' },
  { href: '/admin/customers', label: 'Customers',     icon: '👥' },
  { href: '/admin/emails',    label: 'Emails',        icon: '✉️' },
  { href: '/admin',           label: 'Products',      icon: '📦', exact: true },
  { href: '/admin/product/new', label: 'Add Product', icon: '➕', headChefOnly: true },
  { href: '/admin/blogs',     label: 'Blogs',         icon: '📝' },
  { href: '/admin/pages',     label: 'Pages',         icon: '📄' },
  { href: '/admin/categories',label: 'Categories',    icon: '🗂️' },
  { href: '/admin/tags',      label: 'Tags',          icon: '🏷️' },
  { href: '/admin/brands',    label: 'Brands',        icon: '✦' },
  { href: '/admin/discounts', label: 'Discounts',     icon: '💰' },
  { href: '/admin/discount-codes', label: 'Coupon Codes', icon: '🏷️' },
  { href: '/admin/compatibility', label: 'Compat Links', icon: '🔗' },
  { href: '/admin/shipping',  label: 'Shipping',      icon: '🚚' },
  { href: '/admin/feed-import',label: 'Feed Import',  icon: '📦' },
  { href: '/admin/menus',     label: 'Menus',         icon: '🧭' },

  { href: '/admin/media',     label: 'Media Library', icon: '🖼️' },
  { href: '/admin/seo',       label: 'Global SEO',    icon: '🔍' },
];

function AdminNavInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useRole();
  const isHeadChef = role === 'head_chef';

  const navItems = allNavItems.filter(item => !item.headChefOnly || isHeadChef);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarLogo}>Jack&apos;s</span>
          <span className={styles.sidebarSub}>The Kitchen</span>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
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
          {/* Role badge */}
          <div style={{ marginBottom: '0.75rem', padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            {ROLE_LABELS[role]}
          </div>
          <Link href="/" className={styles.storeFrontLink}>
            ← Back to Storefront
          </Link>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

export default function AdminNav({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return (
    <RoleProvider role={role}>
      <AdminNavInner>{children}</AdminNavInner>
    </RoleProvider>
  );
}
