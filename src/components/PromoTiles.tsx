'use client';

import Link from 'next/link';

interface Tile {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  bg_color: string;
  text_color: string;
  badge_text: string;
  sort_order: number;
  active: boolean;
}

export default function PromoTiles({ tiles }: { tiles: Tile[] }) {
  // Max 12 active tiles, sorted by sort_order
  const active = tiles
    .filter(t => t.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 12);

  if (active.length === 0) return null;

  return (
    <div className="container" style={{ padding: '1.25rem 1rem 0.5rem' }}>
      {/*
        Flexbox approach:
        - justify-content: center  → partial rows are always centred
        - Each tile is 1/6 wide on desktop (with gap), 1/2 wide on mobile
        - Gap handled via padding on each tile wrapper
      */}
      <div
        className="promo-tiles-wrap"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          margin: '-0.375rem', // negative half-gap to compensate tile padding
        }}
      >
        <style>{`
          /* Desktop: 6 per row max */
          .promo-tile-item {
            width: calc(100% / 6 - 0.75rem);
            min-width: 120px;
            padding: 0.375rem;
            box-sizing: border-box;
          }
          /* Tablet: 3 per row */
          @media (max-width: 900px) {
            .promo-tile-item { width: calc(100% / 3 - 0.75rem); }
          }
          /* Mobile: 2 per row */
          @media (max-width: 540px) {
            .promo-tile-item { width: calc(50% - 0.75rem); }
          }
        `}</style>

        {active.map(tile => {
          const isDark = tile.text_color === 'dark';
          return (
            <div key={tile.id} className="promo-tile-item">
              <Link
                href={tile.link_url || '/'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: tile.image_url ? 'flex-start' : 'center',
                  justifyContent: tile.image_url ? 'flex-end' : 'center',
                  background: tile.bg_color,
                  borderRadius: 14,
                  overflow: 'hidden',
                  minHeight: 120,
                  height: '100%',
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)';
                }}
              >
                {/* Background image */}
                {tile.image_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tile.image_url}
                      alt={tile.title}
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', objectPosition: 'center',
                      }}
                    />
                    {/* Gradient overlay for text legibility */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
                    }} />
                  </>
                )}

                {/* Badge */}
                {tile.badge_text && (
                  <span style={{
                    position: 'absolute', top: 10, left: 10,
                    background: '#0f766e', color: '#fff',
                    borderRadius: 9999, padding: '0.15rem 0.55rem',
                    fontSize: '0.65rem', fontWeight: 800,
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    zIndex: 2,
                  }}>
                    {tile.badge_text}
                  </span>
                )}

                {/* Text */}
                <div style={{
                  position: 'relative', zIndex: 2,
                  padding: tile.image_url ? '0.65rem 0.85rem' : '1rem',
                  textAlign: tile.image_url ? 'left' : 'center',
                  width: '100%',
                }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 'clamp(0.78rem, 1.5vw, 0.92rem)',
                    color: tile.image_url ? '#fff' : (isDark ? '#111' : '#fff'),
                    lineHeight: 1.25,
                  }}>
                    {tile.title}
                  </div>
                  {tile.subtitle && (
                    <div style={{
                      fontSize: 'clamp(0.67rem, 1.1vw, 0.78rem)',
                      color: tile.image_url ? 'rgba(255,255,255,0.8)' : (isDark ? '#4b5563' : 'rgba(255,255,255,0.8)'),
                      marginTop: 2, lineHeight: 1.3,
                    }}>
                      {tile.subtitle}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
