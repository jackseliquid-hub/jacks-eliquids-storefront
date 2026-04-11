import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/utils/supabase/admin';
import styles from '../../admin.module.css';
import StatusSelector from './StatusSelector';
import RoyalMailButton from './RoyalMailButton';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch the Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return notFound();
  }

  // Fetch Line Items
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id);

  const rawItems = orderItems || [];
  
  // Fetch product images
  let items: any[] = rawItems;
  if (rawItems.length > 0) {
    const productIds = Array.from(new Set(rawItems.map((i: any) => i.product_id)));
    const { data: productData } = await supabase
      .from('products')
      .select('id, image')
      .in('id', productIds);
    const imgMap = (productData || []).reduce((acc: any, p: any) => { acc[p.id] = p.image; return acc; }, {});
    items = rawItems.map((item: any) => ({ ...item, image_url: imgMap[item.product_id] || null }));
  }

  const shortId = order.order_number ? order.order_number.toString() : order.id.substring(0, 8).toUpperCase();
  const date = new Date(order.created_at);

  return (
    <div>
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 className={styles.title}>Order #{shortId}</h1>
          <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            Placed on {date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        <Link href="/admin/orders" className={styles.secondaryBtn}>
          &larr; Back to Orders
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Left Column: Line Items */}
        <div>
          <div className={styles.dashboardCard} style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111' }}>Order Items</h2>
            
            <table className={styles.table} style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 0, borderBottom: '1px solid #f3f4f6' }}>Item</th>
                  <th style={{ borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>Price</th>
                  <th style={{ borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>Qty</th>
                  <th style={{ borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ paddingLeft: 0 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.product_name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', background: '#f3f4f6', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                          {item.variant_name && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.variant_name}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      £{Number(item.discounted_price || item.unit_price).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>x{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>£{Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '0.9rem', color: '#4b5563' }}>
                <span>Subtotal:</span>
                <span>£{Number(order.subtotal).toFixed(2)}</span>
              </div>
              {Number(order.discount_total) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '0.9rem', color: '#0d9488' }}>
                  <span>Discounts Applied:</span>
                  <span>-£{Number(order.discount_total).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '0.9rem', color: '#4b5563' }}>
                <span>Shipping:</span>
                <span>£{Number(order.shipping_cost).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', fontSize: '1.2rem', fontWeight: 700, color: '#111', marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
                <span>Total:</span>
                <span>£{Number(order.total).toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Fufillment & Customer Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className={styles.dashboardCard} style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111' }}>Fulfillment</h2>
            <StatusSelector orderId={order.id} currentStatus={order.status} />
            {order.notes && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.5rem' }}>Order Notes:</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#111' }}>{order.notes}</p>
              </div>
            )}
          </div>

          {/* ── Royal Mail Shipping ─────────────────────────────────── */}
          <div className={styles.dashboardCard} style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: '#111' }}>
              🏣 Royal Mail Click &amp; Drop
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#6b7280' }}>
              Push this order to Click &amp; Drop to generate a shipping label.
            </p>
            <RoyalMailButton orderId={order.id} existingRmOrderId={order.royal_mail_order_id ?? null} />
          </div>

          <div className={styles.dashboardCard} style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111' }}>Customer</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', color: '#374151' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#111', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>Shipping Details</h3>
                {order.shipping_address ? (
                  <div style={{ lineHeight: 1.5 }}>
                    <strong style={{ display: 'block', color: '#111' }}>{order.shipping_address.first_name} {order.shipping_address.last_name}</strong>
                    {order.shipping_address.address}<br />
                    {order.shipping_address.city}<br />
                    {order.shipping_address.county && <>{order.shipping_address.county}<br /></>}
                    {order.shipping_address.postcode}<br />
                    {order.shipping_address.country}<br />
                    <div style={{ marginTop: '0.5rem' }}>
                      <a href={`mailto:${order.shipping_address.email}`} style={{ color: '#0d9488', textDecoration: 'none', display: 'block' }}>{order.shipping_address.email}</a>
                      {order.shipping_address.phone && <span>{order.shipping_address.phone}</span>}
                    </div>
                  </div>
                ) : <p>No shipping mapping found.</p>}
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#111', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>Billing Details</h3>
                {order.billing_address ? (
                  <div style={{ lineHeight: 1.5 }}>
                    <strong style={{ display: 'block', color: '#111' }}>{order.billing_address.first_name} {order.billing_address.last_name}</strong>
                    {order.billing_address.address}<br />
                    {order.billing_address.city}<br />
                    {order.billing_address.county && <>{order.billing_address.county}<br /></>}
                    {order.billing_address.postcode}<br />
                    {order.billing_address.country}<br />
                    <div style={{ marginTop: '0.5rem' }}>
                      <a href={`mailto:${order.billing_address.email}`} style={{ color: '#0d9488', textDecoration: 'none', display: 'block' }}>{order.billing_address.email}</a>
                      {order.billing_address.phone && <span>{order.billing_address.phone}</span>}
                    </div>
                  </div>
                ) : <p>No billing mapping found.</p>}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
