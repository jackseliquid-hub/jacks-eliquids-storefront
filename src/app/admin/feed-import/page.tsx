'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ImportLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  products_added: number;
  products_updated: number;
  products_skipped: number;
  variations_updated: number;
  errors: { sku: string; error: string }[];
  summary: string | null;
}

export default function FeedImportPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [newSkusList, setNewSkusList] = useState<string[]>([]);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from('import_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(30);
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  async function runImport(dryRun = false) {
    const action = dryRun ? 'dry run' : 'import';
    setImporting(true);
    setResult(null);
    setNewSkusList([]);

    try {
      const res = await fetch(`/api/feed-import?manual=true${dryRun ? '&dryRun=true' : ''}`);
      const text = await res.text();

      if (!text) {
        setResult(`❌ Server returned an empty response (HTTP ${res.status}). The function likely timed out — the feed may be too large to process in one go.`);
        setImporting(false);
        return;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        setResult(`❌ Server error (HTTP ${res.status}): ${text.substring(0, 300)}`);
        setImporting(false);
        return;
      }

      if (json.success) {
        if (dryRun) {
          setResult(`🔍 DRY RUN complete: Would add ${json.productsAdded} new products, update ${json.productsUpdated}, skip ${json.productsSkipped} (unchanged)`);
          if (json.newSkus && json.newSkus.length > 0) {
            setNewSkusList(json.newSkus);
          }
        } else {
          setResult(`✅ Import complete: ${json.productsAdded} added, ${json.productsUpdated} updated, ${json.productsSkipped} skipped`);
        }
      } else {
        setResult(`❌ ${action} failed: ${json.error}`);
      }
    } catch (err: any) {
      setResult(`❌ Network error: ${err.message}`);
    }

    setImporting(false);
    if (!dryRun) loadLogs();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/London',
    });
  }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 14, padding: '1.5rem',
    border: '1px solid #e5e7eb', marginBottom: '1.5rem',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', margin: 0 }}>📦 Feed Import</h1>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '4px 0 0' }}>
            EQ Wholesale product sync — runs automatically at 4am daily
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => runImport(true)}
            disabled={importing}
            style={{
              background: importing ? '#9ca3af' : '#f0fdfa',
              color: importing ? '#fff' : '#0f766e', border: '2px solid #0f766e', padding: '0.6rem 1.2rem',
              borderRadius: 10, fontWeight: 600, fontSize: '0.85rem',
              cursor: importing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            🔍 Dry Run
          </button>
          <button
            onClick={() => runImport(false)}
            disabled={importing}
            style={{
              background: importing ? '#9ca3af' : 'linear-gradient(135deg, #0d9488, #0f766e)',
              color: '#fff', border: 'none', padding: '0.65rem 1.4rem',
              borderRadius: 10, fontWeight: 600, fontSize: '0.88rem',
              cursor: importing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {importing ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Working...</>
            ) : (
              <>▶ Run Import Now</>
            )}
          </button>
        </div>
      </div>

      {/* ── TEMPORARY: Purge variations for fresh import ── */}
      <div style={{ ...card, background: '#fef2f2', border: '1px solid #fca5a5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '0.9rem' }}>🗑️ Purge Variations (One-Time Reset)</strong>
            <p style={{ fontSize: '0.8rem', color: '#991b1b', margin: '4px 0 0' }}>
              Deletes ALL variations from non-JEL products and clears their attributes.
              After purging, run the import to re-create them from the new split feed. JEL products are safe.
            </p>
          </div>
          {!confirmPurge ? (
            <button
              disabled={fixing}
              onClick={() => setConfirmPurge(true)}
              style={{
                background: fixing ? '#9ca3af' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', border: 'none', padding: '0.6rem 1.2rem',
                borderRadius: 10, fontWeight: 600, fontSize: '0.85rem',
                cursor: fixing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              🗑️ Purge Now
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={fixing}
                onClick={async () => {
                  setFixing(true);
                  setFixResult('⏳ Purging variations... this may take a minute.');
                  setConfirmPurge(false);
                  try {
                    const res = await fetch('/api/fix-variations');
                    const json = await res.json();
                    if (json.success) {
                      setFixResult(`✅ ${json.message}`);
                    } else {
                      setFixResult(`❌ Error: ${json.error}`);
                    }
                  } catch (err: any) {
                    setFixResult(`❌ ${err.message}`);
                  }
                  setFixing(false);
                }}
                style={{
                  background: fixing ? '#9ca3af' : '#dc2626',
                  color: '#fff', border: 'none', padding: '0.6rem 1rem',
                  borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                  cursor: fixing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {fixing ? '⏳ Purging...' : '⚠️ Yes, Purge!'}
              </button>
              <button
                onClick={() => setConfirmPurge(false)}
                style={{
                  background: '#e5e7eb', color: '#374151', border: 'none', padding: '0.6rem 1rem',
                  borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {fixResult && (
          <p style={{ fontSize: '0.85rem', marginTop: 10, fontWeight: 600, color: fixResult.startsWith('✅') ? '#16a34a' : fixResult.startsWith('⏳') ? '#d97706' : '#dc2626', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {fixResult}
          </p>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div style={{
          ...card,
          background: result.startsWith('✅') ? '#f0fdf4' : result.startsWith('🔍') ? '#eff6ff' : '#fef2f2',
          border: `1px solid ${result.startsWith('✅') ? '#86efac' : result.startsWith('🔍') ? '#93c5fd' : '#fca5a5'}`,
          padding: '1rem 1.2rem',
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{result}</p>
          {newSkusList.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid #bfdbfe', paddingTop: '0.75rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#1e40af' }}>New products that would be created as draft:</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#374151', maxHeight: 200, overflowY: 'auto' }}>
                {newSkusList.map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Feed Source', value: 'EQ Wholesale', color: '#0f766e' },
          { label: 'Schedule', value: '4:00 AM UTC', color: '#6366f1' },
          { label: 'New Products', value: 'Saved as Draft', color: '#d97706' },
          { label: 'Existing', value: 'Cost & Qty Only', color: '#059669' },
        ].map(c => (
          <div key={c.label} style={{ ...card, padding: '1rem 1.2rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ ...card, background: '#f9fafb' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>💡 How the import works</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.8 }}>
          <li><strong>SKU Match:</strong> Products are matched by their EQ Wholesale SKU</li>
          <li><strong>Existing products:</strong> Only cost price (ex-VAT), stock quantity, and attributes are updated. Retail price is never touched.</li>
          <li><strong>New products:</strong> Created as <strong>draft</strong> with £0.00 price — you set the retail price before publishing</li>
          <li><strong>Images:</strong> Downloaded, resized (max 800px), converted to WebP, named after the product</li>
          <li><strong>Variations:</strong> Automatically grouped under their parent product</li>
          <li><strong>Email report:</strong> Sent to jackseliquid@gmail.com after each run</li>
        </ul>
      </div>

      {/* Import history */}
      <div style={card}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>📋 Import History</h3>
        {loading ? (
          <p style={{ color: '#9ca3af' }}>Loading...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No imports have been run yet. Click "Run Import Now" to start.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Date', 'Status', 'Added', 'Updated', 'Skipped', 'Vars', 'Errors'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.8rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>{formatDate(log.started_at)}</td>
                    <td style={{ padding: '0.6rem 0.8rem' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                        background: log.status === 'completed' ? '#dcfce7' : log.status === 'running' ? '#fef3c7' : '#fee2e2',
                        color: log.status === 'completed' ? '#166534' : log.status === 'running' ? '#92400e' : '#dc2626',
                      }}>
                        {log.status === 'completed' ? '✅' : log.status === 'running' ? '⏳' : '❌'} {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: log.products_added > 0 ? 700 : 400, color: log.products_added > 0 ? '#0f766e' : '#9ca3af' }}>{log.products_added}</td>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: log.products_updated > 0 ? 700 : 400 }}>{log.products_updated}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: '#9ca3af' }}>{log.products_skipped}</td>
                    <td style={{ padding: '0.6rem 0.8rem' }}>{log.variations_updated}</td>
                    <td style={{ padding: '0.6rem 0.8rem', color: (log.errors?.length ?? 0) > 0 ? '#dc2626' : '#9ca3af' }}>{log.errors?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
