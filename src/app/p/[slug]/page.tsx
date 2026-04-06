'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getPageBySlug, Page } from '@/lib/data';
import styles from '../../home.module.css'; // borrowing standard home styles

// Reuse MDEditor.Markdown for rendering content
const MarkdownPreview = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });

export default function GenericPageViewer({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const p = await getPageBySlug(slug);
      setPage(p || null);
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

  if (!page || page.status !== 'published') {
    return (
       <div style={{ textAlign: 'center', padding: '10rem 2rem', minHeight: '60vh' }}>
          <h2>Page not found</h2>
          <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>Return to Shop</Link>
       </div>
    );
  }

  return (
    <>
      <main className={styles.main} style={{ background: '#f5f5f7', minHeight: '100vh', padding: '4rem 1rem' }}>
        <article style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '3rem 4rem' }}>
             
             <h1 style={{ fontSize: '2.5rem', color: '#1d1d1f', marginBottom: '2rem', lineHeight: 1.2 }}>
                {page.title}
             </h1>

             <div data-color-mode="light" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}>
                <MarkdownPreview source={page.content} style={{ background: 'transparent', color: '#333' }} />
             </div>
          </div>
        </article>
      </main>
    </>
  );
}
