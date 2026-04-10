'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function saveAddress(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to save an address.' };
  }

  const shipToDifferent = formData.get('ship_to_different') === 'on';

  const billingAddress = {
    first_name: formData.get('b_first_name') as string,
    last_name: formData.get('b_last_name') as string,
    country: formData.get('b_country') as string,
    address: formData.get('b_address') as string,
    city: formData.get('b_city') as string,
    county: formData.get('b_county') as string,
    postcode: formData.get('b_postcode') as string,
    phone: formData.get('b_phone') as string,
    email: formData.get('b_email') as string,
  };

  const shippingAddress = shipToDifferent ? {
    first_name: formData.get('s_first_name') as string,
    last_name: formData.get('s_last_name') as string,
    country: formData.get('s_country') as string,
    address: formData.get('s_address') as string,
    city: formData.get('s_city') as string,
    county: formData.get('s_county') as string,
    postcode: formData.get('s_postcode') as string,
    phone: formData.get('s_phone') as string,
    email: formData.get('s_email') as string,
  } : billingAddress;

  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from('customers')
    .upsert({ 
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || billingAddress.first_name,
      last_name: user.user_metadata?.last_name || billingAddress.last_name,
      billing_address: billingAddress,
      shipping_address: shippingAddress
    }, { onConflict: 'id' });

  if (error) {
    console.error('Save Address Error:', error);
    return { error: `Failed: ${error.message}` };
  }

  revalidatePath('/account/addresses');
  revalidatePath('/checkout');
  
  return { success: true };
}
