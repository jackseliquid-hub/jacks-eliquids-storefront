import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/utils/supabase/admin';
import styles from '../../admin.module.css';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !customer) return notFound();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });

  const orderList = orders || [];
  const totalSpend = orderList.reduce((sum, o) => sum + Number(o.total), 0);
  const aov = orderList.length > 0 ? totalSpend / orderList.length : 0;
  const phone = customer.phone || customer.billing_address?.phone || null;
  const addr = customer.billing_address;

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending:    { bg: '#fef9c3', color: '#713f12' },
    processing: { bg: '#e0f2fe', color: '#0369a1' },
    shipped:    { bg: '#dcfce7', color: '#166534' },
    cancelled:  { bg: '#fee2e2', color: '#991b1b' },
    on_hold:    { bg: '#f3f4f6', color: '#374151' },
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{customer.first_name} {customer.last_name}</h1>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Customer since {new Date(customer.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <Link href="/admin/customers" className={styles.secondaryBtn}>← All Customers</Link>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Orders', value: orderList.length },
          { label: 'Total Spend', value: `£${totalSpend.toFixed(2)}` },
          { label: 'Average Order', value: `£${aov.toFixed(2)}` },
          { label: 'Last Order', value: orderList[0] ? new Date(orderList[0].created_at).toLocaleDateString('en-GB') : '—' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
            <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: '1.5rem', color: '#111' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

        {/* Left: Customer Details */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111' }}>Customer Details</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
              <p style={{ margin: '3px 0 0', color: '#111', fontWeight: 500 }}>{customer.email}</p>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
              <p style={{ margin: '3px 0 0', color: '#111', fontWeight: 500 }}>{phone || <span style={{ color: '#9ca3af' }}>Not provided</span>}</p>
            </div>
            {addr && addr.address && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing Address</span>
                <p style={{ margin: '3px 0 0', color: '#111', lineHeight: 1.6 }}>
                  {addr.address}<br />
                  {addr.city}{addr.county ? `, ${addr.county}` : ''}<br />
                  {addr.postcode}
                </p>
              </div>
            )}
            {customer.shipping_address?.address && customer.shipping_address.address !== addr?.address && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shipping Address</span>
                <p style={{ margin: '3px 0 0', color: '#111', lineHeight: 1.6 }}>
                  {customer.shipping_address.address}<br />
                  {customer.shipping_address.city}{customer.shipping_address.county ? `, ${customer.shipping_address.county}` : ''}<br />
                  {customer.shipping_address.postcode}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order History */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111' }}>Order History</h2>

          {orderList.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No orders yet.</p>
          ) : (
            <table className={styles.table} style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orderList.map(order => {
                  const sc = statusColors[order.status] || { bg: '#f3f4f6', color: '#374151' };
                  const orderNum = order.order_number ? `#${order.order_number}` : `#${order.id.substring(0, 8).toUpperCase()}`;
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>{orderNum}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        {new Date(order.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td>
                        <span style={{ backgroundColor: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                        {order.notes?.includes('bacs') ? 'BACS' : 'Card'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>£{Number(order.total).toFixed(2)}</td>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className={styles.editBtn}>View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
