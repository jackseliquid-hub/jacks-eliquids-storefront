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
  shape?: string;     // 'rectangle' | 'circle'
  position?: string;  // 'top' | 'bottom'
}

export default function PromoTiles({ tiles }: { tiles: Tile[] }) {
  // No maximum — show all active tiles, sorted by sort_order
  const active = tiles
    .filter(t => t.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (active.length === 0) return null;

  return (
    <div className="container" style={{ padding: '1.25rem 1rem 0.5rem' }}>
      <div
        className="promo-tiles-wrap"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          margin: '-0.375rem',
        }}
      >
        <style>{`
          /* Desktop: 5 per row */
          .promo-tile-item {
            width: calc(100% / 5 - 0.75rem);
            min-width: 150px;
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
          const isCircle = tile.shape === 'circle';

          if (isCircle) {
            return (
              <div key={tile.id} className="promo-tile-item">
                <Link
                  href={tile.link_url || '/'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textDecoration: 'none',
                    transition: 'transform 0.18s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Circle image */}
                  <div style={{
                    width: '100%',
                    paddingBottom: '100%', // 1:1 aspect ratio
                    borderRadius: '50%',
                    overflow: 'hidden',
                    position: 'relative',
                    background: tile.bg_color,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    border: '3px solid #fff',
                  }}>
                    {tile.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tile.image_url}
                        alt={tile.title}
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center',
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: tile.bg_color,
                      }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 'clamp(1rem, 2vw, 1.4rem)',
                          color: isDark ? '#111' : '#fff',
                        }}>
                          {tile.title.charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Badge — centered banner across circle */}
                    {tile.badge_text && (
                      <span style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(15,118,110,0.9)', color: '#fff',
                        padding: '0.2rem 0.75rem',
                        fontSize: 'clamp(0.58rem, 1vw, 0.72rem)', fontWeight: 800,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        zIndex: 2, whiteSpace: 'nowrap',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 4,
                      }}>
                        {tile.badge_text}
                      </span>
                    )}
                  </div>

                  {/* Title below circle */}
                  <div style={{
                    textAlign: 'center',
                    marginTop: '0.5rem',
                    padding: '0 0.25rem',
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 'clamp(0.72rem, 1.2vw, 0.85rem)',
                      color: '#111827',
                      lineHeight: 1.25,
                    }}>
                      {tile.title}
                    </div>
                    {tile.subtitle && (
                      <div style={{
                        fontSize: 'clamp(0.62rem, 1vw, 0.72rem)',
                        color: '#6b7280',
                        marginTop: 2, lineHeight: 1.3,
                      }}>
                        {tile.subtitle}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          }

          // ── Rectangle tile (default) ──
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
