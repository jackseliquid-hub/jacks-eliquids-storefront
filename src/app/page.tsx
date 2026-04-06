'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import styles from './home.module.css';
import { useCart } from '@/context/CartContext';
import { getAllProducts, getCategories, Product } from '@/lib/data';

export default function Home() {
  const { addToCart, cartCount, openCart } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodData, catData] = await Promise.all([
          getAllProducts(),
          getCategories()
        ]);
        setProducts(prodData);
        setCategories(catData);
      } catch (err) {
        console.error("Home: Data fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const featuredProducts = useMemo(() => {
    // Reverse array to show newly added products (at the bottom of the list/firestore) first
    const sorted = [...products].reverse();
    if (activeCategory === 'All') return sorted.slice(0, 48);
    return sorted.filter(p => p.category === activeCategory);
  }, [activeCategory, products]);

  function handleAddToCart(e: React.MouseEvent, product: Product) {
    e.preventDefault(); // Don't follow the Link
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      // Use sale price if available for cart
      price: product.salePrice || (product.price && product.price !== 'N/A' ? product.price : 'See Options'),
    });
  }

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <span>Loading Shop...</span>
      </div>
    );
  }

  return (
    <>
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Premium E-Liquids. Unmatched Quality.</h1>
          <p className={styles.heroSubtitle}>
            Carefully crafted blends designed to deliver perfect flavour profiles and dense clouds. Satisfaction in every draw.
          </p>
          <button className={styles.ctaButton} onClick={openCart}>Shop the Collection</button>
        </section>

        {/* Category Bar */}
        <div className={styles.categoryBar}>
          <div className={`container ${styles.categoryScroll}`}>
            <button
              className={`${styles.categoryPill} ${activeCategory === 'All' ? styles.active : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {categories.map((cat, index) => (
              <button
                key={cat || `cat-${index}`}
                className={`${styles.categoryPill} ${activeCategory === cat ? styles.active : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <section className={`container ${styles.productsSection}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {activeCategory === 'All' ? 'Featured Blends' : activeCategory}
            </h2>
            <Link href="#" className={styles.viewAll}>
              {activeCategory === 'All'
                ? `View All ${products.length} Products`
                : `${featuredProducts.length} Products`}
              <span> →</span>
            </Link>
          </div>

          <div className={styles.grid}>
            {featuredProducts.map((product, index) => (
              <Link key={product.id || `prod-${index}`} href={`/product/${product.slug}`} className={styles.cardLink}>
                <div className={styles.card}>
                  <div className={styles.cardImageWrapper}>
                    {product.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt={product.name}
                        className={styles.productImage}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <div className={styles.productFooter}>
                      <div className={styles.priceWrapper}>
                        {product.salePrice ? (
                          <>
                            <span className={styles.productPriceSlashed}>
                              {product.price !== 'N/A' ? `From ${product.price}` : ''}
                            </span>
                            <span className={styles.productPriceSale}>{product.salePrice}</span>
                            <span className={styles.saleTag}>Sale</span>
                          </>
                        ) : (
                          <span className={styles.productPrice}>
                            {product.price && product.price !== 'N/A' ? `From ${product.price}` : 'See Options'}
                          </span>
                        )}
                      </div>
                      <button
                        className={styles.addToCartBtn}
                        aria-label="Add to cart"
                        onClick={e => handleAddToCart(e, product)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
