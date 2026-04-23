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
  height_px: number;
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

  useEffect(() => {
    if (active.length <= 1 || isPaused) return;
    timerRef.current = setTimeout(next, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, isPaused, next, active.length]);

  if (active.length === 0) return null;

  const slide = active[current];
  const isLight = slide.text_color === 'light';
  // Use the current slide's height, falling back to 380px
  const bannerHeight = slide.height_px || 380;

  return (
    <div
      className="container"
      style={{ padding: 0, marginBottom: 0 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fixed-height outer box — images never push this */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: bannerHeight,
          overflow: 'hidden',
          borderRadius: 16,
          userSelect: 'none',
        }}
      >
        {/* Slide background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: slide.bg_color,
            transition: 'opacity 0.3s ease',
            opacity: animating ? 0 : 1,
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: isLight
              ? 'radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.12) 0%, transparent 55%)'
              : 'radial-gradient(ellipse at 25% 50%, rgba(0,0,0,0.06) 0%, transparent 55%)',
          }} />

          {/* Text content — left 55% */}
          <div style={{
            flex: '0 0 55%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(1.25rem, 4vw, 3rem) clamp(1.5rem, 4vw, 3.5rem)',
            zIndex: 2,
          }}>
            {slide.badge_text && (
              <span style={{
                display: 'inline-block',
                background: isLight ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.1)',
                color: isLight ? '#fff' : '#1f2937',
                borderRadius: 9999,
                padding: '0.2rem 0.85rem',
                fontSize: 'clamp(0.62rem, 1vw, 0.74rem)',
                fontWeight: 800,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
                alignSelf: 'flex-start',
                border: isLight ? '1px solid rgba(255,255,255,0.32)' : '1px solid rgba(0,0,0,0.14)',
              }}>
                {slide.badge_text}
              </span>
            )}

            <h2 style={{
              fontSize: 'clamp(1.25rem, 3vw, 2.5rem)',
              fontWeight: 800,
              color: isLight ? '#ffffff' : '#111827',
              lineHeight: 1.15,
              margin: '0 0 0.55rem',
              letterSpacing: '-0.02em',
            }}>
              {slide.title}
            </h2>

            {slide.subtitle && (
              <p style={{
                fontSize: 'clamp(0.8rem, 1.4vw, 1rem)',
                color: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.65)',
                margin: '0 0 1.25rem',
                lineHeight: 1.5,
                maxWidth: '34ch',
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
                    padding: 'clamp(0.5rem, 1vw, 0.7rem) clamp(1rem, 2vw, 1.6rem)',
                    borderRadius: 9999,
                    fontWeight: 700,
                    fontSize: 'clamp(0.78rem, 1.1vw, 0.9rem)',
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
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Image — right 45%, always fills the box */}
          <div style={{
            flex: '0 0 45%',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {slide.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image_url}
                alt={slide.title}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                }}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.1, fontSize: '5rem',
              }}>🛒</div>
            )}
            {/* Left-edge fade so text reads over image */}
            <div style={{
              position: 'absolute', left: 0, top: 0, width: '50%', height: '100%',
              background: `linear-gradient(to right, ${slide.bg_color}, transparent)`,
              pointerEvents: 'none',
            }} />
          </div>

          {/* Prev / Next arrows */}
          {active.length > 1 && (
            <>
              <button onClick={prev} aria-label="Previous" style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.32)',
                borderRadius: '50%', width: 34, height: 34, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, color: isLight ? '#fff' : '#111',
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button onClick={next} aria-label="Next" style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.32)',
                borderRadius: '50%', width: 34, height: 34, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, color: isLight ? '#fff' : '#111',
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dot nav */}
        {active.length > 1 && (
          <div style={{
            position: 'absolute', bottom: '0.75rem', left: '50%',
            transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem', zIndex: 10,
          }}>
            {active.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Banner ${i + 1}`}
                style={{
                  width: i === current ? 20 : 7, height: 7,
                  borderRadius: 9999, padding: 0, border: 'none',
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {active.length > 1 && !isPaused && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'rgba(255,255,255,0.15)', zIndex: 10,
          }}>
            <div
              key={`${current}-prog`}
              style={{
                height: '100%',
                background: 'rgba(255,255,255,0.55)',
                animation: 'bprog 5s linear forwards',
              }}
            />
          </div>
        )}
      </div>

      <style>{`@keyframes bprog { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
