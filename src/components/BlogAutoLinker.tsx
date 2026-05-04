'use client';

import { useState, useEffect } from 'react';

export interface LinkableEntity {
  name: string;
  url: string;
  type: 'brand' | 'category' | 'tag';
}

interface Match {
  entity: LinkableEntity;
  count: number;       // total mentions found
  linkQty: number;     // how many to link (user-adjustable)
  linked: boolean;     // true = user chose to link this
  dismissed: boolean;  // true = user chose to ignore
}

interface BlogAutoLinkerProps {
  content: string;
  entities: LinkableEntity[];
  onApply: (newContent: string) => void;
}

/** Calculate a sensible default link count: ~1 per 500 words, min 1, max count */
function suggestQty(count: number, contentLength: number): number {
  const wordEstimate = contentLength / 5; // rough word count
  const ideal = Math.max(1, Math.round(wordEstimate / 500)); // ~1 link per 500 words
  return Math.min(ideal, count);
}

/**
 * Apply N evenly-distributed links for a given entity across the content.
 * Finds all match positions, picks evenly-spaced ones, and replaces them.
 */
function applyEvenLinks(text: string, entityName: string, url: string, qty: number): string {
  const escaped = entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match whole word, not already inside a markdown link
  const regex = new RegExp(`(?<!\\[)\\b(${escaped})\\b(?![\\]\\(])`, 'gi');

  // Collect all match positions
  const allMatches: { index: number; length: number; original: string }[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    allMatches.push({ index: m.index, length: m[0].length, original: m[0] });
  }

  if (allMatches.length === 0 || qty <= 0) return text;

  // Pick evenly-spaced indices
  const toLink = qty >= allMatches.length
    ? allMatches.map((_, i) => i)
    : selectEvenlySpaced(allMatches.length, qty);

  // Apply replacements in reverse order (so indices don't shift)
  let result = text;
  for (let i = toLink.length - 1; i >= 0; i--) {
    const match = allMatches[toLink[i]];
    const replacement = `[${match.original}](${url})`;
    result = result.slice(0, match.index) + replacement + result.slice(match.index + match.length);
  }

  return result;
}

/** Pick N evenly-spaced indices from 0..total-1 */
function selectEvenlySpaced(total: number, pick: number): number[] {
  if (pick >= total) return Array.from({ length: total }, (_, i) => i);
  if (pick === 1) return [Math.floor(total / 2)]; // middle one
  const indices: number[] = [];
  const step = (total - 1) / (pick - 1);
  for (let i = 0; i < pick; i++) {
    indices.push(Math.round(i * step));
  }
  return indices;
}

/**
 * BlogAutoLinker — scans markdown for brand/category/tag names,
 * lets the user choose how many to link (evenly distributed), then applies.
 */
export default function BlogAutoLinker({ content, entities, onApply }: BlogAutoLinkerProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [applied, setApplied] = useState(false);

  // Scan content for entity name matches
  useEffect(() => {
    if (!content || entities.length === 0) { setMatches([]); return; }
    setApplied(false);

    const found: Match[] = [];
    for (const entity of entities) {
      if (entity.name.length < 3) continue;
      const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!\\[)\\b${escaped}\\b(?![\\]\\(])`, 'gi');
      const occurrences = (content.match(regex) || []).length;
      if (occurrences > 0) {
        found.push({
          entity,
          count: occurrences,
          linkQty: suggestQty(occurrences, content.length),
          linked: false,
          dismissed: false,
        });
      }
    }

    const typeOrder = { brand: 0, category: 1, tag: 2 };
    found.sort((a, b) => typeOrder[a.entity.type] - typeOrder[b.entity.type] || b.count - a.count);
    setMatches(found);
  }, [content, entities]);

  const linkedCount = matches.filter(m => m.linked).length;
  const totalLinksToApply = matches.filter(m => m.linked).reduce((sum, m) => sum + m.linkQty, 0);

  const toggleLink = (idx: number) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, linked: !m.linked, dismissed: false } : m));
  };

  const dismiss = (idx: number) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, dismissed: true, linked: false } : m));
  };

  const setQty = (idx: number, qty: number) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, linkQty: Math.max(1, Math.min(qty, m.count)) } : m));
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

    // Apply each entity's links (process longer names first to avoid partial replacements)
    const sorted = [...toLink].sort((a, b) => b.entity.name.length - a.entity.name.length);
    for (const match of sorted) {
      result = applyEvenLinks(result, match.entity.name, match.entity.url, match.linkQty);
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
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
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
                textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
              }}>
                {t.icon} {m.entity.type}
              </span>

              {/* Name + count */}
              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: '#111', minWidth: 0 }}>
                {m.entity.name}
                <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#9ca3af', marginLeft: 6 }}>
                  ({m.count} {m.count === 1 ? 'mention' : 'mentions'})
                </span>
              </span>

              {/* Qty selector — how many to link */}
              {m.linked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  <button type="button" onClick={() => setQty(idx, m.linkQty - 1)}
                    disabled={m.linkQty <= 1}
                    style={{
                      width: 22, height: 22, borderRadius: 4, border: '1px solid #d1d5db',
                      background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.82rem',
                      cursor: m.linkQty <= 1 ? 'not-allowed' : 'pointer', opacity: m.linkQty <= 1 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>−</button>
                  <span style={{
                    minWidth: 36, textAlign: 'center', fontSize: '0.78rem', fontWeight: 700,
                    color: '#0f766e', background: '#f0fdfa', border: '1px solid #99f6e4',
                    borderRadius: 4, padding: '2px 6px',
                  }}>
                    {m.linkQty}/{m.count}
                  </span>
                  <button type="button" onClick={() => setQty(idx, m.linkQty + 1)}
                    disabled={m.linkQty >= m.count}
                    style={{
                      width: 22, height: 22, borderRadius: 4, border: '1px solid #d1d5db',
                      background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.82rem',
                      cursor: m.linkQty >= m.count ? 'not-allowed' : 'pointer', opacity: m.linkQty >= m.count ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>+</button>
                </div>
              )}

              {/* URL preview */}
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {m.entity.url}
              </span>

              {/* Actions */}
              <button type="button" onClick={() => toggleLink(idx)}
                style={{
                  padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6,
                  border: m.linked ? '1px solid #86efac' : '1px solid #99f6e4',
                  background: m.linked ? '#dcfce7' : '#f0fdfa',
                  color: m.linked ? '#166534' : '#0f766e',
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                }}>
                {m.linked ? '✓ Linked' : '🔗 Link'}
              </button>
              <button type="button" onClick={() => dismiss(idx)}
                style={{
                  padding: '0.3rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6,
                  border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af',
                  cursor: 'pointer', flexShrink: 0,
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
            {applied
              ? '✓ Links applied!'
              : `${totalLinksToApply} link${totalLinksToApply > 1 ? 's' : ''} across ${linkedCount} entit${linkedCount > 1 ? 'ies' : 'y'} — evenly distributed`}
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

      {/* Help text */}
      <div style={{
        padding: '0.5rem 1rem', background: '#fafafa', borderTop: '1px solid #f3f4f6',
        fontSize: '0.72rem', color: '#9ca3af', lineHeight: 1.5,
      }}>
        💡 Click <strong>🔗 Link</strong> to enable linking, then use <strong>−/+</strong> to choose how many mentions to link. Links are spread evenly across the blog for natural SEO distribution.
      </div>
    </div>
  );
}
