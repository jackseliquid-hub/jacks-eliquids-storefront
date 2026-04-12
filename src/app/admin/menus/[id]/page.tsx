'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { MenuItem, Menu } from '@/lib/menus';
import { saveMenuItems } from '../actions';
import adminStyles from '../../admin.module.css';

function genId() { return crypto.randomUUID(); }

interface FlatItem extends Omit<MenuItem, 'children'> {
  depth: number;
}

// Convert nested tree → flat list with depth
function flatten(items: MenuItem[], depth = 0): FlatItem[] {
  const result: FlatItem[] = [];
  for (const item of items) {
    const { children, ...rest } = item;
    result.push({ ...rest, depth });
    if (children && children.length > 0) result.push(...flatten(children, depth + 1));
  }
  return result;
}

// Convert flat list with depth → set parent_id based on depth changes
function assignParents(flat: FlatItem[]): FlatItem[] {
  const stack: { id: string; depth: number }[] = [];
  return flat.map((item, i) => {
    // Pop stack until we find the correct parent depth
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }
    const parent_id = stack.length > 0 ? stack[stack.length - 1].id : null;
    stack.push({ id: item.id, depth: item.depth });
    return { ...item, parent_id, sort_order: i };
  });
}

export default function MenuBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: menuId } = use(params);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editType, setEditType] = useState<'link' | 'mega' | 'heading'>('link');
  const [editNewTab, setEditNewTab] = useState(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: menuData }, { data: itemsData }] = await Promise.all([
      supabase.from('menus').select('*').eq('id', menuId).single(),
      supabase.from('menu_items').select('*').eq('menu_id', menuId).order('sort_order', { ascending: true }),
    ]);
    if (menuData) setMenu(menuData as Menu);

    // Build tree then flatten to get depth
    const rawItems = (itemsData || []) as MenuItem[];
    const tree = buildTreeFromFlat(rawItems);
    setItems(flatten(tree));
    setLoading(false);
  }, [menuId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Save ────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    const withParents = assignParents(items);
    const payload = withParents.map(item => ({
      id: item.id,
      menu_id: menuId,
      parent_id: item.parent_id,
      label: item.label,
      url: item.url,
      type: item.type,
      open_in_new_tab: item.open_in_new_tab,
      sort_order: item.sort_order,
      image_url: item.image_url,
    }));
    const res = await saveMenuItems(menuId, payload);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ─── Add item ────────────────────────────────────────────────
  function addItem() {
    const newItem: FlatItem = {
      id: genId(),
      menu_id: menuId,
      parent_id: null,
      label: 'New Link',
      url: '/',
      type: 'link',
      open_in_new_tab: false,
      sort_order: items.length,
      image_url: null,
      depth: 0,
    };
    setItems([...items, newItem]);
    startEdit(newItem);
  }

  // ─── Delete ──────────────────────────────────────────────────
  function removeItem(idx: number) {
    // Also remove children (items deeper after this one until depth <= item.depth)
    const item = items[idx];
    let endIdx = idx + 1;
    while (endIdx < items.length && items[endIdx].depth > item.depth) endIdx++;
    setItems(items.filter((_, i) => i < idx || i >= endIdx));
  }

  // ─── Indent / Outdent ────────────────────────────────────────
  function indent(idx: number) {
    if (idx === 0) return;
    const prev = items[idx - 1];
    const item = items[idx];
    if (item.depth > prev.depth) return; // already nested deeper
    setItems(items.map((it, i) => i === idx ? { ...it, depth: it.depth + 1 } : it));
  }

  function outdent(idx: number) {
    const item = items[idx];
    if (item.depth === 0) return;
    setItems(items.map((it, i) => i === idx ? { ...it, depth: it.depth - 1 } : it));
  }

  // ─── Drag & Drop ─────────────────────────────────────────────
  function handleDragStart(idx: number) { setDragIdx(idx); }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
  }

  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); return; }
    const updated = [...items];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setItems(updated);
    setDragIdx(null);
  }

  // ─── Move Up / Down ──────────────────────────────────────────
  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...items];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setItems(updated);
  }

  function moveDown(idx: number) {
    if (idx >= items.length - 1) return;
    const updated = [...items];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setItems(updated);
  }

  // ─── Inline Edit ─────────────────────────────────────────────
  function startEdit(item: FlatItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditUrl(item.url || '');
    setEditType(item.type);
    setEditNewTab(item.open_in_new_tab);
  }

  function applyEdit() {
    setItems(items.map(it =>
      it.id === editingId
        ? { ...it, label: editLabel, url: editUrl || null, type: editType, open_in_new_tab: editNewTab }
        : it
    ));
    setEditingId(null);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading…</div>;

  const typeBadge = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      mega: { bg: '#dbeafe', color: '#1d4ed8' },
      heading: { bg: '#fef3c7', color: '#92400e' },
      link: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const c = colors[type] || colors.link;
    return (
      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, background: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {type}
      </span>
    );
  };

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className={adminStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin/menus" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '1.2rem' }}>←</Link>
          <div>
            <h1 className={adminStyles.title}>{menu?.name || 'Menu Builder'}</h1>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'monospace' }}>{menu?.slug}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saved && <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.85rem' }}>✓ Saved</span>}
          {error && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#0d9488', color: '#fff', border: 'none', padding: '0.55rem 1.5rem',
              borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Menu'}
          </button>
        </div>
      </div>

      {/* ── Items List ──────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        {items.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            No items yet. Click "+ Add item" below.
          </div>
        )}

        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.7rem 1rem', paddingLeft: `${1 + item.depth * 2}rem`,
              borderBottom: '1px solid #f3f4f6',
              background: dragIdx === idx ? '#f0fdfa' : editingId === item.id ? '#fafafa' : '#fff',
              transition: 'background 0.1s',
              cursor: 'grab',
            }}
          >
            {/* Drag handle */}
            <span style={{ color: '#d1d5db', cursor: 'grab', userSelect: 'none', fontSize: '0.9rem' }}>⋮⋮</span>

            {/* Indent markers */}
            {item.depth > 0 && (
              <span style={{ color: '#e5e7eb', fontSize: '0.75rem', marginRight: '-0.2rem' }}>
                {'└─'}
              </span>
            )}

            {editingId === item.id ? (
              /* ── Inline Edit Row ──────────────────────────── */
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="Label"
                  autoFocus
                  style={{
                    padding: '0.4rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6,
                    fontSize: '0.85rem', fontWeight: 600, width: 140,
                  }}
                />
                <input
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  placeholder="/url"
                  style={{
                    padding: '0.4rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6,
                    fontSize: '0.85rem', fontFamily: 'monospace', width: 180,
                  }}
                />
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value as any)}
                  style={{ padding: '0.4rem 0.5rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }}
                >
                  <option value="link">Link</option>
                  <option value="mega">Mega Menu</option>
                  <option value="heading">Heading</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#6b7280' }}>
                  <input type="checkbox" checked={editNewTab} onChange={e => setEditNewTab(e.target.checked)} />
                  New tab
                </label>
                <button
                  onClick={applyEdit}
                  style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* ── Display Row ──────────────────────────────── */
              <>
                <span style={{ fontWeight: 600, color: '#111', fontSize: '0.9rem', flex: 1 }}>
                  {item.label}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.url || '—'}
                </span>
                {typeBadge(item.type)}
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <button onClick={() => moveUp(idx)} title="Move up" style={smallBtn}>▲</button>
                  <button onClick={() => moveDown(idx)} title="Move down" style={smallBtn}>▼</button>
                  <button onClick={() => indent(idx)} title="Indent (nest)" style={smallBtn}>→</button>
                  <button onClick={() => outdent(idx)} title="Outdent" style={smallBtn}>←</button>
                  <button onClick={() => startEdit(item)} title="Edit" style={{ ...smallBtn, color: '#0d9488' }}>✏️</button>
                  <button onClick={() => removeItem(idx)} title="Delete" style={{ ...smallBtn, color: '#ef4444' }}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* ── Add item ──────────────────────────────────────────── */}
        <div
          onClick={addItem}
          style={{
            padding: '0.9rem 1rem', textAlign: 'center', cursor: 'pointer',
            color: '#0d9488', fontWeight: 700, fontSize: '0.9rem',
            borderTop: items.length > 0 ? '1px solid #e5e7eb' : 'none',
            background: '#fafafa', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}
        >
          + Add item
        </div>
      </div>

      {/* ── Help ────────────────────────────────────────────────── */}
      <div style={{
        background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 12,
        padding: '1rem 1.25rem', marginTop: '1.25rem', fontSize: '0.85rem', color: '#374151', lineHeight: 1.8,
      }}>
        <strong style={{ color: '#0f766e' }}>💡 Tips</strong>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
          <li><strong>Drag</strong> items to reorder. Use <strong>→ / ←</strong> to indent/outdent (nest under parent).</li>
          <li>Set type to <strong>Mega Menu</strong> for items that should open a dropdown panel on hover.</li>
          <li>Nest items under a Mega Menu parent — they'll appear as columns in the dropdown.</li>
          <li>Hit <strong>Save Menu</strong> to apply changes to the live storefront.</li>
        </ul>
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
  fontSize: '0.75rem', color: '#6b7280', lineHeight: 1,
};

// Build tree from flat items using parent_id
function buildTreeFromFlat(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];
  for (const item of items) map.set(item.id, { ...item, children: [] });
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
