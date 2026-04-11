import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import type { UserRole } from './roles';

/**
 * Server-side: get the current user's role.
 * Returns null if not logged in.
 * Import this only in Server Components and Server Actions.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data } = await admin
      .from('customers')
      .select('role')
      .eq('id', user.id)
      .single();

    return (data?.role as UserRole) || 'customer';
  } catch {
    return null;
  }
}

/**
 * Server-side guard: redirects away if the user is not kitchen staff.
 */
export async function requireKitchenAccess(): Promise<UserRole> {
  const role = await getCurrentRole();
  if (!role || role === 'customer') {
    redirect('/');
  }
  return role;
}
