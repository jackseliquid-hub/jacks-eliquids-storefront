'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface LinkResult {
  type: 'brand' | 'category' | 'tag' | 'product';
  label: string;
  url: string;
}

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  brand:    { icon: '🏷️', color: '#6b21a8', bg: '#faf5ff' },
  category: { icon: '📁', color: '#1e40af', bg: '#eff6ff' },
  tag:      { icon: '#️⃣', color: '#b45309', bg: '#fffbeb' },
  product:  { icon: '📦', color: '#065f46', bg: '#ecfdf5' },
};

interface LinkPickerProps {
  value: string;
  onChange: (url: string) => void;
}

export default function LinkPicker({ value, onChange }: LinkPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const term = `%${q.trim()}%`;

    const [brandsRes, catsRes, tagsRes, productsRes] = await Promise.all([
      supabase.from('brands').select('name').ilike('name', term).limit(8),
      supabase.from('categories').select('name').ilike('name', term).limit(8),
      supabase.from('tags').select('name').ilike('name', term).limit(8),
      supabase.from('products').select('name, slug').ilike('name', term).neq('status', 'draft').limit(10),
    ]);

    const items: LinkResult[] = [];
    for (const b of brandsRes.data || []) items.push({ type: 'brand', label: b.name, url: `/?brand=${encodeURIComponent(b.name)}` });
    for (const c of catsRes.data || []) items.push({ type: 'category', label: c.name, url: `/?cat=${encodeURIComponent(c.name)}` });
    for (const t of tagsRes.data || []) items.push({ type: 'tag', label: t.name, url: `/?tag=${encodeURIComponent(t.name)}` });
    for (const p of productsRes.data || []) items.push({ type: 'product', label: p.name, url: `/product/${p.slug}` });

    setResults(items);
    setLoading(false);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function pick(item: LinkResult) {
    onChange(item.url);
    setQuery('');
    setOpen(false);
    setResults([]);
  }

  // Group results by type
  const grouped = (['brand', 'category', 'tag', 'product'] as const)
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Manual URL input + search */}
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste a URL or use search →"
          style={{
            flex: 1, padding: '0.45rem 0.6rem',
            border: '1px solid #d1d5db', borderRadius: 7,
            fontSize: '0.84rem', color: '#111',
            outline: 'none',
          }}
        />
        <div style={{ position: 'relative', flex: '0 0 200px' }}>
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
            placeholder="🔍 Search links…"
            style={{
              width: '100%', padding: '0.45rem 0.6rem',
              border: '1px solid #93c5fd', borderRadius: 7,
              fontSize: '0.84rem', color: '#111',
              background: '#f0f9ff',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Dropdown results */}
      {open && (query.trim().length >= 2) && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          width: 380, maxHeight: 360, overflowY: 'auto',
          background: '#fff', borderRadius: 10,
          border: '1px solid #e5e7eb',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          zIndex: 50,
        }}>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
              Searching…
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map(({ type, items }) => {
              const meta = TYPE_META[type];
              return (
                <div key={type}>
                  {/* Group header */}
                  <div style={{
                    padding: '0.4rem 0.75rem',
                    background: '#f9fafb',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '0.7rem', fontWeight: 700,
                    color: meta.color, textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {meta.icon} {type}s
                  </div>
                  {items.map((item, i) => (
                    <button
                      key={`${type}-${i}`}
                      onClick={() => pick(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        width: '100%', padding: '0.5rem 0.75rem',
                        border: 'none', background: 'none', cursor: 'pointer',
                        textAlign: 'left', fontSize: '0.82rem', color: '#111',
                        borderBottom: '1px solid #f9fafb',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = meta.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{
                        flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                        color: meta.color, background: meta.bg,
                        padding: '2px 5px', borderRadius: 4,
                        border: `1px solid ${meta.color}22`,
                      }}>
                        {type === 'brand' ? 'Brand' : type === 'category' ? 'Cat' : type === 'tag' ? 'Tag' : 'Prod'}
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.url}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
