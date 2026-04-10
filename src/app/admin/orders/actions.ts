'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from '@/lib/email';

// Shared helper: fetches order items and enriches them with product images
async function getItemsWithImages(supabase: any, orderId: string) {
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  const rawItems = items || [];
  if (rawItems.length === 0) return [];

  const productIds = Array.from(new Set(rawItems.map((i: any) => i.product_id)));
  const { data: products } = await supabase
    .from('products')
    .select('id, image')
    .in('id', productIds);

  const imgMap = (products || []).reduce((acc: any, p: any) => {
    if (p.image) acc[p.id] = p.image;
    return acc;
  }, {});

  return rawItems.map((item: any) => ({
    ...item,
    image_url: imgMap[item.product_id] || undefined
  }));
}

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

  if (newStatus === 'processing' || newStatus === 'shipped') {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();

    if (order && order.billing_address) {
      const orderNumberStr = order.order_number ? order.order_number.toString() : orderId.substring(0, 8).toUpperCase();
      const itemsWithImages = await getItemsWithImages(supabase, orderId);

      const emailParams = {
        emailTo: order.billing_address.email,
        orderNumber: orderNumberStr,
        firstName: order.billing_address.first_name,
        paymentMethod: 'viva',
        subtotal: order.subtotal,
        shipping: order.shipping_cost,
        discount: order.discount_total,
        total: order.total,
        items: itemsWithImages,
        billingAddress: order.billing_address,
        shippingAddress: order.shipping_address
      };

      if (newStatus === 'processing') {
        await sendOrderConfirmationEmail(emailParams);
      } else {
        await sendOrderShippedEmail(emailParams);
      }
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

  if (newStatus === 'processing' || newStatus === 'shipped') {
    const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds);
    if (orders) {
      for (const order of orders) {
        if (order.billing_address) {
          const orderNumberStr = order.order_number ? order.order_number.toString() : order.id.substring(0, 8).toUpperCase();
          const itemsWithImages = await getItemsWithImages(supabase, order.id);

          const emailParams = {
            emailTo: order.billing_address.email,
            orderNumber: orderNumberStr,
            firstName: order.billing_address.first_name,
            paymentMethod: 'viva',
            subtotal: order.subtotal,
            shipping: order.shipping_cost,
            discount: order.discount_total,
            total: order.total,
            items: itemsWithImages,
            billingAddress: order.billing_address,
            shippingAddress: order.shipping_address
          };

          if (newStatus === 'processing') {
            await sendOrderConfirmationEmail(emailParams);
          } else {
            await sendOrderShippedEmail(emailParams);
          }
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
