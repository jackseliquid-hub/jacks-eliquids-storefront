export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createAdminClient } from '@/utils/supabase/admin';
import styles from '../admin.module.css';

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();

  // Fetch all orders bypassing RLS
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      total,
      created_at,
      shipping_address
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div>
        <h2>Error Loading Orders</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Order Management (The Kitchen)</h1>
      </div>

      <div className={styles.dataContainer}>
        {(!orders || orders.length === 0) ? (
          <p>No orders currently in the system.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const d = new Date(order.created_at);
                const shortId = order.id.substring(0, 8).toUpperCase();
                const statusColor = 
                  order.status === 'pending' ? '#ca8a04' :
                  order.status === 'processing' ? '#0d9488' :
                  order.status === 'shipped' ? '#2563eb' :
                  '#111';

                const name = order.shipping_address 
                  ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
                  : 'Guest';

                return (
                  <tr key={order.id}>
                    <td>{d.toLocaleDateString()} {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td><strong>#{shortId}</strong></td>
                    <td>{name}</td>
                    <td>£{order.total.toFixed(2)}</td>
                    <td>
                      <span style={{ 
                        color: statusColor, 
                        fontWeight: 600, 
                        textTransform: 'uppercase',
                        fontSize: '0.8rem',
                        backgroundColor: `${statusColor}15`,
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className={styles.editBtn}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
