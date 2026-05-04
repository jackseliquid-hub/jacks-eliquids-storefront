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

function flatten(items: MenuItem[], depth = 0): FlatItem[] {
  const result: FlatItem[] = [];
  for (const item of items) {
    const { children, ...rest } = item;
    result.push({ ...rest, depth });
    if (children && children.length > 0) result.push(...flatten(children, depth + 1));
  }
  return result;
}

function assignParents(flat: FlatItem[]): FlatItem[] {
  const stack: { id: string; depth: number }[] = [];
  return flat.map((item, i) => {
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) stack.pop();
    const parent_id = stack.length > 0 ? stack[stack.length - 1].id : null;
    stack.push({ id: item.id, depth: item.depth });
    return { ...item, parent_id, sort_order: i };
  });
}

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

/** Get the range [idx, endIdx) of an item and all its children */
function getGroupRange(items: FlatItem[], idx: number): [number, number] {
  const baseDepth = items[idx].depth;
  let endIdx = idx + 1;
  while (endIdx < items.length && items[endIdx].depth > baseDepth) endIdx++;
  return [idx, endIdx];
}

// ─── "Add Item" source types ────────────────────────────────────────────────
type AddSource = 'custom' | 'category' | 'tag' | 'brand' | 'page' | 'product';

const SOURCE_OPTIONS: { value: AddSource; label: string; icon: string }[] = [
  { value: 'custom',   label: 'Custom Link', icon: '🔗' },
  { value: 'category', label: 'Category',    icon: '🗂️' },
  { value: 'tag',      label: 'Tag',         icon: '🏷️' },
  { value: 'brand',    label: 'Brand',       icon: '✦' },
  { value: 'page',     label: 'Page',        icon: '📄' },
  { value: 'product',  label: 'Product',     icon: '📦' },
];

// ─── Component ──────────────────────────────────────────────────────────────
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
  const [editImageUrl, setEditImageUrl] = useState('');

  // Add item modal
  const [showAdd, setShowAdd] = useState(false);
  const [addSource, setAddSource] = useState<AddSource>('custom');
  const [addLabel, setAddLabel] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addType, setAddType] = useState<'link' | 'mega'>('link');
  const [sourceOptions, setSourceOptions] = useState<{ label: string; url: string }[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);

  // Collapsed groups
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Drag
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: menuData }, { data: itemsData }] = await Promise.all([
      supabase.from('menus').select('*').eq('id', menuId).single(),
      supabase.from('menu_items').select('*').eq('menu_id', menuId).order('sort_order', { ascending: true }),
    ]);
    if (menuData) setMenu(menuData as Menu);
    const rawItems = (itemsData || []) as MenuItem[];
    const tree = buildTreeFromFlat(rawItems);
    setItems(flatten(tree));
    setLoading(false);
  }, [menuId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Load source options when addSource changes ──────────
  useEffect(() => {
    if (!showAdd || addSource === 'custom') { setSourceOptions([]); return; }

    setSourceLoading(true);
    const supabase = createClient();

    (async () => {
      let opts: { label: string; url: string }[] = [];

      if (addSource === 'category') {
        const { data } = await supabase.from('categories').select('name').order('name');
        opts = (data || []).map(c => ({ label: c.name, url: `/?cat=${encodeURIComponent(c.name)}` }));
      } else if (addSource === 'tag') {
        const { data } = await supabase.from('tags').select('name').order('name');
        opts = (data || []).map(t => ({ label: t.name, url: `/?tag=${encodeURIComponent(t.name)}` }));
      } else if (addSource === 'brand') {
        const { data } = await supabase.from('brands').select('name').order('name');
        opts = (data || []).map(b => ({ label: b.name, url: `/?brand=${encodeURIComponent(b.name)}` }));
      } else if (addSource === 'page') {
        const { data } = await supabase.from('pages').select('title, slug').order('title');
        opts = (data || []).map(p => ({ label: p.title, url: `/p/${p.slug}` }));
      } else if (addSource === 'product') {
        const { data } = await supabase.from('products').select('name, slug').order('name').limit(100);
        opts = (data || []).map(p => ({ label: p.name, url: `/product/${p.slug}` }));
      }

      setSourceOptions(opts);
      setSourceLoading(false);
    })();
  }, [addSource, showAdd]);

  // ─── Save ────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    const withParents = assignParents(items);
    const payload = withParents.map(item => ({
      id: item.id, menu_id: menuId, parent_id: item.parent_id,
      label: item.label, url: item.url, type: item.type,
      open_in_new_tab: item.open_in_new_tab, sort_order: item.sort_order, image_url: item.image_url,
    }));
    const res = await saveMenuItems(menuId, payload);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ─── Add item from modal ─────────────────────────────────
  function confirmAdd() {
    if (!addLabel.trim()) return;
    const newItem: FlatItem = {
      id: genId(), menu_id: menuId, parent_id: null,
      label: addLabel.trim(), url: addUrl || '/',
      type: addType, open_in_new_tab: false,
      sort_order: items.length, image_url: null, depth: 0,
    };
    setItems([...items, newItem]);
    resetAdd();
  }

  function resetAdd() {
    setShowAdd(false); setAddSource('custom'); setAddLabel(''); setAddUrl(''); setAddType('link');
  }

  function selectSourceOption(opt: { label: string; url: string }) {
    setAddLabel(opt.label);
    setAddUrl(opt.url);
  }

  // ─── Delete (group-aware) ────────────────────────────────
  function removeItem(idx: number) {
    const [start, end] = getGroupRange(items, idx);
    setItems(items.filter((_, i) => i < start || i >= end));
  }

  // ─── Indent / Outdent ────────────────────────────────────
  function indent(idx: number) {
    if (idx === 0) return;
    const prev = items[idx - 1];
    const item = items[idx];
    if (item.depth > prev.depth) return;
    setItems(items.map((it, i) => i === idx ? { ...it, depth: it.depth + 1 } : it));
  }

  function outdent(idx: number) {
    if (items[idx].depth === 0) return;
    setItems(items.map((it, i) => i === idx ? { ...it, depth: it.depth - 1 } : it));
  }

  // ─── Move (group-aware: parent moves with all children) ──
  function moveUp(idx: number) {
    if (idx === 0) return;
    const [groupStart, groupEnd] = getGroupRange(items, idx);
    // Find the item/group before this group
    let prevStart = groupStart - 1;
    if (prevStart < 0) return;
    // If the item above is a child of something above, find the topmost parent of that group
    while (prevStart > 0 && items[prevStart].depth > items[groupStart].depth) prevStart--;
    const [prevGroupStart] = getGroupRange(items, prevStart);

    const updated = [...items];
    const group = updated.splice(groupStart, groupEnd - groupStart);
    updated.splice(prevGroupStart, 0, ...group);
    setItems(updated);
  }

  function moveDown(idx: number) {
    const [groupStart, groupEnd] = getGroupRange(items, idx);
    if (groupEnd >= items.length) return;
    // Find the group below
    const [, nextGroupEnd] = getGroupRange(items, groupEnd);

    const updated = [...items];
    const group = updated.splice(groupStart, groupEnd - groupStart);
    // Insert after the next group (adjust for removed items)
    const insertAt = nextGroupEnd - (groupEnd - groupStart);
    updated.splice(insertAt, 0, ...group);
    setItems(updated);
  }

  // ─── Drag (group-aware) ──────────────────────────────────
  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); return; }
    const [groupStart, groupEnd] = getGroupRange(items, dragIdx);
    const updated = [...items];
    const group = updated.splice(groupStart, groupEnd - groupStart);
    const adjustedIdx = idx > groupStart ? idx - (groupEnd - groupStart) : idx;
    updated.splice(adjustedIdx, 0, ...group);
    setItems(updated);
    setDragIdx(null);
  }

  // ─── Collapse/Expand ─────────────────────────────────────
  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function collapseAll() {
    const parents = new Set<string>();
    items.forEach((item, idx) => {
      const [, end] = getGroupRange(items, idx);
      if (end - idx > 1) parents.add(item.id); // has children
    });
    setCollapsed(parents);
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  // ─── Inline Edit ─────────────────────────────────────────
  function startEdit(item: FlatItem) {
    setEditingId(item.id); setEditLabel(item.label); setEditUrl(item.url || ''); setEditType(item.type); setEditImageUrl(item.image_url || '');
  }
  function applyEdit() {
    setItems(items.map(it => it.id === editingId ? { ...it, label: editLabel, url: editUrl || null, type: editType, image_url: editImageUrl || null } : it));
    setEditingId(null);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading…</div>;

  // Build visibility map — hide children of collapsed parents
  const visibleItems: { item: FlatItem; originalIdx: number }[] = [];
  const collapsedParentStack: number[] = []; // tracks depth at which a collapse is active

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // If we're inside a collapsed subtree, skip
    if (collapsedParentStack.length > 0 && item.depth > collapsedParentStack[collapsedParentStack.length - 1]) {
      continue;
    }
    // Clean up stack
    while (collapsedParentStack.length > 0 && item.depth <= collapsedParentStack[collapsedParentStack.length - 1]) {
      collapsedParentStack.pop();
    }
    visibleItems.push({ item, originalIdx: i });
    // If this item is collapsed, push its depth
    if (collapsed.has(item.id)) {
      collapsedParentStack.push(item.depth);
    }
  }

  const hasChildren = (idx: number) => {
    const [, end] = getGroupRange(items, idx);
    return end - idx > 1;
  };

  const childCount = (idx: number) => {
    const [, end] = getGroupRange(items, idx);
    return end - idx - 1;
  };

  const typeBadge = (type: string) => {
    const c = type === 'mega' ? { bg: '#dbeafe', color: '#1d4ed8' } : { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, background: c.bg, color: c.color, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
        {type}
      </span>
    );
  };

  const saveButton = (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {saved && <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.85rem' }}>✓ Saved</span>}
      {error && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {error}</span>}
      <button onClick={handleSave} disabled={saving} style={{
        background: '#0d9488', color: '#fff', border: 'none', padding: '0.55rem 1.5rem',
        borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Saving…' : 'Save Menu'}
      </button>
    </div>
  );

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className={adminStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin/menus" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '1.2rem' }}>←</Link>
          <div>
            <h1 className={adminStyles.title}>{menu?.name || 'Menu Builder'}</h1>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'monospace' }}>{menu?.slug}</span>
          </div>
        </div>
        {saveButton}
      </div>

      {/* ── Collapse/Expand controls ──────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={collapseAll} style={{
          background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.3rem 0.8rem',
          fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer', fontWeight: 500,
        }}>
          ▶ Collapse All
        </button>
        <button onClick={expandAll} style={{
          background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.3rem 0.8rem',
          fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer', fontWeight: 500,
        }}>
          ▼ Expand All
        </button>
      </div>

      {/* ── Items List ──────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        {items.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No items yet. Click &quot;+ Add item&quot; below.</div>
        )}

        {visibleItems.map(({ item, originalIdx: idx }) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1rem', paddingLeft: `${1 + item.depth * 2}rem`,
              borderBottom: '1px solid #f3f4f6',
              background: dragIdx === idx ? '#f0fdfa' : editingId === item.id ? '#fafafa' : '#fff',
              cursor: 'grab',
            }}
          >
            <span style={{ color: '#d1d5db', cursor: 'grab', userSelect: 'none', fontSize: '0.85rem' }}>⋮⋮</span>

            {/* Collapse toggle for items with children */}
            {hasChildren(idx) ? (
              <button
                onClick={() => toggleCollapse(item.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.3rem',
                  fontSize: '0.7rem', color: '#6b7280', borderRadius: 4,
                  transition: 'background 0.15s',
                }}
                title={collapsed.has(item.id) ? 'Expand children' : 'Collapse children'}
              >
                {collapsed.has(item.id) ? `▶ (${childCount(idx)})` : '▼'}
              </button>
            ) : (
              item.depth > 0 && <span style={{ color: '#e5e7eb', fontSize: '0.72rem' }}>└─</span>
            )}

            {editingId === item.id ? (
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label" autoFocus
                  style={{ padding: '0.35rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, width: 140 }} />
                <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="/url"
                  style={{ padding: '0.35rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'monospace', width: 180 }} />
                <select value={editType} onChange={e => setEditType(e.target.value as any)}
                  style={{ padding: '0.35rem 0.5rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem' }}>
                  <option value="link">Link</option>
                  <option value="mega">Mega Menu</option>
                </select>
                <input value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} placeholder="Icon image URL (optional)"
                  style={{ padding: '0.35rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '0.82rem', width: 200, color: '#6b7280' }} />
                <button onClick={applyEdit} style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              </div>
            ) : (
              <>
                <span style={{ fontWeight: 600, color: '#111', fontSize: '0.88rem', flex: 1 }}>{item.label}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.url || '—'}</span>
                {typeBadge(item.type)}
                {hasChildren(idx) && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 9999, background: '#f0fdfa', color: '#0f766e' }}>
                    {childCount(idx)} items
                  </span>
                )}
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  {[
                    { fn: () => moveUp(idx), icon: '▲', tip: 'Move up (with children)' },
                    { fn: () => moveDown(idx), icon: '▼', tip: 'Move down (with children)' },
                    { fn: () => indent(idx), icon: '→', tip: 'Nest' },
                    { fn: () => outdent(idx), icon: '←', tip: 'Unnest' },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.fn} title={btn.tip} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
                      fontSize: '0.72rem', color: '#6b7280', lineHeight: 1,
                    }}>{btn.icon}</button>
                  ))}
                  <button onClick={() => startEdit(item)} title="Edit" style={{
                    background: '#f0fdfa', border: '1px solid #99f6e4', cursor: 'pointer',
                    padding: '0.35rem 0.7rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700,
                    color: '#0f766e', lineHeight: 1, marginLeft: '0.25rem',
                  }}>✏️ Edit</button>
                  <button onClick={() => removeItem(idx)} title="Delete" style={{
                    background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer',
                    padding: '0.35rem 0.7rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700,
                    color: '#dc2626', lineHeight: 1,
                  }}>🗑️ Delete</button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* ── Add Item Button / Panel ──────────────────────── */}
        {!showAdd ? (
          <div
            onClick={() => setShowAdd(true)}
            style={{
              padding: '0.85rem 1rem', textAlign: 'center', cursor: 'pointer',
              color: '#0d9488', fontWeight: 700, fontSize: '0.9rem',
              borderTop: items.length > 0 ? '1px solid #e5e7eb' : 'none',
              background: '#fafafa', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}
          >
            + Add item
          </div>
        ) : (
          <div style={{
            padding: '1.25rem', borderTop: '1px solid #e5e7eb', background: '#fafafa',
          }}>
            {/* Source type selector */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setAddSource(opt.value); setAddLabel(''); setAddUrl(''); }}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: 20,
                    border: '1.5px solid', fontSize: '0.82rem', cursor: 'pointer',
                    borderColor: addSource === opt.value ? '#0d9488' : '#e5e7eb',
                    background: addSource === opt.value ? '#f0fdfa' : '#fff',
                    color: addSource === opt.value ? '#0f766e' : '#6b7280',
                    fontWeight: addSource === opt.value ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Source-specific content */}
            {addSource === 'custom' ? (
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>Title</label>
                  <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="About Us"
                    style={{ padding: '0.45rem 0.7rem', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: '0.88rem', width: 160 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>URL</label>
                  <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="/about"
                    style={{ padding: '0.45rem 0.7rem', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: '0.88rem', fontFamily: 'monospace', width: 200 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>Type</label>
                  <select value={addType} onChange={e => setAddType(e.target.value as any)}
                    style={{ padding: '0.45rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: '0.85rem' }}>
                    <option value="link">Link</option>
                    <option value="mega">Mega Menu</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                {sourceLoading ? (
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '0.5rem 0' }}>Loading…</div>
                ) : sourceOptions.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '0.5rem 0' }}>No items found.</div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                    {sourceOptions.map((opt, i) => {
                      const isSelected = addLabel === opt.label && addUrl === opt.url;
                      return (
                        <button
                          key={i}
                          onClick={() => selectSourceOption(opt)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '0.55rem 0.9rem', border: 'none', cursor: 'pointer',
                            background: isSelected ? '#f0fdfa' : 'transparent',
                            fontSize: '0.88rem', color: isSelected ? '#0f766e' : '#374151',
                            fontWeight: isSelected ? 600 : 400,
                            borderBottom: '1px solid #f9fafb',
                          }}
                        >
                          {isSelected && '✓ '}{opt.label}
                          <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{opt.url}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {addLabel && (
                  <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: '#0f766e' }}>
                    Selected: <strong>{addLabel}</strong> → <code style={{ fontSize: '0.75rem' }}>{addUrl}</code>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
              <button onClick={confirmAdd} disabled={!addLabel.trim()} style={{
                background: addLabel.trim() ? '#0d9488' : '#d1d5db', color: '#fff', border: 'none',
                padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: addLabel.trim() ? 'pointer' : 'not-allowed',
              }}>
                Add to menu
              </button>
              <button onClick={resetAdd} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Save Button ────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem',
        paddingTop: '1rem', borderTop: '1px solid #e5e7eb',
      }}>
        {saveButton}
      </div>

      {/* ── Help ────────────────────────────────────────────── */}
      <div style={{
        background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 12,
        padding: '1rem 1.25rem', marginTop: '1.25rem', fontSize: '0.85rem', color: '#374151', lineHeight: 1.8,
      }}>
        <strong style={{ color: '#0f766e' }}>💡 Tips</strong>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
          <li><strong>▲ / ▼</strong> moves an item <strong>with all its children</strong> as a group.</li>
          <li><strong>▶ / ▼</strong> next to a parent collapses/expands its children.</li>
          <li><strong>Drag</strong> items to reorder. Use <strong>→ / ←</strong> to nest/unnest.</li>
          <li>Set type to <strong>Mega Menu</strong> for items that open a dropdown panel on hover.</li>
          <li>Nest items under a Mega Menu parent — they appear as links in the dropdown.</li>
          <li>Use the <strong>source type selector</strong> (Category, Tag, Brand, etc.) to auto-populate label and URL.</li>
          <li>Hit <strong>Save Menu</strong> to apply changes to the live storefront.</li>
        </ul>
      </div>
    </div>
  );
}
