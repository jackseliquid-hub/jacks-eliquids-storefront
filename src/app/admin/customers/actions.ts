'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { getCurrentRole } from '@/lib/roles.server';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/lib/roles';

export async function updateCustomerRole(customerId: string, newRole: UserRole) {
  // Only Head Chefs can change roles
  const callerRole = await getCurrentRole();
  if (callerRole !== 'head_chef') {
    return { error: 'Only Head Chefs can change user roles.' };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('customers')
    .update({ role: newRole })
    .eq('id', customerId);

  if (error) {
    console.error('Role update error:', error);
    return { error: 'Failed to update role.' };
  }

  revalidatePath('/admin/customers');
  return { success: true };
}
