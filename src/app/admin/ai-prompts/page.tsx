'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

interface Prompt {
  key: string;
  label: string;
  system: string;
  userTemplate: string;
  isOverridden: boolean;
  defaultSystem: string;
  defaultUserTemplate: string;
}

const PROMPT_INFO: Record<string, { icon: string; description: string }> = {
  product_short: {
    icon: '📝',
    description: 'Short product description (60–100 words). Used on the product page beneath the title.',
  },
  product_long: {
    icon: '📄',
    description: 'Long narrative product description (300–500 words). Used in the "About this product" section.',
  },
  blog: {
    icon: '📰',
    description: 'Full blog article (1500+ words) written in Nick Porter\'s conversational British voice.',
  },
  page: {
    icon: '🌐',
    description: 'Standard website page content (About Us, Shipping, FAQs, etc.)',
  },
  seo_meta: {
    icon: '🔍',
    description: 'SEO meta title, description, and focus keyword. Returns JSON consumed automatically.',
  },
};

export default function AiPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ system: string; userTemplate: string }>({ system: '', userTemplate: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch('/api/admin/ai-prompts')
      .then(r => r.json())
      .then(data => {
        setPrompts(data.prompts || []);
        setLoading(false);
      })
      .catch(() => {
        showToast('Failed to load prompts', false);
        setLoading(false);
      });
  }, []);

  function startEdit(p: Prompt) {
    setEditing(p.key);
    setEditData({ system: p.system, userTemplate: p.userTemplate });
    setTimeout(() => {
      document.getElementById(`editor-${p.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function cancelEdit() { setEditing(null); }

  async function save(key: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, system: editData.system, userTemplate: editData.userTemplate }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Save failed', false);
      } else {
        setPrompts(prev => prev.map(p => p.key === key
          ? { ...p, system: editData.system, userTemplate: editData.userTemplate, isOverridden: true }
          : p
        ));
        setEditing(null);
        showToast('Prompt saved ✓');
      }
    } catch (err: any) {
      showToast(err.message || 'Save failed', false);
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault(key: string) {
    if (!confirm('Reset this prompt back to the original coded default? Your edits will be lost.')) return;
    try {
      await fetch('/api/admin/ai-prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const p = prompts.find(x => x.key === key)!;
      setPrompts(prev => prev.map(x => x.key === key
        ? { ...x, system: x.defaultSystem, userTemplate: x.defaultUserTemplate, isOverridden: false }
        : x
      ));
      if (editing === key) {
        setEditData({ system: p.defaultSystem, userTemplate: p.defaultUserTemplate });
      }
      showToast('Reset to default ✓');
    } catch (err: any) {
      showToast(err.message, false);
    }
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🤖 AI Prompts</h1>
          <p className={styles.subtitle}>
            Fine-tune how Gemini writes your content. Changes save to the database and take effect immediately — no redeploy needed.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: 10,
          background: toast.ok ? '#d1fae5' : '#fee2e2',
          color: toast.ok ? '#065f46' : '#991b1b',
          fontWeight: 600, fontSize: '0.88rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          transition: 'opacity 0.3s',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '2rem 2.5rem' }}>

        {/* Info banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)',
          border: '1px solid #a7f3d0', borderRadius: 12,
          padding: '1rem 1.25rem', marginBottom: '1.75rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
          <div style={{ fontSize: '0.85rem', color: '#065f46', lineHeight: 1.6 }}>
            <strong>How this works:</strong> Each prompt has two parts —
            a <strong>System Prompt</strong> (the AI&apos;s role and strict rules) and
            a <strong>User Template</strong> (the message sent with each request).
            Variables like <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3, fontSize: '0.8em' }}>{'${ctx.name}'}</code> and
            {' '}<code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3, fontSize: '0.8em' }}>{'${ctx.brand}'}</code> are
            automatically filled in when the AI runs. Edits are saved to the database — you can always reset to the original.
          </div>
        </div>


        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            Loading prompts…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {prompts.map(p => {
              const info = PROMPT_INFO[p.key] || { icon: '🤖', description: '' };
              const isEditing = editing === p.key;

              return (
                <div
                  key={p.key}
                  id={`editor-${p.key}`}
                  className={styles.card}
                  style={{
                    border: isEditing ? '2px solid #0f766e' : '1px solid #e5e7eb',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Card header */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '1.1rem 1.5rem', gap: '1rem',
                    borderBottom: isEditing ? '1px solid #e5e7eb' : 'none',
                  }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: 2 }}>{info.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>{p.label}</span>
                          {p.isOverridden && (
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                              background: '#dbeafe', color: '#1d4ed8',
                              padding: '1px 7px', borderRadius: 9999,
                            }}>
                              Customised
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{info.description}</div>
                        {!isEditing && (
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>
                            System: {wordCount(p.system)} words &nbsp;·&nbsp; Template: {wordCount(p.userTemplate)} words
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {isEditing ? (
                        <>
                          {p.isOverridden && (
                            <button
                              onClick={() => resetToDefault(p.key)}
                              style={{
                                background: '#fff7ed', color: '#b45309',
                                border: '1px solid #fcd34d', borderRadius: 8,
                                padding: '0.45rem 0.9rem', fontWeight: 600,
                                fontSize: '0.82rem', cursor: 'pointer',
                              }}
                            >
                              ↩ Reset Default
                            </button>
                          )}
                          <button
                            onClick={() => save(p.key)}
                            disabled={saving}
                            style={{
                              background: 'linear-gradient(135deg,#0f766e,#0d9488)',
                              color: '#fff', border: 'none', borderRadius: 8,
                              padding: '0.5rem 1.25rem', fontWeight: 700,
                              fontSize: '0.85rem', cursor: 'pointer',
                              opacity: saving ? 0.7 : 1,
                            }}
                          >
                            {saving ? 'Saving…' : '💾 Save Changes'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              background: '#f3f4f6', color: '#4b5563',
                              border: '1px solid #e5e7eb', borderRadius: 8,
                              padding: '0.5rem 1rem', fontWeight: 600,
                              fontSize: '0.85rem', cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {p.isOverridden && (
                            <button
                              onClick={() => resetToDefault(p.key)}
                              style={{
                                background: '#fff7ed', color: '#b45309',
                                border: '1px solid #fcd34d', borderRadius: 8,
                                padding: '0.4rem 0.85rem', fontWeight: 600,
                                fontSize: '0.78rem', cursor: 'pointer',
                              }}
                            >
                              ↩ Reset
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(p)}
                            style={{
                              background: '#fff', color: '#0f766e',
                              border: '1.5px solid #0f766e', borderRadius: 8,
                              padding: '0.45rem 1.1rem', fontWeight: 700,
                              fontSize: '0.85rem', cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfa')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                          >
                            ✏️ Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Editor */}
                  {isEditing && (
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                      {/* System prompt */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            System Prompt
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{wordCount(editData.system)} words</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem' }}>
                          Defines the AI&apos;s role, personality, and hard rules. Be firm and specific — the AI follows these strictly.
                        </p>
                        <textarea
                          value={editData.system}
                          onChange={e => setEditData(d => ({ ...d, system: e.target.value }))}
                          rows={14}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: '0.8rem', lineHeight: 1.65,
                            padding: '0.8rem 1rem', borderRadius: 8,
                            border: '1.5px solid #d1d5db', outline: 'none',
                            resize: 'vertical', background: '#fafafa', color: '#111',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = '#0f766e')}
                          onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                        />
                      </div>

                      {/* User template */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            User Template
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{wordCount(editData.userTemplate)} words</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem' }}>
                          The message sent with each request. Use{' '}
                          <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'${ctx.name}'}</code>{', '}
                          <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'${ctx.brand}'}</code>{', '}
                          <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'${ctx.category}'}</code>{', '}
                          <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'${ctx.price}'}</code>{' and '}
                          <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'${ctx.existingContent}'}</code>{' '}
                          — these are filled in automatically.
                        </p>
                        <textarea
                          value={editData.userTemplate}
                          onChange={e => setEditData(d => ({ ...d, userTemplate: e.target.value }))}
                          rows={9}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontSize: '0.8rem', lineHeight: 1.65,
                            padding: '0.8rem 1rem', borderRadius: 8,
                            border: '1.5px solid #d1d5db', outline: 'none',
                            resize: 'vertical', background: '#fafafa', color: '#111',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = '#0f766e')}
                          onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                        />
                      </div>

                      {/* Compare with default */}
                      {p.isOverridden && (
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, userSelect: 'none', listStyle: 'none' }}>
                            📋 Compare with original default
                          </summary>
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Original System Prompt</div>
                              <pre style={{ fontSize: '0.74rem', color: '#374151', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', lineHeight: 1.5, maxHeight: 200, overflow: 'auto' }}>{p.defaultSystem}</pre>
                            </div>
                            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Original User Template</div>
                              <pre style={{ fontSize: '0.74rem', color: '#374151', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', lineHeight: 1.5, maxHeight: 160, overflow: 'auto' }}>{p.defaultUserTemplate}</pre>
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Collapsed preview (not editing) */}
                  {!isEditing && (
                    <div style={{ padding: '0 1.5rem 1rem' }}>
                      <details>
                        <summary style={{ fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>
                          👁 Preview system prompt
                        </summary>
                        <div style={{ marginTop: '0.6rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem' }}>
                          <pre style={{ fontSize: '0.72rem', color: '#374151', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', lineHeight: 1.5, maxHeight: 200, overflow: 'auto' }}>
                            {p.system.slice(0, 800)}{p.system.length > 800 ? '\n…' : ''}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
