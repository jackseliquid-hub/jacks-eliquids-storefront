export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createAdminClient } from '@/utils/supabase/admin';
import styles from '../admin.module.css';

import OrdersTable from './OrdersTable';

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
      shipping_address,
      order_number
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
        <OrdersTable initialOrders={orders || []} />
      </div>
    </div>
  );
}
