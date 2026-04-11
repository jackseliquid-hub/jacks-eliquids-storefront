'use client';

import { useState } from 'react';
import { pushToRoyalMail } from './royalMailAction';

interface Props {
  orderId: string;
  existingRmOrderId?: number | null;
}

export default function RoyalMailButton({ orderId, existingRmOrderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [rmId, setRmId] = useState<number | null>(existingRmOrderId ?? null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    const res = await pushToRoyalMail(orderId);
    setLoading(false);
    setResult(res);
    if (res.success && res.rmOrderId) setRmId(res.rmOrderId);
  }

  if (rmId && !result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.875rem',
        }}>
          <span>🏣</span>
          <span style={{ color: '#15803d', fontWeight: 600 }}>
            Sent to Click &amp; Drop — RM #{rmId}
          </span>
          <a
            href="https://auth.parcel.royalmail.com/orders/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0f766e', fontSize: '0.8rem', marginLeft: '4px' }}
          >
            View in Click &amp; Drop ↗
          </a>
        </div>
        <button
          onClick={handleClick}
          disabled={loading}
          style={{
            background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
            padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          Re-push
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: loading ? '#f3f4f6' : '#dc2626',
          color: loading ? '#9ca3af' : '#fff',
          border: 'none', borderRadius: '8px',
          padding: '0.7rem 1.2rem', fontSize: '0.875rem', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          width: '100%', justifyContent: 'center',
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 14, height: 14, border: '2px solid #d1d5db',
              borderTopColor: '#6b7280', borderRadius: '50%',
              animation: 'spin 0.6s linear infinite', display: 'inline-block'
            }} />
            Sending to Royal Mail…
          </>
        ) : (
          <>🏣 Send to Click &amp; Drop</>
        )}
      </button>

      {result && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderRadius: '6px',
          fontSize: '0.82rem',
          fontWeight: 500,
          background: result.success ? '#f0fdf4' : '#fef2f2',
          color: result.success ? '#15803d' : '#b91c1c',
          border: `1px solid ${result.success ? '#86efac' : '#fecaca'}`,
        }}>
          {result.message}
          {result.success && (
            <> — <a
              href="https://auth.parcel.royalmail.com/orders/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0f766e' }}
            >
              Open Click &amp; Drop ↗
            </a></>
          )}
        </div>
      )}
    </div>
  );
}
