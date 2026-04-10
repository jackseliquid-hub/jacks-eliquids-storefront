'use client';

import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function OrderAgainButton({ items }: { items: any[] }) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleOrderAgain = () => {
    // Add all items to the cart
    items.forEach(item => {
      addToCart({
        id: item.variant_id ? item.variant_id : item.product_id,
        productId: item.product_id,
        slug: item.product_id,
        name: item.product_name,
        price: `£${item.price_at_time}`,
        image: '/placeholder.png',
        variantName: item.variant_name
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
