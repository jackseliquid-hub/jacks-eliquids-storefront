'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('customer_reviews')
          .select('id, customer_name, rating, review_text, created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(20);

        if (data && data.length > 0) setReviews(data);
      } catch {
        // Silently fail
      }
    }
    load();
  }, []);

  if (reviews.length === 0) return null;

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const totalReviews = reviews.length;

  function scrollCarousel(dir: 'left' | 'right') {
    if (!scrollRef.current) return;
    const offset = dir === 'right' ? 320 : -320;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
  }

  return (
    <section style={{
      padding: '2rem 0 2.5rem',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 50%, #f0fdf4 100%)',
      borderTop: '1px solid rgba(15,118,110,0.08)',
    }}>
      <div className="container" style={{ padding: '0 1rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '0.5rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>⭐</span>
            <span style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.02em',
            }}>
              What Our Customers Say
            </span>
          </div>

          {/* Star rating summary */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem', marginBottom: '0.25rem',
          }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111' }}>{avgRating}</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="20" height="20" viewBox="0 0 24 24" fill={s <= Math.round(Number(avgRating)) ? '#FBBC04' : '#e5e7eb'}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Reviews carousel */}
        <div style={{ position: 'relative' }}>
          {reviews.length > 3 && (
            <>
              <button
                onClick={() => scrollCarousel('left')}
                aria-label="Previous reviews"
                style={{
                  position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 5, width: 36, height: 36, borderRadius: '50%',
                  background: '#fff', border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                aria-label="Next reviews"
                style={{
                  position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 5, width: 36, height: 36, borderRadius: '50%',
                  background: '#fff', border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </>
          )}

          <div
            ref={scrollRef}
            className="customer-reviews-scroll"
            style={{
              display: 'flex', gap: '1rem',
              overflowX: 'auto', scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              padding: '0.25rem 0',
            }}
          >
            <style>{`
              .customer-reviews-scroll::-webkit-scrollbar { display: none; }
            `}</style>

            {reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  flex: '0 0 300px',
                  scrollSnapAlign: 'start',
                  background: '#fff',
                  borderRadius: 14,
                  padding: '1.25rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* Reviewer info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                    flexShrink: 0,
                  }}>
                    {review.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111' }}>
                      {review.customer_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                      {timeAgo(review.created_at)}
                    </div>
                  </div>
                  {/* Verified badge */}
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, color: '#0f766e',
                    background: '#f0fdfa', border: '1px solid #ccfbf1',
                    padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                  }}>✓ Verified</span>
                </div>

                {/* Stars */}
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= review.rating ? '#FBBC04' : '#e5e7eb'}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>

                {/* Review text */}
                <p style={{
                  fontSize: '0.85rem', color: '#374151',
                  lineHeight: 1.55, margin: 0, flex: 1,
                }}>
                  &ldquo;{review.review_text}&rdquo;
                </p>

                {/* Badge */}
                <div style={{
                  fontSize: '0.68rem', color: '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  <span>💚</span>
                  Jack&apos;s E-Liquid Customer
                </div>
              </div>
            ))}

            {/* Leave a review card */}
            <Link
              href="/review"
              style={{
                flex: '0 0 260px',
                scrollSnapAlign: 'start',
                background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                borderRadius: 14,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 14px rgba(15,118,110,0.2)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,118,110,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,118,110,0.2)';
              }}
            >
              <span style={{ fontSize: '2rem' }}>⭐</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>
                Share Your Experience
              </span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', textAlign: 'center' }}>
                We&apos;d love to hear from you!
              </span>
              <span style={{
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                padding: '0.45rem 1.25rem', borderRadius: 8,
                fontWeight: 600, fontSize: '0.85rem',
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                Leave a Review →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
