'use server';

import { createClient } from '@/utils/supabase/server';
import { CartItem } from '@/context/CartContext';
import { ShippingConfig, calculateShippingQuote } from '@/lib/shipping';
import { calculateBestPrice, getDiscountRules } from '@/lib/discounts';
import { sendOrderConfirmationEmail } from '@/lib/email';

interface CheckoutPayload {
  paymentMethod: 'viva' | 'bacs';
  cartItems: CartItem[];
  shippingConfig: ShippingConfig;
  shipToDifferent: boolean;
  billingAddress: any;
  shippingAddress: any | null;
}

export async function processOrder(payload: CheckoutPayload) {
  const supabase = await createClient();
  const rules = await getDiscountRules();
  
  let subtotal = 0;
  let discountTotal = 0;
  
  const productQuantities: Record<string, number> = {};
  payload.cartItems.forEach(i => {
    const parentId = i.productId || i.id;
    productQuantities[parentId] = (productQuantities[parentId] || 0) + i.quantity;
  });

  const validOrderItems = payload.cartItems.map(item => {
    const parentId = item.productId || item.id;
    const totalQty = productQuantities[parentId] || item.quantity;
    
    const originalPriceNum = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    
    const { price: bestPrice } = calculateBestPrice(
      item.price,
      totalQty,
      { id: parentId, category: item.category, tags: item.tags },
      rules
    );

    const lineTotal = bestPrice * item.quantity;
    const originalLineTotal = originalPriceNum * item.quantity;
    
    subtotal += lineTotal;
    discountTotal += (originalLineTotal - lineTotal);

    return {
      product_id: parentId,
      variation_id: item.variantName ? item.id : null,
      product_name: item.name,
      variant_name: item.variantName || null,
      quantity: item.quantity,
      unit_price: originalPriceNum,
      discounted_price: bestPrice,
      line_total: lineTotal
    };
  });

  const shippingQuote = calculateShippingQuote(payload.cartItems, payload.shippingConfig);
  const finalTotal = subtotal + shippingQuote.shippingCost;

  const { data: { user } } = await supabase.auth.getUser();
  let customerId = null;
  if (user) {
    customerId = user.id;

    // Automatically update the user's saved account profile with their latest checkout addresses
    const adminSupabase = await import('@/utils/supabase/admin').then(m => m.createAdminClient());
    await adminSupabase.from('customers').upsert({
      id: user.id,
      email: payload.billingAddress.email || user.email,
      billing_address: payload.billingAddress,
      shipping_address: payload.shipToDifferent ? payload.shippingAddress : payload.billingAddress,
      first_name: payload.billingAddress.first_name,
      last_name: payload.billingAddress.last_name
    }, { onConflict: 'id' });
  }

  // The final address we ship to
  const finalShippingAddress = payload.shipToDifferent 
    ? payload.shippingAddress 
    : payload.billingAddress;

  const { data: orderParams, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'pending',
      subtotal: subtotal,
      shipping_cost: shippingQuote.shippingCost,
      discount_total: discountTotal,
      total: finalTotal,
      billing_address: payload.billingAddress,
      shipping_address: finalShippingAddress,
      notes: `Requested Payment Method: ${payload.paymentMethod}\nDEBUG PAYLOAD:\n${JSON.stringify({shipToDifferent: payload.shipToDifferent, b_name: payload.billingAddress.first_name, s_name: payload.shippingAddress?.first_name}, null, 2)}`
    })
    .select('id')
    .single();

  if (orderError || !orderParams) {
    console.error("Order Insert Error", orderError);
    return { error: 'Failed to generate order ID.' };
  }

  const orderId = orderParams.id;

  const itemsToInsert = validOrderItems.map(i => ({
    ...i,
    order_id: orderId
  }));
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("Order Items Insert Error", itemsError);
    return { error: 'Failed to record cart items to database.' };
  }

  if (payload.paymentMethod === 'bacs') {
    
    // Dispatch BACS "On Hold" Confirmation Email
    await sendOrderConfirmationEmail({
      emailTo: payload.billingAddress.email,
      orderNumber: orderId.substring(0, 8).toUpperCase(),
      firstName: payload.billingAddress.first_name,
      paymentMethod: 'bacs',
      subtotal: subtotal,
      shipping: shippingQuote.shippingCost,
      discount: discountTotal,
      total: finalTotal,
      items: validOrderItems,
      billingAddress: payload.billingAddress,
      shippingAddress: finalShippingAddress
    });

    return { 
      success: true, 
      redirectUrl: `/checkout/success?order_id=${orderId}&method=bacs` 
    };
  }

  if (payload.paymentMethod === 'viva') {
    const merchantId = process.env.VIVA_WALLET_MERCHANT_ID;
    const apiKey = process.env.VIVA_WALLET_API_KEY;
    const sourceCode = process.env.VIVA_WALLET_SOURCE_CODE;
    const vivaApiUrl = process.env.VIVA_WALLET_API_URL || "https://api.vivapayments.com/checkout/v2";
    const vivaCheckoutUrl = process.env.NEXT_PUBLIC_VIVA_WALLET_URL || "https://www.vivapayments.com/web/checkout";

    if (!merchantId || !apiKey) {
      console.warn("Viva Wallet Keys are missing. Entering Sandbox / Simulation Mode.");
      return { 
        success: true, 
        redirectUrl: `/checkout/success?order_id=${orderId}&method=viva_simulation` 
      };
    }

    try {
      const authObj = Buffer.from(`${merchantId}:${apiKey}`).toString('base64');
      const amountInPence = Math.round(finalTotal * 100);

      const response = await fetch(`${vivaApiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authObj}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPence,
          customerTrns: `Jacks eLiquid Order #${orderId.substring(0,8)}`,
          customer: {
            email: payload.billingAddress.email,
            fullName: `${payload.billingAddress.first_name} ${payload.billingAddress.last_name}`,
            countryCode: "GB"
          },
          sourceCode: sourceCode || "Default",
          merchantTrns: orderId
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Viva API Error", errText);
        return { error: 'Payment gateway rejected request.' };
      }

      const responseData = await response.json();
      const orderCode = responseData.orderCode;

      return {
        success: true,
        redirectUrl: `${vivaCheckoutUrl}?ref=${orderCode}`
      };

    } catch (err) {
      console.error("Viva API Fetch Failure", err);
      return { error: 'Failed to communicate with payment gateway.' };
    }
  }

  return { error: 'Invalid payment method selected.' };
}
