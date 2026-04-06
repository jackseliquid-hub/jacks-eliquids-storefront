'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from './product.module.css';
import { getProductBySlug, Product } from '@/lib/data';

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { addToCart, openCart } = useCart();

  // Data state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Track selected attributes and quantity
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const prod = await getProductBySlug(slug);
        setProduct(prod || null);
        if (prod?.image) setMainImage(prod.image);
      } catch (err) {
        console.error("ProductPage: Fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  // Find matching variation based on selection
  const matchingVariation = useMemo(() => {
    if (!product) return null;
    const attributeKeys = Object.keys(product.attributes || {});
    if (attributeKeys.length === 0) return null;

    // Check if all needed attributes are selected
    const isAllSelected = attributeKeys.every(key => selectedAttributes[key]);
    if (!isAllSelected) return null;

    return product.variations?.find(v => {
      const vAttrs = v.attributes || {};
      return attributeKeys.every(key => {
        const vKey = Object.keys(vAttrs).find(k => k.toLowerCase() === key.toLowerCase());
        if (!vKey) return false;
        
        // Strip spaces, 'mg', and 'ml' suffixes for highly robust matching
        const normalize = (val: string) => String(val).toLowerCase().replace(/\s+/g, '').replace(/(mg|ml)$/, '');
        return normalize(vAttrs[vKey]) === normalize(selectedAttributes[key]);
      });
    });
  }, [product, selectedAttributes]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!product) return notFound();

  const attributeKeys = Object.keys(product.attributes || {});
  const isSelectionComplete = attributeKeys.length === 0 || !!matchingVariation;

  const displayPrice = matchingVariation?.price || product.price;
  const displaySku = matchingVariation?.sku || product.sku;
  // Sale price: prefer variation-level sale price, fall back to product-level
  const displaySalePrice = product.salePrice || null;
  const hasSale = !!(displaySalePrice && displaySalePrice !== displayPrice);
  const description = product.description ? product.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

  function handleAttributeSelect(name: string, value: string) {
    setSelectedAttributes(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleAddToCart() {
    if (!isSelectionComplete || !product) return;

    addToCart({
      id: matchingVariation?.id || product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: displayPrice,
      variantName: matchingVariation ? Object.values(matchingVariation.attributes).join(' / ') : undefined
    }, quantity);
    openCart();
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>← Back to Shop</Link>
      </div>

      <div className={styles.layout}>
        {/* Left: Image */}
        <div className={styles.imagePanel}>
          <div className={styles.mainImageWrapper}>
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt={product.name} className={styles.productImage} />
            ) : (
              <div className={styles.imagePlaceholder}>📦</div>
            )}
          </div>
          
          {/* Gallery Thumbnails */}
          {((product.gallery && product.gallery.length > 0) || product.image) && (
            <div className={styles.galleryStrip}>
              {product.image && (
                <div 
                  className={`${styles.galleryThumb} ${mainImage === product.image ? styles.thumbActive : ''}`} 
                  onClick={() => setMainImage(product.image)}
                >
                  <img src={product.image} alt="Main" />
                </div>
              )}
              {product.gallery?.map((img, i) => (
                <div 
                  key={img || i} 
                  className={`${styles.galleryThumb} ${mainImage === img ? styles.thumbActive : ''}`} 
                  onClick={() => setMainImage(img)}
                >
                  <img src={img} alt={`Gallery ${i}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className={styles.detailsPanel}>
          <div className={styles.productHeader}>
            <p className={styles.categoryLabel}>{product.category}</p>
            <h1 className={styles.productName}>{product.name}</h1>

            {hasSale ? (
              <div className={styles.priceBlock}>
                <span className={styles.originalPrice}>{displayPrice}</span>
                <span className={styles.salePrice}>{displaySalePrice}</span>
                <span className={styles.saleBadge}>On Sale</span>
              </div>
            ) : (
              <p className={styles.price}>{displayPrice}</p>
            )}
          </div>

          <hr className={styles.divider} />

          {/* Variation Selectors */}
          {attributeKeys.length > 0 && (
            <div className={styles.variations}>
              {attributeKeys.map(attrName => (
                <div key={attrName} className={styles.variationGroup}>
                  <label htmlFor={`attr-${attrName}`} className={styles.variationLabel}>
                    {attrName}
                  </label>
                  <select
                    id={`attr-${attrName}`}
                    className={styles.select}
                    value={selectedAttributes[attrName] || ''}
                    onChange={(e) => handleAttributeSelect(attrName, e.target.value)}
                  >
                    <option value="" disabled>Choose {attrName}</option>
                    {(product.attributes[attrName] || []).map(value => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {description && <p className={styles.description}>{description}</p>}
          
          <div className={styles.purchaseSection}>
            <div className={styles.qtyContainer}>
              <span className={styles.variationLabel}>Quantity</span>
              <div className={styles.qtyControls}>
                <button 
                  type="button" 
                  className={styles.qtyBtn} 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className={styles.qtyValue}>{quantity}</span>
                <button 
                  type="button" 
                  className={styles.qtyBtn} 
                  onClick={() => setQuantity(q => q + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <button 
              className={styles.cartButton} 
              onClick={handleAddToCart}
              disabled={!isSelectionComplete}
            >
              {isSelectionComplete ? 'Add to Bag' : 'Select Options'}
            </button>
          </div>

          <div className={styles.metaInfo}>
            {matchingVariation && !matchingVariation.inStock && (
              <span style={{ color: '#ff3b30' }}>Currently Out of Stock</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
