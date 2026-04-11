'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { buildRMPayload, createClickDropOrders } from '@/lib/royalmail';
import { revalidatePath } from 'next/cache';

export type PushResult = {
  success: boolean;
  rmOrderId?: number;
  message: string;
};

export async function pushToRoyalMail(orderId: string): Promise<PushResult> {
  const supabase = createAdminClient();

  // Fetch the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, message: 'Order not found.' };
  }

  if (order.royal_mail_order_id) {
    return {
      success: false,
      message: `Already sent — Click & Drop order #${order.royal_mail_order_id}`,
    };
  }

  // Fetch order items for the payload contents
  const { data: rawItems } = await supabase
    .from('order_items')
    .select('product_name, variant_name, quantity, unit_price, discounted_price, line_total')
    .eq('order_id', orderId);

  const orderWithItems = {
    ...order,
    items: rawItems || [],
  };

  // Build the Royal Mail payload
  const payload = buildRMPayload(orderWithItems);

  try {
    const response = await createClickDropOrders([payload]);

    if (response.successCount > 0 && response.createdOrders.length > 0) {
      const rmOrder = response.createdOrders[0];

      // Save the RM order ID back to the order
      await supabase
        .from('orders')
        .update({ royal_mail_order_id: rmOrder.orderIdentifier })
        .eq('id', orderId);

      revalidatePath(`/admin/orders/${orderId}`);
      return {
        success: true,
        rmOrderId: rmOrder.orderIdentifier,
        message: `✅ Pushed to Click & Drop — Order #${rmOrder.orderIdentifier}`,
      };
    }

    // Had errors
    const firstError = response.failedOrders[0]?.errors[0];
    return {
      success: false,
      message: firstError
        ? `Royal Mail rejected: ${firstError.errorMessage}`
        : 'Unknown error from Royal Mail.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `API error: ${msg}` };
  }
}
