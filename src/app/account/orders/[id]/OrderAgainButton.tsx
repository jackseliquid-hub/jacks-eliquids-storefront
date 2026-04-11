'use client';

import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function OrderAgainButton({ items }: { items: any[] }) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleOrderAgain = () => {
    // Add all items to the cart
    items.forEach(item => {
      // id must be the variation_id (for variant items) or product_id (for simple items)
      // This matches how the checkout action maps: variation_id: item.variantName ? item.id : null
      const cartId = item.variation_id || item.product_id;
      
      addToCart({
        id: cartId,
        productId: item.product_id,
        slug: item.product_id,
        name: item.product_name,
        price: `£${Number(item.discounted_price || item.unit_price).toFixed(2)}`,
        image: item.image_url || '/placeholder.png',
        variantName: item.variant_name || undefined,
      }, item.quantity);
    });

    // Send user to checkout
    router.push('/checkout');
  };

  return (
    <button 
      onClick={handleOrderAgain}
      style={{
        backgroundColor: '#0d9488',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '10px 20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background 0.2s',
        display: 'inline-block'
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0f766e')}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0d9488')}
    >
      Order Again
    </button>
  );
}
