export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/utils/supabase/admin';
import { getCurrentRole } from '@/lib/roles.server';
import styles from '../admin.module.css';
import CustomersTable from './CustomersTable';

export default async function AdminCustomersPage() {
  const supabase = createAdminClient();
  const callerRole = await getCurrentRole();
  const isHeadChef = callerRole === 'head_chef';

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div><h2>Error loading customers</h2><p>{error.message}</p></div>;
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id, total, created_at')
    .order('created_at', { ascending: false });

  const statsMap: Record<string, { count: number; total: number; lastOrder: string | null }> = {};
  for (const order of orders || []) {
    if (!order.customer_id) continue;
    if (!statsMap[order.customer_id]) {
      statsMap[order.customer_id] = { count: 0, total: 0, lastOrder: null };
    }
    statsMap[order.customer_id].count += 1;
    statsMap[order.customer_id].total += Number(order.total);
    if (!statsMap[order.customer_id].lastOrder) {
      statsMap[order.customer_id].lastOrder = order.created_at;
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Customers</h1>
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{customers?.length || 0} registered accounts</span>
      </div>

      <CustomersTable
        customers={customers || []}
        statsMap={statsMap}
        isHeadChef={isHeadChef}
      />
    </div>
  );
}
