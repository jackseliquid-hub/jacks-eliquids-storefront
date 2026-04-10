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
      const orderNumberStr = order.order_number ? order.order_number.toString() : orderId.substring(0, 8).toUpperCase();
      await sendOrderConfirmationEmail({
        emailTo: order.billing_address.email,
        orderNumber: orderNumberStr,
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

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function bulkUpdateOrderStatuses(orderIds: string[], newStatus: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in('id', orderIds);

  if (error) {
    console.error("Failed to bulk update status:", error);
    return { error: 'Failed to bulk update order status.' };
  }

  // If moved to processing, we should ideally fire off emails for ALL of them.
  if (newStatus === 'processing') {
    const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds);
    if (orders) {
      for (const order of orders) {
        if (order.billing_address) {
          const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
          const orderNumberStr = order.order_number ? order.order_number.toString() : order.id.substring(0, 8).toUpperCase();
          await sendOrderConfirmationEmail({
            emailTo: order.billing_address.email,
            orderNumber: orderNumberStr,
            firstName: order.billing_address.first_name,
            paymentMethod: 'viva', 
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
    }
  }

  revalidatePath('/admin/orders');
  return { success: true };
}

export async function bulkDeleteOrders(orderIds: string[]) {
  const supabase = createAdminClient();

  // First delete order items to satisfy foreign keys
  await supabase.from('order_items').delete().in('order_id', orderIds);
  
  const { error } = await supabase.from('orders').delete().in('id', orderIds);

  if (error) {
    console.error("Failed to bulk delete orders:", error);
    return { error: 'Failed to delete orders.' };
  }

  revalidatePath('/admin/orders');
  return { success: true };
}
