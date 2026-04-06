'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getBlogBySlug, Blog } from '@/lib/data';
import styles from '../../home.module.css';

// Reuse MDEditor.Markdown for rendering content
const MarkdownPreview = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const b = await getBlogBySlug(slug);
      setBlog(b || null);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!blog || blog.status !== 'published') {
    return (
       <div style={{ textAlign: 'center', padding: '10rem 2rem' }}>
          <h2>Blog post not found</h2>
          <Link href="/blog" style={{ color: '#0070f3', textDecoration: 'underline' }}>Return to Blog</Link>
       </div>
    );
  }

  return (
    <>
      <main className={styles.main} style={{ background: '#f5f5f7', minHeight: '100vh', padding: '2rem 1rem' }}>
        <article style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {blog.image && (
             // eslint-disable-next-line @next/next/no-img-element
             <img src={blog.image} alt={blog.title} style={{ width: '100%', height: 'auto', maxHeight: '450px', objectFit: 'cover' }} />
          )}
          <div style={{ padding: '3rem 4rem' }}>
             <div style={{ display: 'flex', gap: '1rem', color: '#86868b', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                {blog.category && <span style={{ color: '#0070f3' }}>{blog.category}</span>}
                {blog.category && <span>•</span>}
                <span>{blog.author}</span>
                <span>•</span>
                <span>{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : ''}</span>
             </div>
             
             <h1 style={{ fontSize: '2.5rem', color: '#1d1d1f', marginBottom: '2rem', lineHeight: 1.2 }}>
                {blog.title}
             </h1>

             <div data-color-mode="light" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}>
                <MarkdownPreview source={blog.content} style={{ background: 'transparent', color: '#333' }} />
             </div>
          </div>
        </article>
      </main>
    </>
  );
}
