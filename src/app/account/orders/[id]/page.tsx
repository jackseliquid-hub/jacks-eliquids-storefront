import { createClient } from '@/utils/supabase/server';
import { signout } from '@/app/login/actions';
import styles from '../../account.module.css';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import OrderAgainButton from './OrderAgainButton';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let profile = null;
  const { data: customerData } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.id)
    .single();
    
  profile = customerData;

  // Fetch specific order details, securing via customer_id check intrinsically 
  // (or assume RLS protects it, but we explicit filter anyway)
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (error) {
    console.error("Order details fetch error:", error, id, user.id);
  }

  if (!order) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={`container ${styles.dashboardInner}`}>
          <aside className={styles.sidebar}>...</aside>
          <main className={styles.mainContent}>
            <h1 className={styles.pageTitle}>Order Not Found</h1>
            <p>We couldn't find that order. It might belong to another account.</p>
            <Link href="/account/orders" style={{color: '#0d9488'}}>Back to Orders</Link>
          </main>
        </div>
      </div>
    );
  }

  // Fetch Items
  const { data: rawItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  // Fetch product images for Order Again Cart injection
  let items = rawItems || [];
  if (items.length > 0) {
    const productIds = Array.from(new Set(items.map(i => i.product_id)));
    const { data: products } = await supabase
      .from('products')
      .select('id, images')
      .in('id', productIds);
      
    const productMap = (products || []).reduce((acc: any, p: any) => {
      acc[p.id] = p.images && p.images.length > 0 ? p.images[0] : '/placeholder.png';
      return acc;
    }, {});
    
    items = items.map(item => ({
      ...item,
      image_url: productMap[item.product_id] || '/placeholder.png'
    }));
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={`container ${styles.dashboardInner}`}>
        
        <aside className={styles.sidebar}>
          <div className={styles.profileSummary}>
            <div className={styles.avatar}>
               {profile?.first_name ? profile.first_name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
            </div>
            <h3>{profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Customer'}</h3>
            <p>{user?.email}</p>
          </div>
          
          <nav className={styles.dashboardNav}>
            <Link href="/account">My Profile</Link>
            <Link href="/account/orders" className={styles.active}>Order History</Link>
            <Link href="/account/addresses">Addresses</Link>
            <form action={signout}>
              <button type="submit" className={styles.logoutBtn}>Sign Out</button>
            </form>
          </nav>
        </aside>

        <main className={styles.mainContent}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link href="/account/orders" style={{ color: '#0d9488', marginRight: '1rem', textDecoration: 'none' }}>&larr; Back</Link>
              <h1 className={styles.pageTitle} style={{ margin: 0 }}>
                Order #{order.order_number ? order.order_number.toString() : order.id.split('-')[0].toUpperCase()}
              </h1>
            </div>
            {items && <OrderAgainButton items={items} />}
          </div>
          
          <div className={styles.cardGrid} style={{ gridTemplateColumns: '1fr' }}>
            
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '14px' }}>Date Placed</p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{new Date(order.created_at).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '14px' }}>Status</p>
                  <span style={{ 
                      padding: '4px 8px', borderRadius: '9999px', 
                      backgroundColor: order.status === 'processing' ? '#e0f2fe' : order.status === 'shipped' ? '#dcfce3' : '#f3f4f6',
                      color: order.status === 'processing' ? '#0369a1' : order.status === 'shipped' ? '#166534' : '#374151',
                      fontSize: '12px', fontWeight: '600', textTransform: 'capitalize'
                  }}>
                    {order.status}
                  </span>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', marginBottom: '1rem' }}>Items</h3>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '14px', fontWeight: 500 }}>Product</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '14px', fontWeight: 500 }}>Price</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '14px', fontWeight: 500 }}>Qty</th>
                      <th style={{ padding: '12px 16px', color: '#4b5563', fontSize: '14px', fontWeight: 500, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items?.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ margin: 0, fontWeight: 500 }}>{item.product_name}</p>
                          {item.variant_name && <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{item.variant_name}</p>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>£{Number(item.discounted_price || item.unit_price).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>£{Number(item.line_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '1rem' }}>Summary</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563' }}>
                    <span>Subtotal</span>
                    <span>£{Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563' }}>
                    <span>Shipping</span>
                    <span>£{Number(order.shipping_cost).toFixed(2)}</span>
                  </div>
                  {Number(order.discount_total) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563' }}>
                      <span>Discounts</span>
                      <span>-£{Number(order.discount_total).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '18px' }}>
                    <span>Total</span>
                    <span>£{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '1rem' }}>Shipping Details</h3>
                  {order.shipping_address ? (
                    <div style={{ color: '#4b5563', lineHeight: '1.5', fontSize: '14px' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#111827' }}>{order.shipping_address.first_name} {order.shipping_address.last_name}</p>
                      <p style={{ margin: '4px 0 0' }}>{order.shipping_address.address}</p>
                      <p style={{ margin: '4px 0 0' }}>{order.shipping_address.city}, {order.shipping_address.postcode}</p>
                    </div>
                  ) : (
                    <p style={{ color: '#6b7280' }}>No shipping details found.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
}
