'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getPageById, updatePage, Page } from '@/lib/data';
import styles from '../../admin.module.css';
import SeoEditorCard from '@/components/SeoEditorCard';
import AiGenerateButton from '@/components/AiGenerateButton';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getPageById(id);
      if (data) {
          setPage(data);
          setSlugEdited(true); 
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }, []);

  function setField<K extends keyof Page>(key: K, value: Page[K]) {
    setPage(prev => {
        if (!prev) return null;
        const updated = { ...prev, [key]: value };
        if (key === 'title' && !slugEdited) {
            updated.slug = slugify(value as string);
        }
        return updated;
    });
  }

  async function handleSave(statusText?: 'published' | 'draft') {
    if (!page) return;
    if (!page.title || !page.slug) {
        showToast('Please provide a Title and Slug', true);
        return;
    }

    setSaving(true);
    try {
      const payload = { ...page };
      if (statusText) {
          payload.status = statusText;
      }
      payload.updatedAt = new Date().toISOString();
      
      await updatePage(page.id, payload);
      setPage(payload);
      showToast(statusText === 'draft' ? 'Saved as Draft!' : 'Saved successfully!');
    } catch (e) {
      showToast('Save failed — check console', true);
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap} style={{ height: '100vh' }}>
        <div className={styles.spinner} />
        Loading page…
      </div>
    );
  }

  if (!page) {
    return <div style={{ padding: '2rem' }}>Page not found.</div>;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin/pages" className={styles.storeFrontLink}>← Pages</Link>
          </div>
          <h1 className={styles.pageTitle} style={{ marginTop: '0.35rem' }}>{page.title}</h1>
          <p className={styles.pageSubtitle}>ID: {page.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            👁 Preview
          </a>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            📋 Save Draft
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            {saving ? 'Saving…' : '🚀 Publish / Update'}
          </button>
        </div>
      </div>

      <div className={styles.sections}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>Page Content</div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Title</label>
                <input
                  className={styles.input}
                  value={page.title}
                  placeholder="e.g. Privacy Policy"
                  onChange={e => setField('title', e.target.value)}
                />
              </div>

               <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Slug  <span style={{fontSize:'0.75rem', color:'#86868b'}}>(URL)</span></label>
                <input
                  className={styles.input}
                  value={page.slug}
                  placeholder="e.g. privacy-policy"
                  onChange={e => {
                      setSlugEdited(true);
                      setField('slug', e.target.value);
                  }}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <label className={styles.label} style={{ marginBottom: 0 }}>Page Copy</label>
                  <AiGenerateButton
                    type="page"
                    context={{ title: page.title || '', existingContent: page.content || '' }}
                    onGenerated={(content) => setField('content', content)}
                    hasContent={!!page.content}
                  />
                </div>
                <div data-color-mode="light">
                  <MDEditor
                    value={page.content}
                    onChange={(val) => setField('content', val || '')}
                    height={400}
                    preview="edit"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <SeoEditorCard 
           seo={page.seo} 
           onChange={(seo) => setField('seo', seo)}
           titlePlaceholder={page.title ? `${page.title} | Jacks` : undefined}
           descPlaceholder={page.content ? page.content.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...' : undefined}
        />
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.toastError : ''}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
