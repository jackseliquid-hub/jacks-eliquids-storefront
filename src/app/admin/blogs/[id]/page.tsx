'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getBlogById, updateBlog, Blog } from '@/lib/data';
import styles from '../../admin.module.css';
import MediaModal from '@/components/MediaModal';
import SeoEditorCard from '@/components/SeoEditorCard';
import AiGenerateButton from '@/components/AiGenerateButton';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getBlogById(id);
      if (data) {
          setBlog(data);
          // If a blog exists, we assume its slug was intentionally set this way and shouldn't auto-update
          setSlugEdited(true); 
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), err ? 10000 : 3000);
  }, []);

  function setField<K extends keyof Blog>(key: K, value: Blog[K]) {
    setBlog(prev => {
        if (!prev) return null;
        const updated = { ...prev, [key]: value };
        if (key === 'title' && !slugEdited) {
            updated.slug = slugify(value as string);
        }
        return updated;
    });
  }

  async function handleSave(statusText?: 'published' | 'draft') {
    if (!blog) return;
    if (!blog.title || !blog.slug) {
        showToast('Please provide a Title and Slug', true);
        return;
    }

    setSaving(true);
    try {
      const payload = { ...blog };
      if (statusText) {
          payload.status = statusText;
          if (statusText === 'published' && !payload.publishedAt) {
              payload.publishedAt = new Date().toISOString();
          }
      }
      
      await updateBlog(blog.id, payload);
      setBlog(payload);
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
        Loading blog…
      </div>
    );
  }

  if (!blog) {
    return <div style={{ padding: '2rem' }}>Blog not found.</div>;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin/blogs" className={styles.storeFrontLink}>← Blogs</Link>
          </div>
          <h1 className={styles.pageTitle} style={{ marginTop: '0.35rem' }}>{blog.title}</h1>
          <p className={styles.pageSubtitle}>ID: {blog.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={`/blog/${blog.slug}`}
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
          <div className={styles.cardHeader}>Blog Content</div>
          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Title</label>
                <input
                  className={styles.input}
                  value={blog.title}
                  placeholder="e.g. Top 10 Best E-Liquids in 2026"
                  onChange={e => setField('title', e.target.value)}
                />
              </div>

               <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Slug  <span style={{fontSize:'0.75rem', color:'#86868b'}}>(URL)</span></label>
                <input
                  className={styles.input}
                  value={blog.slug}
                  placeholder="e.g. top-10-best-eliquids"
                  onChange={e => {
                      setSlugEdited(true);
                      setField('slug', e.target.value);
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Author</label>
                <input
                  className={styles.input}
                  value={blog.author || ''}
                  onChange={e => setField('author', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Vaping Guides"
                  value={blog.category || ''}
                  onChange={e => setField('category', e.target.value)}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Featured Image (URL)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {blog.image ? (
                    <div style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={blog.image} alt="Preview" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e5e5' }} />
                      <button type="button" style={{ position: 'absolute', top: -8, right: -8, background: '#fff', border: '1px solid #e5e5e5', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }} onClick={() => setField('image', '')}>✕</button>
                    </div>
                  ) : (
                    <div style={{ width: 120, height: 80, borderRadius: 10, border: '2px dashed #d2d2d7', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.85rem' }}>No Image</div>
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ alignSelf: 'flex-start' }} onClick={() => setMediaModalOpen(true)}>🖼️ Media Library</button>
                    <input className={styles.input} value={blog.image} onChange={e => setField('image', e.target.value)} placeholder="Or paste URL here…" style={{ maxWidth: 400 }} />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <label className={styles.label} style={{ marginBottom: 0 }}>Blog Content</label>
                  <AiGenerateButton
                    type="blog"
                    context={{ title: blog.title || '', category: blog.category || '', existingContent: blog.content || '' }}
                    onGenerated={(content) => setField('content', content)}
                    hasContent={!!blog.content}
                  />
                </div>
                <div data-color-mode="light">
                  <MDEditor
                    value={blog.content}
                    onChange={(val) => setField('content', val || '')}
                    height={400}
                    preview="edit"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Editor injected here */}
        <SeoEditorCard 
           seo={blog.seo} 
           onChange={(seo) => setField('seo', seo)}
           titlePlaceholder={blog.title ? `${blog.title} | Jacks` : undefined}
           descPlaceholder={blog.content ? blog.content.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...' : undefined}
           aiContext={{
             name: blog.title || '',
             category: blog.category || '',
             brand: 'Jacks E-Liquids',
             price: '',
             description: blog.content ? blog.content.replace(/<[^>]*>?/gm, '').slice(0, 500) : '',
             slug: blog.slug || '',
           }}
        />
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.toastError : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', opacity: 0.8 }}>✕</button>
        </div>
      )}

      {mediaModalOpen && (
        <MediaModal
          title="Select Featured Image"
          onClose={() => setMediaModalOpen(false)}
          onSelect={(url) => {
             setField('image', url);
             setMediaModalOpen(false);
          }}
        />
      )}
    </>
  );
}
