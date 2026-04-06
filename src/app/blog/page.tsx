'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllBlogs, Blog } from '@/lib/data';
import styles from '../home.module.css';

export default function BlogIndexPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getAllBlogs();
        // Only show published blogs
        setBlogs(data.filter(b => b.status === 'published'));
      } catch (err) {
        console.error("Blog fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <main className={styles.main}>
        <section className={styles.hero} style={{ background: 'linear-gradient(to right, #004b50, #001f3f)', minHeight: '30vh' }}>
          <h1 className={styles.heroTitle}>The Base</h1>
          <p className={styles.heroSubtitle}>
            Vaping guides, news, and our latest updates directly from The Kitchen.
          </p>
        </section>

        <section className={`container ${styles.productsSection}`}>
          {loading ? (
             <div className={styles.loadingScreen} style={{ position: 'relative', height: '20vh' }}>
               <div className={styles.spinner} />
             </div>
          ) : (
            <div className={styles.grid}>
              {blogs.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#86868b', gridColumn: '1 / -1' }}>No blogs published yet.</div>
              ) : (
                blogs.map((blog) => (
                  <Link key={blog.id} href={`/blog/${blog.slug}`} className={styles.cardLink}>
                    <div className={styles.card}>
                      <div className={styles.cardImageWrapper}>
                        {blog.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={blog.image}
                            alt={blog.title}
                            className={styles.productImage}
                            style={{ objectFit: 'cover' }}
                            loading="lazy"
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', color: '#86868b' }}>
                            No Image
                          </div>
                        )}
                      </div>
                      <div className={styles.cardContent}>
                        <h3 className={styles.productName} style={{ marginBottom: '8px' }}>{blog.title}</h3>
                        <div className={styles.productFooter}>
                           <span style={{ fontSize: '0.85rem', color: '#86868b' }}>{blog.author}</span>
                           <span style={{ fontSize: '0.8rem', color: '#86868b' }}>
                             {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : ''}
                           </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
