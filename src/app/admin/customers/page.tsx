export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCurrentRole } from '@/lib/roles.server';
import type { UserRole } from '@/lib/roles';
import RoleDropdown from './RoleDropdown';
import styles from '../admin.module.css';

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

      <div className={styles.dataContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Registered</th>
              <th>Last Order</th>
              <th style={{ textAlign: 'center' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Total Spend</th>
              <th style={{ textAlign: 'right' }}>AOV</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(customers || []).map(customer => {
              const stats = statsMap[customer.id] || { count: 0, total: 0, lastOrder: null };
              const aov = stats.count > 0 ? stats.total / stats.count : 0;
              const phone = customer.phone || customer.billing_address?.phone || null;
              const role = (customer.role || 'customer') as UserRole;

              return (
                <tr key={customer.id}>
                  <td>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      style={{ color: 'var(--deep-teal)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {customer.first_name} {customer.last_name}
                    </Link>
                  </td>
                  <td style={{ color: '#4b5563', fontSize: '0.9rem' }}>{customer.email}</td>
                  <td style={{ color: '#4b5563', fontSize: '0.9rem' }}>{phone || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td>
                    <RoleDropdown
                      customerId={customer.id}
                      currentRole={role}
                      canEdit={isHeadChef}
                    />
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {new Date(customer.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {stats.lastOrder ? new Date(stats.lastOrder).toLocaleDateString('en-GB') : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {stats.count > 0 ? (
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        style={{
                          display: 'inline-block', backgroundColor: '#0f766e', color: '#fff',
                          borderRadius: '9999px', padding: '2px 12px', fontWeight: 700,
                          fontSize: '0.85rem', textDecoration: 'none', minWidth: '32px', textAlign: 'center'
                        }}
                      >
                        {stats.count}
                      </Link>
                    ) : (
                      <span style={{ color: '#d1d5db' }}>0</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {stats.total > 0 ? `£${stats.total.toFixed(2)}` : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', color: '#6b7280' }}>
                    {aov > 0 ? `£${aov.toFixed(2)}` : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td>
                    <Link href={`/admin/customers/${customer.id}`} className={styles.editBtn}>View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
