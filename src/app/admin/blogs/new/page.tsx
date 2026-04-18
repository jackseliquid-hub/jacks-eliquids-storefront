'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Blog, updateBlog } from '@/lib/data';
import styles from '../../admin.module.css';
import MediaModal from '@/components/MediaModal';
import SeoEditorCard from '@/components/SeoEditorCard';
import AiGenerateButton from '@/components/AiGenerateButton';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export default function AddBlogPage() {
  const router = useRouter();
  
  const [blog, setBlog] = useState<Blog>({
    id: '',
    slug: '',
    title: '',
    content: '',
    author: 'Jacks Team',
    status: 'draft',
    image: '',
    category: '',
    tags: []
  });

  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  function setField<K extends keyof Blog>(key: K, value: Blog[K]) {
    setBlog(prev => {
        const updated = { ...prev, [key]: value };
        if (key === 'title' && !slugEdited) {
            updated.slug = slugify(value as string);
        }
        return updated;
    });
  }

  async function handleSave(statusText: 'published' | 'draft') {
    if (!blog.title || !blog.slug) {
        showToast('Please provide a Title and Slug', true);
        return;
    }

    setSaving(true);
    try {
      const id = `blog_${Date.now()}`;
      const payload: Blog = {
          ...blog,
          status: statusText,
          id,
          createdAt: new Date().toISOString(),
          publishedAt: statusText === 'published' ? new Date().toISOString() : undefined
      };

      await updateBlog(id, payload);
      
      showToast(statusText === 'draft' ? 'Saved as Draft!' : 'Blog Published successfully!');
      setTimeout(() => {
          router.push('/admin/blogs');
      }, 1000);
    } catch (e: any) {
      const msg = e?.message || e?.details || String(e);
      showToast('Save failed: ' + msg, true);
      console.error('Blog save error:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin/blogs" className={styles.storeFrontLink}>← Cancel</Link>
          </div>
          <h1 className={styles.pageTitle} style={{ marginTop: '0.35rem' }}>Add New Blog</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
            style={{ minWidth: 120 }}
          >
            {saving ? 'Creating…' : '🚀 Publish'}
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
        />
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.toastError : ''}`}>
          {toast.msg}
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
