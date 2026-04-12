'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MenuItem } from '@/lib/menus';
import styles from './MobileMenu.module.css';

interface Props {
  items: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ items, isOpen, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}

      {/* Drawer */}
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Menu</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <nav className={styles.nav}>
          {items.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expanded.has(item.id);

            return (
              <div key={item.id}>
                {hasChildren ? (
                  <>
                    <button
                      className={styles.navItem}
                      onClick={() => toggle(item.id)}
                    >
                      <span>{item.label}</span>
                      <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>›</span>
                    </button>
                    {isExpanded && (
                      <div className={styles.subMenu}>
                        {item.children!.map(child => (
                          <Link
                            key={child.id}
                            href={child.url || '/'}
                            className={styles.subItem}
                            onClick={onClose}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.url || '/'}
                    className={styles.navItem}
                    onClick={onClose}
                    target={item.open_in_new_tab ? '_blank' : undefined}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
