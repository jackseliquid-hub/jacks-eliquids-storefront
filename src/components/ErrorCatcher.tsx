'use client';
import { useEffect, useState } from 'react';

export default function ErrorCatcher() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: any) => {
      setError(e.message || String(e));
      console.error('CAUGHT:', e);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (e) => handleError(e.reason));

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', (e) => handleError(e.reason));
    };
  }, []);

  if (!error) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(255,0,0,0.9)', color: 'white', padding: '20px', fontSize: '20px' }}>
      <h1>Client Error!</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
    </div>
  );
}
