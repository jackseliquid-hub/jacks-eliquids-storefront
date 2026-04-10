import { createClient } from '@/utils/supabase/server';
import { signout } from '@/app/login/actions';
import styles from '../account.module.css';
import AddressForm from './AddressForm';
import Link from 'next/link';

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
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
            <Link href="/account">My Profile</Link>
            <Link href="/account/orders">Order History</Link>
            <Link href="/account/addresses" className={styles.active}>Addresses</Link>
            <form action={signout}>
              <button type="submit" className={styles.logoutBtn}>Sign Out</button>
            </form>
          </nav>
        </aside>

        <main className={styles.mainContent}>
          <h1 className={styles.pageTitle}>Address Book</h1>
          
          <div className={styles.cardGrid}>
            <AddressForm profile={profile} />
          </div>
        </main>
        
      </div>
    </div>
  );
}
