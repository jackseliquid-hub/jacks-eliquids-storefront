'use client';

import { useCart } from '@/context/CartContext';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const { cartItems, cartCount, cartSubtotal, isOpen, closeCart, removeFromCart, updateQty } = useCart();

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Slide-out drawer */}
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`} aria-label="Shopping cart">
        <div className={styles.header}>
          <span className={styles.title} suppressHydrationWarning>Your Cart ({cartCount})</span>
          <button className={styles.closeBtn} onClick={closeCart} aria-label="Close cart">
            ✕
          </button>
        </div>

        <div className={styles.items}>
          {cartItems.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🛍️</span>
              <span>Your cart is empty</span>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div key={item.id || `cart-item-${index}`} className={styles.item}>
                {/* Image */}
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className={styles.itemImage} />
                ) : (
                  <div className={styles.itemImagePlaceholder}>📦</div>
                )}

                {/* Name + price + qty */}
                <div className={styles.itemDetails}>
                  <span className={styles.itemName}>{item.name}</span>
                  {item.variantName && <span className={styles.itemVariant}>{item.variantName}</span>}
                  <span className={styles.itemPrice}>{item.price}</span>
                  <div className={styles.qtyControls}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className={styles.qtyValue}>{item.quantity}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Remove */}
                <button
                  className={styles.removeBtn}
                  onClick={() => removeFromCart(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.subtotal}>
              <span className={styles.subtotalLabel}>Subtotal</span>
              <span className={styles.subtotalValue} suppressHydrationWarning>{cartSubtotal}</span>
            </div>
            <button className={styles.checkoutBtn}>Proceed to Checkout</button>
          </div>
        )}
      </aside>
    </>
  );
}
