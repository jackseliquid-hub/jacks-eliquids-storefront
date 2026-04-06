'use client';
import { SeoMeta } from '@/lib/data';

interface SeoEditorCardProps {
  seo: SeoMeta | undefined;
  onChange: (seo: SeoMeta) => void;
  titlePlaceholder?: string;
  descPlaceholder?: string;
}

export default function SeoEditorCard({ seo, onChange, titlePlaceholder, descPlaceholder }: SeoEditorCardProps) {
  const metaTitle = seo?.metaTitle || '';
  const metaDescription = seo?.metaDescription || '';
  const keywords = seo?.keywords || '';
  const canonicalUrl = seo?.canonicalUrl || '';

  const update = (field: keyof SeoMeta, value: string) => {
    onChange({ ...seo, [field]: value });
  };

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', background: '#f5f5f7', borderBottom: '1px solid #e5e5e5', fontWeight: 600 }}>
        SEO Settings (Rank Math Style)
      </div>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Snippet Preview */}
        <div style={{ background: '#f5f5f7', padding: '1rem', borderRadius: '8px', border: '1px solid #d2d2d7' }}>
            <div style={{ fontSize: '0.8rem', color: '#545454', marginBottom: '4px' }}>Snippet Preview</div>
            <div style={{ fontSize: '1.2rem', color: '#1a0dab', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {metaTitle || titlePlaceholder || 'Your Page Title'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#006621', margin: '2px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {canonicalUrl || 'jacks-e-liquid.co.uk/example-url'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#545454' }}>
               {metaDescription || descPlaceholder || 'Please provide a meta description. This helps search engines understand what your page is about and can improve click-through rates.'}
            </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
            Meta Title
          </label>
          <input
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem' }}
            value={metaTitle}
            onChange={e => update('metaTitle', e.target.value)}
            placeholder={titlePlaceholder || 'e.g. Cherry Ice Nic Salt | Jacks E-Liquid'}
          />
          <div style={{ fontSize: '0.75rem', marginTop: '4px', color: metaTitle.length > 60 ? '#ff3b30' : '#86868b' }}>
            {metaTitle.length}/60 characters (recommended)
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
            Meta Description
          </label>
          <textarea
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
            rows={3}
            value={metaDescription}
            onChange={e => update('metaDescription', e.target.value)}
            placeholder={descPlaceholder || 'Write a compelling description for this page.'}
          />
          <div style={{ fontSize: '0.75rem', marginTop: '4px', color: metaDescription.length > 160 ? '#ff3b30' : '#86868b' }}>
            {metaDescription.length}/160 characters (recommended)
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
            Focus Keyword
          </label>
          <input
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem' }}
            value={keywords}
            onChange={e => update('keywords', e.target.value)}
            placeholder="e.g. cherry ice vape, cheap nic salt"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>
            Canonical URL
          </label>
          <input
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem' }}
            value={canonicalUrl}
            onChange={e => update('canonicalUrl', e.target.value)}
            placeholder="e.g. https://www.jacks-eliquids.co.uk/product/cherry-ice"
          />
        </div>

      </div>
    </div>
  );
}
