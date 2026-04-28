'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

interface Review {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  review_text: string;
  status: 'pending' | 'published';
  created_at: string;
  replied_at: string | null;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{text:string;type:'ok'|'err'}|null>(null);

  async function load() {
    const res = await fetch('/api/admin-reviews');
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function notify(text:string, type:'ok'|'err'='ok') {
    setMsg({text,type});
    setTimeout(()=>setMsg(null),3500);
  }

  async function updateStatus(id: string, status: 'pending' | 'published') {
    const res = await fetch('/api/admin-reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      notify(status === 'published' ? 'Review published ✓' : 'Review unpublished');
      load();
    } else {
      notify('Failed to update status', 'err');
    }
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review permanently?')) return;
    const res = await fetch('/api/admin-reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      notify('Review deleted');
      load();
    } else {
      notify('Failed to delete', 'err');
    }
  }

  const pendingReviews = reviews.filter(r => r.status === 'pending');
  const publishedReviews = reviews.filter(r => r.status === 'published');

  return (
    <div className={styles.pageWrapper}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 className={styles.pageTitle}>Customer Reviews</h1>
          <p style={{fontSize:'0.85rem',color:'#6b7280',margin:'0.25rem 0 0'}}>
            Moderate customer reviews. Only published reviews appear on the site.
          </p>
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <span style={{
            padding:'0.35rem 0.85rem',borderRadius:20,
            background:'#fef3c7',color:'#92400e',fontSize:'0.82rem',fontWeight:700,
          }}>
            {pendingReviews.length} pending
          </span>
          <span style={{
            padding:'0.35rem 0.85rem',borderRadius:20,
            background:'#d1fae5',color:'#065f46',fontSize:'0.82rem',fontWeight:700,
          }}>
            {publishedReviews.length} published
          </span>
        </div>
      </div>

      {msg && (
        <div style={{
          padding:'0.7rem 1rem',borderRadius:8,marginBottom:'1rem',
          background:msg.type==='ok'?'#d1fae5':'#fee2e2',
          color:msg.type==='ok'?'#065f46':'#991b1b',
          fontWeight:600,fontSize:'0.88rem',
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:'3rem',color:'#6b7280'}}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div style={{
          textAlign:'center',padding:'4rem 2rem',
          background:'#f9fafb',borderRadius:14,border:'1px solid #e5e7eb',
          color:'#6b7280',
        }}>
          <div style={{fontSize:'2.5rem',marginBottom:'0.75rem'}}>⭐</div>
          <p style={{fontSize:'1rem',fontWeight:600,color:'#374151',margin:'0 0 0.5rem'}}>No reviews yet</p>
          <p style={{fontSize:'0.85rem',margin:0}}>When customers submit reviews, they&apos;ll appear here for moderation.</p>
        </div>
      ) : (
        <>
          {pendingReviews.length > 0 && (
            <div style={{marginBottom:'2rem'}}>
              <h2 style={{
                fontSize:'0.95rem',fontWeight:700,color:'#92400e',
                marginBottom:'0.75rem',paddingBottom:'0.4rem',
                borderBottom:'2px solid #fde68a',
                display:'flex',alignItems:'center',gap:'0.4rem',
              }}>
                ⏳ Pending Review{pendingReviews.length !== 1 ? 's' : ''}
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                {pendingReviews.map(r => (
                  <ReviewCard key={r.id} review={r} onPublish={() => updateStatus(r.id, 'published')} onDelete={() => deleteReview(r.id)} onNotify={notify} onReload={load} />
                ))}
              </div>
            </div>
          )}

          {publishedReviews.length > 0 && (
            <div>
              <h2 style={{
                fontSize:'0.95rem',fontWeight:700,color:'#065f46',
                marginBottom:'0.75rem',paddingBottom:'0.4rem',
                borderBottom:'2px solid #a7f3d0',
                display:'flex',alignItems:'center',gap:'0.4rem',
              }}>
                ✅ Published Review{publishedReviews.length !== 1 ? 's' : ''}
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                {publishedReviews.map(r => (
                  <ReviewCard key={r.id} review={r} onUnpublish={() => updateStatus(r.id, 'pending')} onDelete={() => deleteReview(r.id)} onNotify={notify} onReload={load} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Review Card with Reply ───────────────────────────────────────────────────

function ReviewCard({
  review,
  onPublish,
  onUnpublish,
  onDelete,
  onNotify,
  onReload,
}: {
  review: Review;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDelete: () => void;
  onNotify: (text: string, type: 'ok' | 'err') => void;
  onReload: () => void;
}) {
  const isPending = review.status === 'pending';
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin-reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: review.id,
          customer_email: review.customer_email,
          customer_name: review.customer_name,
          reply_text: replyText.trim(),
          rating: review.rating,
          review_text: review.review_text,
        }),
      });
      if (res.ok) {
        onNotify(`Reply sent to ${review.customer_name} ✓`, 'ok');
        setReplyOpen(false);
        setReplyText('');
        onReload();
      } else {
        onNotify('Failed to send reply', 'err');
      }
    } catch {
      onNotify('Failed to send reply', 'err');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      background: '#fff', border: `1px solid ${isPending ? '#fde68a' : '#e5e7eb'}`,
      borderRadius: 12, padding: '1rem 1.15rem',
      borderLeft: `4px solid ${isPending ? '#f59e0b' : '#10b981'}`,
    }}>
      {/* Top row */}
      <div style={{display:'flex',alignItems:'center',gap:'0.65rem',marginBottom:'0.5rem'}}>
        <div style={{
          width:36,height:36,borderRadius:'50%',
          background:'linear-gradient(135deg, #0f766e, #0d9488)',
          display:'flex',alignItems:'center',justifyContent:'center',
          color:'#fff',fontWeight:700,fontSize:'0.9rem',flexShrink:0,
        }}>
          {review.customer_name.charAt(0).toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:'0.9rem',color:'#111'}}>{review.customer_name}</div>
          <div style={{fontSize:'0.75rem',color:'#9ca3af'}}>{review.customer_email}</div>
        </div>
        <div style={{display:'flex',gap:'2px'}}>
          {[1,2,3,4,5].map(s => (
            <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= review.rating ? '#FBBC04' : '#e5e7eb'}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.4rem',flexShrink:0}}>
          {review.replied_at && (
            <span style={{
              fontSize:'0.62rem',fontWeight:700,color:'#0f766e',
              background:'#d1fae5',border:'1px solid #a7f3d0',
              padding:'2px 6px',borderRadius:4,
            }}>✓ Replied</span>
          )}
          <span style={{fontSize:'0.72rem',color:'#9ca3af'}}>
            {new Date(review.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
          </span>
        </div>
      </div>

      {/* Review text */}
      <p style={{
        fontSize:'0.88rem',color:'#374151',lineHeight:1.55,
        margin:'0 0 0.75rem',padding:'0.5rem 0.65rem',
        background:'#f9fafb',borderRadius:8,border:'1px solid #f3f4f6',
      }}>
        &ldquo;{review.review_text}&rdquo;
      </p>

      {/* Action buttons */}
      <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
        {onPublish && (
          <button onClick={onPublish} style={{
            padding:'0.4rem 1rem',borderRadius:8,border:'none',cursor:'pointer',
            background:'linear-gradient(135deg, #059669, #10b981)',color:'#fff',
            fontWeight:700,fontSize:'0.82rem',
            boxShadow:'0 2px 8px rgba(5,150,105,0.25)',
          }}>
            ✓ Publish
          </button>
        )}
        {onUnpublish && (
          <button onClick={onUnpublish} style={{
            padding:'0.4rem 1rem',borderRadius:8,border:'1px solid #d1d5db',cursor:'pointer',
            background:'#f9fafb',color:'#374151',
            fontWeight:600,fontSize:'0.82rem',
          }}>
            Unpublish
          </button>
        )}
        <button
          onClick={() => setReplyOpen(!replyOpen)}
          style={{
            padding:'0.4rem 1rem',borderRadius:8,cursor:'pointer',
            background: replyOpen ? '#eff6ff' : '#f0fdfa',
            border: `1px solid ${replyOpen ? '#93c5fd' : '#ccfbf1'}`,
            color: replyOpen ? '#1e40af' : '#0f766e',
            fontWeight:700,fontSize:'0.82rem',
          }}
        >
          💬 Reply
        </button>
        <div style={{flex:1}} />
        <button onClick={onDelete} style={{
          padding:'0.4rem 0.85rem',borderRadius:8,border:'1px solid #fecaca',cursor:'pointer',
          background:'#fff',color:'#dc2626',
          fontWeight:600,fontSize:'0.82rem',
        }}>
          🗑 Delete
        </button>
      </div>

      {/* Reply section */}
      {replyOpen && (
        <div style={{
          marginTop:'0.75rem',padding:'0.85rem',
          background:'#f0f9ff',borderRadius:10,border:'1px solid #bae6fd',
        }}>
          <label style={{display:'block',fontSize:'0.78rem',fontWeight:700,color:'#1e40af',marginBottom:'0.4rem'}}>
            Send a personal reply to {review.customer_name.split(' ')[0]}:
          </label>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={`Hi ${review.customer_name.split(' ')[0]}, thanks so much for taking the time to leave us a review...`}
            rows={3}
            style={{
              width:'100%',padding:'0.55rem 0.7rem',
              border:'1px solid #93c5fd',borderRadius:8,
              fontSize:'0.85rem',color:'#111',resize:'vertical',
              outline:'none',lineHeight:1.5,boxSizing:'border-box',
            }}
          />
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
            <button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              style={{
                padding:'0.4rem 1.1rem',borderRadius:8,border:'none',cursor: sending ? 'not-allowed' : 'pointer',
                background: sending ? '#9ca3af' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color:'#fff',fontWeight:700,fontSize:'0.82rem',
                boxShadow: sending ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
              }}
            >
              {sending ? 'Sending…' : '📧 Send Reply'}
            </button>
            <button
              onClick={() => { setReplyOpen(false); setReplyText(''); }}
              style={{
                padding:'0.4rem 0.85rem',borderRadius:8,border:'1px solid #d1d5db',cursor:'pointer',
                background:'#fff',color:'#374151',fontWeight:600,fontSize:'0.82rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
