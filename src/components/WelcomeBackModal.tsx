'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCart } from '@/context/CartContext';

interface OrderItem {
  product_id: string;
  product_name: string;
  variant_name?: string;
  variation_id?: string;
  unit_price: number;
  discounted_price?: number;
  quantity: number;
  line_total: number;
  image_url?: string;
}

interface LastOrder {
  id: string;
  order_number?: number;
  created_at: string;
  total: number;
  status: string;
  items: OrderItem[];
}

export default function WelcomeBackModal() {
  const [show, setShow] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    async function check() {
      const supabase = createClient();

      // Only check if we haven't shown this session
      const shownKey = 'jacks_welcome_shown';
      if (sessionStorage.getItem(shownKey)) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark as shown for this session immediately
      sessionStorage.setItem(shownKey, 'true');

      // Get customer name
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name')
        .eq('id', user.id)
        .single();

      if (!customer?.first_name) return;
      setFirstName(customer.first_name);

      // Get latest order with items
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total, status')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!orders || orders.length === 0) {
        // User has no orders — show a simpler welcome
        setLastOrder(null);
        setShow(true);
        return;
      }

      const order = orders[0];

      // Fetch order items
      const { data: rawItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, variant_name, variation_id, unit_price, discounted_price, quantity, line_total')
        .eq('order_id', order.id);

      // Fetch product images
      let items: OrderItem[] = rawItems || [];
      if (items.length > 0) {
        const productIds = [...new Set(items.map(i => i.product_id))];
        const { data: products } = await supabase
          .from('products')
          .select('id, image')
          .in('id', productIds);

        const imageMap = (products || []).reduce((acc: Record<string, string>, p: any) => {
          if (p.image) acc[p.id] = p.image;
          return acc;
        }, {});

        items = items.map(item => ({
          ...item,
          image_url: imageMap[item.product_id] || undefined,
        }));
      }

      setLastOrder({ ...order, items });
      setShow(true);
    }

    // Small delay so the page settles
    const timer = setTimeout(check, 800);
    return () => clearTimeout(timer);
  }, []);

  function handleOrderAgain() {
    if (!lastOrder) return;

    lastOrder.items.forEach(item => {
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

    setAddedToCart(true);
    setTimeout(() => setShow(false), 1800);
  }

  if (!show) return null;

  const orderDate = lastOrder
    ? new Date(lastOrder.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShow(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          animation: 'wbFadeIn 0.25s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        width: '92vw',
        maxWidth: 520,
        maxHeight: '85vh',
        overflowY: 'auto',
        animation: 'wbSlideUp 0.3s ease',
      }}>
        <style>{`
          @keyframes wbFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes wbSlideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        `}</style>

        {/* Header with gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)',
          padding: '1.75rem 1.75rem 1.25rem',
          borderRadius: '18px 18px 0 0',
          position: 'relative',
        }}>
          <button
            onClick={() => setShow(false)}
            style={{
              position: 'absolute', top: 12, right: 14,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: '#fff', borderRadius: '50%', width: 30, height: 30,
              cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>

          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>👋</div>
          <h2 style={{
            color: '#fff', margin: 0,
            fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
            fontWeight: 800, letterSpacing: '-0.02em',
          }}>
            Hi {firstName}, great to see you again!
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.75rem 1.5rem' }}>
          {addedToCart ? (
            <div style={{
              textAlign: 'center', padding: '2rem 0',
              animation: 'wbFadeIn 0.3s ease',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                Items added to your basket!
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.5rem 0 0' }}>
                Head to checkout when you&apos;re ready.
              </p>
            </div>
          ) : lastOrder ? (
            <>
              <p style={{
                fontSize: '0.92rem', color: '#374151', lineHeight: 1.6,
                margin: '0 0 1rem',
              }}>
                Here&apos;s what you ordered last on <strong>{orderDate}</strong>.
                Feel free to take a look around the site and see what&apos;s new.
                However, if you just want to place the same order as last time,
                simply click the <strong>Order Again</strong> button and we&apos;ll
                drop the items in your basket.
              </p>

              {/* Order items list */}
              <div style={{
                background: '#f9fafb', borderRadius: 12,
                border: '1px solid #e5e7eb',
                marginBottom: '1.25rem', overflow: 'hidden',
              }}>
                <div style={{
                  padding: '0.6rem 0.85rem',
                  background: '#f3f4f6',
                  fontSize: '0.78rem', fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  Order #{lastOrder.order_number || lastOrder.id.split('-')[0].toUpperCase()}
                </div>

                {lastOrder.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    padding: '0.6rem 0.85rem',
                    borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                  }}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url} alt={item.product_name}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: 8, background: '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', flexShrink: 0,
                      }}>📦</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.85rem', color: '#111',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.product_name}
                      </div>
                      {item.variant_name && (
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{item.variant_name}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111' }}>
                        £{Number(item.discounted_price || item.unit_price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>×{item.quantity}</div>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderTop: '1px solid #e5e7eb',
                  background: '#f0fdfa',
                }}>
                  <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>Total</span>
                  <span style={{ fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>
                    £{Number(lastOrder.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  onClick={handleOrderAgain}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '0.7rem 1.25rem', fontWeight: 700,
                    fontSize: '0.92rem', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(15,118,110,0.3)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,118,110,0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,118,110,0.3)';
                  }}
                >
                  🔄 Order Again
                </button>
                <button
                  onClick={() => setShow(false)}
                  style={{
                    flex: 1,
                    background: '#f3f4f6', color: '#374151',
                    border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: '0.7rem 1.25rem', fontWeight: 600,
                    fontSize: '0.92rem', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
                >
                  Just Browsing
                </button>
              </div>
            </>
          ) : (
            /* No previous orders — simpler greeting */
            <>
              <p style={{
                fontSize: '0.92rem', color: '#374151', lineHeight: 1.6,
                margin: '0 0 1.25rem',
              }}>
                Welcome back! Feel free to take a look around the site and see what&apos;s new.
              </p>
              <button
                onClick={() => setShow(false)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '0.7rem', fontWeight: 700,
                  fontSize: '0.92rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15,118,110,0.3)',
                }}
              >
                Let&apos;s Go!
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
