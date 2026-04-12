'use client';

import Link from 'next/link';
import type { MenuItem } from '@/lib/menus';
import styles from './MegaMenu.module.css';

interface Props {
  items: MenuItem[];     // children of the mega-menu parent
  onClose: () => void;
}

export default function MegaMenu({ items, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <div className={styles.panel} onMouseLeave={onClose}>
        <div className={`container ${styles.inner}`}>
          {/* Link columns */}
          <div className={styles.columns}>
            {items.map(item => (
              <Link
                key={item.id}
                href={item.url || '/'}
                className={styles.columnLink}
                onClick={onClose}
              >
                <span className={styles.linkLabel}>{item.label}</span>
                {item.type === 'heading' && (
                  <span className={styles.linkHint}>Section</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
