import { createClient } from '@/utils/supabase/server';
import { signout } from '@/app/login/actions';
import styles from '../account.module.css';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function OrdersHistoryPage() {
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

  // Fetch orders for this customer!
  // The 'customer_id' column on 'orders' table is required. 
  // We assume here the order was linked to user.id or email.
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

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
          <h1 className={styles.pageTitle}>Order History</h1>
          
          <div className={styles.cardGrid} style={{ gridTemplateColumns: '1fr' }}>
            <div className={styles.card}>
              {!orders || orders.length === 0 ? (
                <>
                  <p className={styles.emptyText}>You haven't placed any orders yet.</p>
                  <Link href="/products" className={styles.actionBtn} style={{display: 'inline-block', textDecoration: 'none'}}>Start Shopping</Link>
                </>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 8px', color: '#4b5563', fontSize: '14px' }}>Order ID</th>
                        <th style={{ padding: '12px 8px', color: '#4b5563', fontSize: '14px' }}>Date</th>
                        <th style={{ padding: '12px 8px', color: '#4b5563', fontSize: '14px' }}>Status</th>
                        <th style={{ padding: '12px 8px', color: '#4b5563', fontSize: '14px' }}>Total</th>
                        <th style={{ padding: '12px 8px', color: '#4b5563', fontSize: '14px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const shortId = order.order_number ? order.order_number.toString() : order.id.split('-')[0].toUpperCase();
                        return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '16px 8px', fontWeight: '500' }}>#{shortId}</td>
                          <td style={{ padding: '16px 8px', color: '#6b7280' }}>
                            {new Date(order.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '9999px', 
                              backgroundColor: order.status === 'processing' ? '#e0f2fe' : order.status === 'shipped' ? '#dcfce3' : '#f3f4f6',
                              color: order.status === 'processing' ? '#0369a1' : order.status === 'shipped' ? '#166534' : '#374151',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'capitalize'
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px 8px', fontWeight: '500' }}>£{Number(order.total).toFixed(2)}</td>
                          <td style={{ padding: '16px 8px' }}>
                            <Link href={`/account/orders/${order.id}`} style={{ color: '#0d9488', textDecoration: 'none', fontWeight: '500' }}>
                              View Details
                            </Link>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
}
