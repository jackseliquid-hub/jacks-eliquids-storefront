'use client';
import { useState } from 'react';
import { SeoMeta } from '@/lib/data';

interface SeoEditorCardProps {
  seo: SeoMeta | undefined;
  onChange: (seo: SeoMeta) => void;
  titlePlaceholder?: string;
  descPlaceholder?: string;
  /** Context for AI generation — product name, description, category, etc. */
  aiContext?: Record<string, string>;
}

export default function SeoEditorCard({ seo, onChange, titlePlaceholder, descPlaceholder, aiContext }: SeoEditorCardProps) {
  const metaTitle = seo?.metaTitle || '';
  const metaDescription = seo?.metaDescription || '';
  const keywords = seo?.keywords || '';
  const canonicalUrl = seo?.canonicalUrl || '';
  const ogTitle = seo?.ogTitle || '';
  const ogDescription = seo?.ogDescription || '';
  const noIndex = seo?.noIndex || false;

  const [aiLoading, setAiLoading] = useState(false);
  const [showOg, setShowOg] = useState(!!(ogTitle || ogDescription));

  const update = (field: keyof SeoMeta, value: string | boolean) => {
    onChange({ ...seo, [field]: value });
  };

  const [aiError, setAiError] = useState('');

  async function handleAiGenerate() {
    if (!aiContext?.name) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'seo_meta',
          context: {
            name: aiContext.name,
            category: aiContext.category || '',
            brand: aiContext.brand || '',
            price: aiContext.price || '',
            existingContent: aiContext.description || '',
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setAiError(errData.error || `API error: ${res.status}`);
        return;
      }

      const data = await res.json();
      const rawText = data.content || data.text || '';
      
      if (!rawText) {
        setAiError('AI returned empty response');
        return;
      }

      // Robust JSON extraction: find the first {...} block in the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[SEO AI] Could not find JSON in response:', rawText);
        setAiError('Could not parse AI response');
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.metaTitle && !parsed.metaDescription) {
        setAiError('AI returned no meta data');
        return;
      }

      // Build the canonical URL from slug
      const slug = aiContext.slug || aiContext.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const canonical = `https://jackseliquid.co.uk/product/${slug}`;

      // Single onChange call with all generated fields
      onChange({
        ...seo,
        metaTitle: parsed.metaTitle || seo?.metaTitle || '',
        metaDescription: parsed.metaDescription || seo?.metaDescription || '',
        ogTitle: parsed.metaTitle || seo?.ogTitle || '',
        ogDescription: parsed.metaDescription || seo?.ogDescription || '',
        keywords: parsed.focusKeyword || seo?.keywords || aiContext.name || '',
        canonicalUrl: seo?.canonicalUrl || canonical,
      });
    } catch (err: any) {
      console.error('AI SEO generation failed:', err);
      setAiError(err.message || 'Generation failed');
    } finally {
      setAiLoading(false);
    }
  }

  const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem' };
  const labelStyle = { display: 'block' as const, fontSize: '0.85rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' };
  const hintStyle = (len: number, max: number) => ({ fontSize: '0.75rem', marginTop: '4px', color: len > max ? '#ff3b30' : '#86868b' });

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', background: '#f5f5f7', borderBottom: '1px solid #e5e5e5', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>SEO Settings</span>
        {aiContext?.name && (
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: aiLoading ? 'wait' : 'pointer',
              opacity: aiLoading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {aiLoading ? '⏳ Generating…' : '✨ Auto-Generate with AI'}
          </button>
        )}
      </div>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' as const, gap: '1.25rem' }}>

        {/* AI Error Feedback */}
        {aiError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 1rem', color: '#dc2626', fontSize: '0.85rem' }}>
            ⚠️ {aiError}
          </div>
        )}        
        {/* Snippet Preview */}
        <div style={{ background: '#f5f5f7', padding: '1rem', borderRadius: '8px', border: '1px solid #d2d2d7' }}>
            <div style={{ fontSize: '0.8rem', color: '#545454', marginBottom: '4px' }}>Google Snippet Preview</div>
            <div style={{ fontSize: '1.2rem', color: '#1a0dab', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {metaTitle || titlePlaceholder || 'Your Page Title'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#006621', margin: '2px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {canonicalUrl || 'jackseliquid.co.uk/product/example'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#545454' }}>
               {metaDescription || descPlaceholder || 'Please provide a meta description. This helps search engines understand what your page is about.'}
            </div>
        </div>

        <div>
          <label style={labelStyle}>Meta Title</label>
          <input
            style={inputStyle}
            value={metaTitle}
            onChange={e => update('metaTitle', e.target.value)}
            placeholder={titlePlaceholder || 'e.g. Cherry Ice Nic Salt | Jacks E-Liquid'}
          />
          <div style={hintStyle(metaTitle.length, 60)}>
            {metaTitle.length}/60 characters (recommended)
          </div>
        </div>

        <div>
          <label style={labelStyle}>Meta Description</label>
          <textarea
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' as const }}
            rows={3}
            value={metaDescription}
            onChange={e => update('metaDescription', e.target.value)}
            placeholder={descPlaceholder || 'Write a compelling description for this page.'}
          />
          <div style={hintStyle(metaDescription.length, 160)}>
            {metaDescription.length}/160 characters (recommended)
          </div>
        </div>

        <div>
          <label style={labelStyle}>Focus Keyword</label>
          <input
            style={inputStyle}
            value={keywords}
            onChange={e => update('keywords', e.target.value)}
            placeholder="e.g. cherry ice vape, cheap nic salt"
          />
        </div>

        <div>
          <label style={labelStyle}>Canonical URL</label>
          <input
            style={inputStyle}
            value={canonicalUrl}
            onChange={e => update('canonicalUrl', e.target.value)}
            placeholder="e.g. https://jackseliquid.co.uk/product/cherry-ice"
          />
        </div>

        {/* Social Media Preview Toggle */}
        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '1.25rem' }}>
          <div 
            onClick={() => setShowOg(!showOg)} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>📱 Social Media Preview (Open Graph)</label>
            <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>{showOg ? '▲ Hide' : '▼ Show'}</span>
          </div>
          {showOg && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={labelStyle}>OG Title</label>
                <input
                  style={inputStyle}
                  value={ogTitle}
                  onChange={e => update('ogTitle', e.target.value)}
                  placeholder={metaTitle || 'Defaults to Meta Title if empty'}
                />
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#86868b' }}>
                  Shown when shared on Facebook, Twitter, etc. Leave empty to use Meta Title.
                </div>
              </div>
              <div>
                <label style={labelStyle}>OG Description</label>
                <textarea
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' as const }}
                  rows={2}
                  value={ogDescription}
                  onChange={e => update('ogDescription', e.target.value)}
                  placeholder={metaDescription || 'Defaults to Meta Description if empty'}
                />
              </div>
            </div>
          )}
        </div>

        {/* NoIndex Toggle */}
        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={noIndex}
              onChange={e => update('noIndex', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#ff3b30' }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: noIndex ? '#ff3b30' : '#1d1d1f' }}>
              🚫 Hide from Search Engines (NoIndex)
            </span>
          </label>
          {noIndex && (
            <div style={{ fontSize: '0.8rem', color: '#ff3b30', marginTop: '6px', paddingLeft: '2rem' }}>
              This page will NOT appear in Google or other search engines. It will also be excluded from the sitemap.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
