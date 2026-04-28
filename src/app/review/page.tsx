'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from '../home.module.css';

export default function ReviewPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name/email if logged in
  useEffect(() => {
    async function prefill() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data: customer } = await supabase
          .from('customers')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        if (customer) {
          setName(`${customer.first_name || ''} ${customer.last_name || ''}`.trim());
        }
      }
    }
    prefill();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!reviewText.trim()) { setError('Please write your review.'); return; }
    if (reviewText.trim().length < 10) { setError('Please write at least a few words.'); return; }

    setSubmitting(true);
    try {
      // Submit to API route (handles DB insert + admin notification)
      const res = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_email: email.trim(),
          rating,
          review_text: reviewText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <main className={styles.main}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
        padding: 'clamp(3rem, 8vw, 5rem) 1rem clamp(2rem, 5vw, 3rem)',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
          fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em',
        }}>
          Leave a Review ⭐
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)',
          maxWidth: 520, margin: '0 auto',
        }}>
          Your feedback helps other vapers find quality products and helps us improve.
          We truly appreciate every review.
        </p>
      </section>

      <section className="container" style={{ maxWidth: 580, padding: '2rem 1rem 4rem' }}>
        {submitted ? (
          <div style={{
            textAlign: 'center', padding: '3rem 1.5rem',
            background: '#f0fdfa', borderRadius: 16,
            border: '1px solid #ccfbf1',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', margin: '0 0 0.5rem' }}>
              Thank You, {name.split(' ')[0]}!
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Your review has been submitted and will appear on our site once approved.
              We really appreciate you taking the time!
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                color: '#fff', padding: '0.7rem 2rem',
                borderRadius: 10, fontWeight: 700, fontSize: '0.92rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(15,118,110,0.3)',
              }}
            >
              Back to Shop
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #e5e7eb', padding: '1.75rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            {/* Star rating */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block', fontWeight: 700, fontSize: '0.95rem',
                color: '#111', marginBottom: '0.65rem',
              }}>
                How would you rate your experience?
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                {[1,2,3,4,5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '0.15rem', transition: 'transform 0.15s',
                      transform: (hoverRating >= s || rating >= s) ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill={s <= displayRating ? '#FBBC04' : '#e5e7eb'}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </button>
                ))}
              </div>
              {displayRating > 0 && (
                <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.35rem' }}>
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][displayRating]}
                </div>
              )}
            </div>

            {/* Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={labelStyle}>Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  style={inputStyle}
                  required
                />
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 3 }}>
                  Not displayed publicly
                </div>
              </div>
            </div>

            {/* Review text */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Your Review</label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Tell us about your experience with Jack's E-Liquid..."
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: 120,
                  lineHeight: 1.5,
                }}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.65rem 0.85rem', borderRadius: 8,
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#991b1b', fontSize: '0.85rem', fontWeight: 600,
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: submitting
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #0f766e, #0d9488)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '0.8rem', fontWeight: 700, fontSize: '1rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(15,118,110,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {submitting ? 'Submitting...' : '⭐ Submit Review'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '0.85rem',
  color: '#374151', marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem',
  border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: '0.9rem', color: '#111',
  outline: 'none', transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};
