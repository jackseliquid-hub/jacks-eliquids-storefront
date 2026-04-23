'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  cta_url: string;
  image_url: string;
  bg_color: string;
  text_color: string;
  sort_order: number;
  active: boolean;
}

interface Props {
  banners: Banner[];
}

export default function HeroBanner({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = banners.filter(b => b.active).sort((a, b) => a.sort_order - b.sort_order);

  const goTo = useCallback((idx: number) => {
    if (animating || idx === current) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  }, [animating, current]);

  const next = useCallback(() => {
    goTo((current + 1) % active.length);
  }, [current, active.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + active.length) % active.length);
  }, [current, active.length, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (active.length <= 1 || isPaused) return;
    timerRef.current = setTimeout(next, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, isPaused, next, active.length]);

  if (active.length === 0) return null;

  const slide = active[current];
  const isLight = slide.text_color === 'light';

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide */}
      <div
        style={{
          background: slide.bg_color,
          minHeight: 'clamp(220px, 36vw, 460px)',
          display: 'flex',
          alignItems: 'stretch',
          position: 'relative',
          transition: 'opacity 0.3s ease',
          opacity: animating ? 0 : 1,
        }}
      >
        {/* Decorative radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: isLight
            ? 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.10) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 30% 50%, rgba(0,0,0,0.08) 0%, transparent 60%)',
        }} />

        {/* Content side */}
        <div style={{
          flex: '0 0 55%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(1.5rem, 4vw, 3.5rem) clamp(1.5rem, 5vw, 4rem)',
          zIndex: 1,
        }}>
          {slide.badge_text && (
            <span style={{
              display: 'inline-block',
              background: isLight ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)',
              color: isLight ? '#fff' : '#1f2937',
              borderRadius: '9999px',
              padding: '0.2rem 0.9rem',
              fontSize: 'clamp(0.65rem, 1.2vw, 0.78rem)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
              alignSelf: 'flex-start',
              border: isLight ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(0,0,0,0.18)',
            }}>
              {slide.badge_text}
            </span>
          )}

          <h2 style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)',
            fontWeight: 800,
            color: isLight ? '#ffffff' : '#111827',
            lineHeight: 1.15,
            margin: '0 0 0.65rem',
            letterSpacing: '-0.02em',
          }}>
            {slide.title}
          </h2>

          {slide.subtitle && (
            <p style={{
              fontSize: 'clamp(0.85rem, 1.6vw, 1.1rem)',
              color: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.65)',
              margin: '0 0 1.5rem',
              lineHeight: 1.5,
              maxWidth: '36ch',
            }}>
              {slide.subtitle}
            </p>
          )}

          {slide.cta_text && slide.cta_url && (
            <div>
              <Link
                href={slide.cta_url}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: isLight ? '#fff' : '#0f766e',
                  color: isLight ? slide.bg_color : '#fff',
                  padding: 'clamp(0.55rem, 1.2vw, 0.75rem) clamp(1.2rem, 2.5vw, 1.75rem)',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: 'clamp(0.82rem, 1.3vw, 0.95rem)',
                  textDecoration: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.22)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';
                }}
              >
                {slide.cta_text}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Image side */}
        <div style={{
          flex: '0 0 45%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {slide.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.image_url}
              alt={slide.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                transition: 'opacity 0.3s',
              }}
            />
          ) : (
            /* Placeholder pattern when no image is set */
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15,
              fontSize: '6rem',
            }}>
              🛒
            </div>
          )}

          {/* Fade overlay on left edge so text blends */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '40%',
            height: '100%',
            background: `linear-gradient(to right, ${slide.bg_color}, transparent)`,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Prev / Next arrows */}
        {active.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous banner"
              style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s',
                color: isLight ? '#fff' : '#111',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Next banner"
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s',
                color: isLight ? '#fff' : '#111',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dot nav */}
      {active.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '0.85rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.45rem',
          zIndex: 10,
        }}>
          {active.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              style={{
                width: i === current ? 22 : 8,
                height: 8,
                borderRadius: 9999,
                background: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {active.length > 1 && !isPaused && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          width: '100%',
          background: 'rgba(255,255,255,0.15)',
        }}>
          <div
            key={`${current}-progress`}
            style={{
              height: '100%',
              background: 'rgba(255,255,255,0.6)',
              animation: 'bannerProgress 5s linear forwards',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes bannerProgress {
          from { width: 0% }
          to { width: 100% }
        }
        @media (max-width: 640px) {
          /* Stack content on mobile */
          .heroBannerSlide { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}
