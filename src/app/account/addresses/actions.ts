'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveAddress(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to save an address.' };
  }

  const address = formData.get('address') as string;
  const city = formData.get('city') as string;
  const postcode = formData.get('postcode') as string;

  const { error } = await supabase
    .from('customers')
    .upsert({ 
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      address, 
      city, 
      postcode 
    }, { onConflict: 'id' });

  if (error) {
    console.error('Save Address Error:', error);
    return { error: 'Failed to update address.' };
  }

  revalidatePath('/account/addresses');
  revalidatePath('/checkout');
  
  return { success: true };
}
