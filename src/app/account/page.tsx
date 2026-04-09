import { createClient } from '@/utils/supabase/server';
import { signout } from '@/app/login/actions';
import styles from './account.module.css';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load the public customer profile wrapper via the new table
  let profile = null;
  if (user) {
    const { data: customerData } = await supabase
      .from('customers')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();
      
    profile = customerData;
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
            <a href="/account" className={styles.active}>My Profile</a>
            <a href="/account/orders">Order History</a>
            <a href="/account/addresses">Addresses</a>
            <form action={signout}>
              <button type="submit" className={styles.logoutBtn}>Sign Out</button>
            </form>
          </nav>
        </aside>

        <main className={styles.mainContent}>
          <h1 className={styles.pageTitle}>Account Overview</h1>
          
          <div className={styles.cardGrid}>
            <div className={styles.card}>
              <h3>Profile Info</h3>
              <p><strong>Name:</strong> {profile?.first_name} {profile?.last_name}</p>
              <p><strong>Email:</strong> {profile?.email}</p>
              <button className={styles.actionBtn}>Edit Profile</button>
            </div>
            
            <div className={styles.card}>
              <h3>Recent Orders</h3>
              <p className={styles.emptyText}>You haven't placed any orders yet.</p>
              <button className={styles.actionBtn}>Start Shopping</button>
            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
}
