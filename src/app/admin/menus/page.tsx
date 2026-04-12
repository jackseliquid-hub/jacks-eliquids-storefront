'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { Menu } from '@/lib/menus';
import { createMenu, deleteMenu } from './actions';
import adminStyles from '../admin.module.css';

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [error, setError] = useState('');

  async function loadMenus() {
    const supabase = createClient();
    const { data } = await supabase
      .from('menus').select('*').order('created_at', { ascending: true });
    setMenus((data || []) as Menu[]);
    setLoading(false);
  }

  useEffect(() => { loadMenus(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newSlug.trim()) { setError('Name and slug required.'); return; }
    setError('');
    const res = await createMenu(newName.trim(), newSlug.trim().toLowerCase().replace(/\s+/g, '-'));
    if (res.error) { setError(res.error); return; }
    setNewName(''); setNewSlug(''); setShowAdd(false);
    loadMenus();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete menu "${name}" and all its items?`)) return;
    await deleteMenu(id);
    loadMenus();
  }

  const iconMap: Record<string, string> = {
    main: '🧭',
    'footer-shop': '🛒',
    'footer-discover': '🔍',
  };

  return (
    <div>
      <div className={adminStyles.header}>
        <div>
          <h1 className={adminStyles.title}>Menus</h1>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Manage your storefront navigation
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {menus.map(m => (
            <div
              key={m.id}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
                padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{iconMap[m.slug] || '📋'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>{m.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{m.slug}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <Link
                  href={`/admin/menus/${m.id}`}
                  style={{
                    flex: 1, textAlign: 'center', padding: '0.5rem 1rem',
                    background: '#0d9488', color: '#fff', borderRadius: 8,
                    fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  Edit Menu
                </Link>
                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  style={{
                    padding: '0.5rem 0.75rem', background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 8, color: '#ef4444', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Menu ─────────────────────────────────── */}
      {!showAdd ? (
        <div
          onClick={() => setShowAdd(true)}
          style={{
            border: '2px dashed #e5e7eb', borderRadius: 14, padding: '1.25rem',
            textAlign: 'center', cursor: 'pointer', marginTop: '1rem', background: '#fafafa',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#0d9488')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
        >
          <span style={{ fontWeight: 700, color: '#374151' }}>+ Add new menu</span>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
            e.g. "Mobile Nav", "Footer — Legal"
          </div>
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb', borderRadius: 14, padding: '1.5rem', marginTop: '1rem',
          background: '#fff', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Name</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Footer — Legal"
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Slug</label>
            <input
              value={newSlug} onChange={e => setNewSlug(e.target.value)}
              placeholder="footer-legal"
              style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: '0.9rem', fontFamily: 'monospace' }}
            />
          </div>
          <button
            onClick={handleCreate}
            style={{ background: '#0d9488', color: '#fff', padding: '0.55rem 1.25rem', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Create
          </button>
          <button
            onClick={() => { setShowAdd(false); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          {error && <div style={{ width: '100%', color: '#ef4444', fontSize: '0.8rem' }}>⚠️ {error}</div>}
        </div>
      )}
    </div>
  );
}
