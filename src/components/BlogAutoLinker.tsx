'use client';

import { useState, useEffect, useMemo } from 'react';

export interface LinkableEntity {
  name: string;
  url: string;
  type: 'brand' | 'category' | 'tag';
}

interface Match {
  entity: LinkableEntity;
  count: number;
  linked: boolean;  // true = user chose to link this
  dismissed: boolean; // true = user chose to ignore
}

interface BlogAutoLinkerProps {
  content: string;
  entities: LinkableEntity[];
  onApply: (newContent: string) => void;
}

/**
 * BlogAutoLinker — scans markdown for brand/category/tag names,
 * lets the user decide which to autolink, then applies all at once.
 */
export default function BlogAutoLinker({ content, entities, onApply }: BlogAutoLinkerProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [applied, setApplied] = useState(false);

  // Scan content for entity name matches (case-insensitive, whole word)
  useEffect(() => {
    if (!content || entities.length === 0) { setMatches([]); return; }
    setApplied(false);

    const found: Match[] = [];
    for (const entity of entities) {
      // Skip very short names (< 3 chars) to avoid false positives
      if (entity.name.length < 3) continue;
      // Escape regex special chars in entity name
      const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match whole word, case-insensitive — but NOT inside markdown links [text](url) or URLs
      const regex = new RegExp(`(?<!\\[)\\b${escaped}\\b(?![\\]\\(])`, 'gi');
      const occurrences = (content.match(regex) || []).length;
      if (occurrences > 0) {
        found.push({ entity, count: occurrences, linked: false, dismissed: false });
      }
    }

    // Sort: brands first, then categories, then tags. Within each group, most occurrences first.
    const typeOrder = { brand: 0, category: 1, tag: 2 };
    found.sort((a, b) => typeOrder[a.entity.type] - typeOrder[b.entity.type] || b.count - a.count);

    setMatches(found);
  }, [content, entities]);

  const pendingCount = matches.filter(m => !m.linked && !m.dismissed).length;
  const linkedCount = matches.filter(m => m.linked).length;

  const toggleLink = (idx: number) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, linked: !m.linked, dismissed: false } : m));
  };

  const dismiss = (idx: number) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, dismissed: true, linked: false } : m));
  };

  const linkAll = () => {
    setMatches(prev => prev.map(m => m.dismissed ? m : { ...m, linked: true }));
  };

  const dismissAll = () => {
    setMatches(prev => prev.map(m => ({ ...m, dismissed: true, linked: false })));
  };

  const applyLinks = () => {
    let result = content;
    const toLink = matches.filter(m => m.linked);

    for (const match of toLink) {
      const escaped = match.entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only link the FIRST occurrence that isn't already inside a markdown link
      const regex = new RegExp(`(?<!\\[)\\b(${escaped})\\b(?![\\]\\(])`, 'i');
      result = result.replace(regex, `[$1](${match.entity.url})`);
    }

    onApply(result);
    setApplied(true);
  };

  if (matches.length === 0) return null;

  const typeLabels: Record<string, { icon: string; color: string; bg: string }> = {
    brand:    { icon: '✦', color: '#7c3aed', bg: '#f3e8ff' },
    category: { icon: '🗂️', color: '#0f766e', bg: '#f0fdfa' },
    tag:      { icon: '🏷️', color: '#b45309', bg: '#fffbeb' },
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
      background: '#fff', marginTop: '1rem',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem', background: 'linear-gradient(135deg, #f3e8ff, #e0f2fe)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🔗</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>
            Auto-Link Scanner
          </span>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            — {matches.length} {matches.length === 1 ? 'match' : 'matches'} found
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={linkAll}
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #99f6e4', borderRadius: 6, background: '#f0fdfa', color: '#0f766e', cursor: 'pointer' }}>
            ✓ Link All
          </button>
          <button type="button" onClick={dismissAll}
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#6b7280', cursor: 'pointer' }}>
            ✕ Ignore All
          </button>
        </div>
      </div>

      {/* Matches list */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {matches.map((m, idx) => {
          if (m.dismissed) return (
            <div key={m.entity.name + m.entity.type} style={{
              padding: '0.5rem 1rem', borderBottom: '1px solid #f9fafb',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              opacity: 0.4, background: '#fafafa',
            }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af', flex: 1, textDecoration: 'line-through' }}>
                {m.entity.name}
              </span>
              <button type="button" onClick={() => toggleLink(idx)}
                style={{ fontSize: '0.72rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Undo
              </button>
            </div>
          );

          const t = typeLabels[m.entity.type] || typeLabels.category;
          return (
            <div key={m.entity.name + m.entity.type} style={{
              padding: '0.6rem 1rem', borderBottom: '1px solid #f3f4f6',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: m.linked ? '#f0fdf4' : '#fff',
              transition: 'background 0.15s',
            }}>
              {/* Type badge */}
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                borderRadius: 9999, background: t.bg, color: t.color,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {t.icon} {m.entity.type}
              </span>

              {/* Name + count */}
              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: '#111' }}>
                {m.entity.name}
                <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#9ca3af', marginLeft: 6 }}>
                  ({m.count} {m.count === 1 ? 'mention' : 'mentions'})
                </span>
              </span>

              {/* URL preview */}
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.entity.url}
              </span>

              {/* Actions */}
              <button type="button" onClick={() => toggleLink(idx)}
                style={{
                  padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6,
                  border: m.linked ? '1px solid #86efac' : '1px solid #99f6e4',
                  background: m.linked ? '#dcfce7' : '#f0fdfa',
                  color: m.linked ? '#166534' : '#0f766e',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {m.linked ? '✓ Linked' : '🔗 Link'}
              </button>
              <button type="button" onClick={() => dismiss(idx)}
                style={{
                  padding: '0.3rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6,
                  border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af',
                  cursor: 'pointer',
                }}>
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Apply bar */}
      {linkedCount > 0 && (
        <div style={{
          padding: '0.75rem 1rem', background: '#f0fdf4', borderTop: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
            {applied ? '✓ Links applied!' : `${linkedCount} link${linkedCount > 1 ? 's' : ''} ready to apply`}
          </span>
          {!applied && (
            <button type="button" onClick={applyLinks}
              style={{
                padding: '0.5rem 1.25rem', background: '#0d9488', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer',
              }}>
              Apply Links to Content
            </button>
          )}
        </div>
      )}
    </div>
  );
}
