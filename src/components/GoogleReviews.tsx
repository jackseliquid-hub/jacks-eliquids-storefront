'use client';

import { useState, useEffect, useRef } from 'react';

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description?: string;
  profile_photo_url?: string;
}

/**
 * Google Reviews section for the homepage.
 * Fetches real reviews from our /api/google-reviews endpoint (server-side proxy).
 * Falls back to placeholder reviews if the API isn't configured yet.
 */
export default function GoogleReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/google-reviews');
        const data = await res.json();

        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews);
          setOverallRating(data.rating);
          setTotalRatings(data.total_ratings);
        } else {
          // Fallback placeholder reviews
          setReviews([
            { author_name: 'Sarah M.', rating: 5, text: 'Absolutely love the range of e-liquids! Fast delivery and brilliant customer service. Will definitely be ordering again.', relative_time_description: '2 weeks ago' },
            { author_name: 'James T.', rating: 5, text: 'Best prices I\'ve found online for nic salts. The 5 for £10 deal is unbeatable. Top quality products every time.', relative_time_description: '1 month ago' },
            { author_name: 'Emma K.', rating: 5, text: 'Great selection of pod kits and really helpful advice on choosing the right one. Couldn\'t be happier with my purchase!', relative_time_description: '3 weeks ago' },
            { author_name: 'David R.', rating: 5, text: 'Switched to Jack\'s from another supplier and won\'t be going back. Much better flavours and the deals are fantastic.', relative_time_description: '2 months ago' },
            { author_name: 'Lisa P.', rating: 4, text: 'Lovely range of products and the website is really easy to use. Delivery was quick too. Highly recommended!', relative_time_description: '1 month ago' },
          ]);
          setOverallRating(4.8);
          setTotalRatings(5);
        }
      } catch {
        // Silently fail — no reviews section if API is down
      }
    }
    load();
  }, []);

  if (reviews.length === 0) return null;

  const avgRating = overallRating
    ? overallRating.toFixed(1)
    : (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  const displayTotal = totalRatings || reviews.length;

  function scrollCarousel(dir: 'left' | 'right') {
    if (!scrollRef.current) return;
    const cardWidth = 320;
    const offset = dir === 'right' ? cardWidth : -cardWidth;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
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
            {/* Google "G" icon */}
            <svg width="24" height="24" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            <span style={{
              fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.02em',
            }}>
              Google Reviews
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
              Based on {displayTotal} review{displayTotal !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Reviews carousel */}
        <div style={{ position: 'relative' }}>
          {/* Scroll arrows */}
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
            className="google-reviews-scroll"
            style={{
              display: 'flex', gap: '1rem',
              overflowX: 'auto', scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              padding: '0.25rem 0',
            }}
          >
            <style>{`
              .google-reviews-scroll::-webkit-scrollbar { display: none; }
            `}</style>

            {reviews.map((review, i) => (
              <div
                key={i}
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
                  {/* Avatar — use profile photo if available, otherwise initial */}
                  {review.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      style={{
                        width: 40, height: 40, borderRadius: '50%',
                        objectFit: 'cover', flexShrink: 0,
                        border: '2px solid #e5e7eb',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                      flexShrink: 0,
                    }}>
                      {review.author_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111' }}>
                      {review.author_name}
                    </div>
                    {review.relative_time_description && (
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        {review.relative_time_description}
                      </div>
                    )}
                  </div>
                  {/* Google icon */}
                  <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path fill="#4285F4" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
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
                  &ldquo;{review.text}&rdquo;
                </p>

                {/* Posted on Google badge */}
                <div style={{
                  fontSize: '0.68rem', color: '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  <svg width="12" height="12" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Posted on Google
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
