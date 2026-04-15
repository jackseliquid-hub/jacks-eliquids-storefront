'use client';

import { useState } from 'react';
import type { AiGenerateType } from '@/lib/ai-prompts';

interface AiGenerateButtonProps {
  type: AiGenerateType;
  context: Record<string, string>;
  onGenerated: (content: string) => void;
  hasContent?: boolean;
}

export default function AiGenerateButton({
  type,
  context,
  onGenerated,
  hasContent = false,
}: AiGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Generation failed');
      }

      onGenerated(data.content);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.7rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          border: '1px solid #d2d2d7',
          borderRadius: '6px',
          background: loading
            ? 'linear-gradient(135deg, #e8e0f0, #dce8f0)'
            : 'linear-gradient(135deg, #f3e8ff, #e0f2fe)',
          color: '#7c3aed',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block', width: 12, height: 12,
              border: '2px solid #c4b5fd', borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Generating…
          </>
        ) : (
          <>✨ {hasContent ? 'Rewrite with AI' : 'Generate with AI'}</>
        )}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
