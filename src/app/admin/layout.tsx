'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

// I added the "Add Product" link to this list right below "Products"
const navItems = [
  { href: '/admin/orders', label: 'Orders', icon: '🛒' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
  { href: '/admin/emails', label: 'Emails', icon: '✉️' },
  { href: '/admin', label: 'Products', icon: '📦' },
  { href: '/admin/product/new', label: 'Add Product', icon: '➕' },
  { href: '/admin/blogs', label: 'Blogs', icon: '📝' },
  { href: '/admin/pages', label: 'Pages', icon: '📄' },
  { href: '/admin/categories', label: 'Categories', icon: '🗂️' },
  { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
  { href: '/admin/brands', label: 'Brands', icon: '✦' },
  { href: '/admin/discounts', label: 'Discounts', icon: '💰' },
  { href: '/admin/media', label: 'Media Library', icon: '🖼️' },
  { href: '/admin/seo', label: 'Global SEO', icon: '🔍' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarLogo}>Jack's</span>
          <span className={styles.sidebarSub}>The Kitchen</span>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map(item => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
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
          <Link href="/" className={styles.storeFrontLink}>
            ← Back to Storefront
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}