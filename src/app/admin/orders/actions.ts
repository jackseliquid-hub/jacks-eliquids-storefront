'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) {
    console.error("Failed to update status:", error);
    return { error: 'Failed to update order status.' };
  }

  // If status moved to processing, dispatch the processing confirmation email!
  if (newStatus === 'processing') {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);

    if (order && order.billing_address) {
      await sendOrderConfirmationEmail({
        emailTo: order.billing_address.email,
        orderNumber: orderId.substring(0, 8).toUpperCase(),
        firstName: order.billing_address.first_name,
        paymentMethod: 'viva', // This triggers the processing text instead of BACS on-hold text
        subtotal: order.subtotal,
        shipping: order.shipping_cost,
        discount: order.discount_total,
        total: order.total,
        items: items || [],
        billingAddress: order.billing_address,
        shippingAddress: order.shipping_address
      });
    }
  }

  // Revalidate the admin order views so they instantly reflect the change
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
