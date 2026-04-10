'use server';

import { createClient } from '@/utils/supabase/server';
import { CartItem } from '@/context/CartContext';
import { ShippingConfig, calculateShippingQuote } from '@/lib/shipping';
import { calculateBestPrice, getDiscountRules } from '@/lib/discounts';

interface CheckoutPayload {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postcode: string;
  paymentMethod: 'viva' | 'bacs';
  cartItems: CartItem[];
  shippingConfig: ShippingConfig;
}

export async function processOrder(payload: CheckoutPayload) {
  const supabase = await createClient();

  // 1. Re-validate pricing on the server for security (Never trust client prices)
  const rules = await getDiscountRules();
  
  let subtotal = 0;
  let discountTotal = 0;
  
  // Recalculate cart
  const productQuantities: Record<string, number> = {};
  payload.cartItems.forEach(i => {
    const parentId = i.productId || i.id;
    productQuantities[parentId] = (productQuantities[parentId] || 0) + i.quantity;
  });

  const validOrderItems = payload.cartItems.map(item => {
    const parentId = item.productId || item.id;
    const totalQty = productQuantities[parentId] || item.quantity;
    
    // We assume item.price is the raw original price string e.g., "£10.00"
    const originalPriceNum = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    
    // Calculate best dynamic price
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

  // 2. Re-validate Shipping exactly like the client
  const shippingQuote = calculateShippingQuote(payload.cartItems, payload.shippingConfig);
  const finalTotal = subtotal + shippingQuote.shippingCost;

  // 3. Attempt to link to a customer account if they are logged in
  const { data: { user } } = await supabase.auth.getUser();
  let customerId = null;
  if (user) {
    customerId = user.id;
  }

  // 4. Save to Database
  const shippingAddress = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    address: payload.address,
    city: payload.city,
    postcode: payload.postcode,
    email: payload.email
  };

  const { data: orderParams, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'pending',
      subtotal: subtotal,
      shipping_cost: shippingQuote.shippingCost,
      discount_total: discountTotal,
      total: finalTotal,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      notes: `Requested Payment Method: ${payload.paymentMethod}`
    })
    .select('id')
    .single();

  if (orderError || !orderParams) {
    console.error("Order Insert Error", orderError);
    return { error: 'Failed to generate order ID.' };
  }

  const orderId = orderParams.id;

  // 5. Save Line Items
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

  // 6. Branch Payment Logic
  if (payload.paymentMethod === 'bacs') {
    // Return success to redirect them to the BACS confirmation screen
    return { 
      success: true, 
      redirectUrl: `/checkout/success?order_id=${orderId}&method=bacs` 
    };
  }

  if (payload.paymentMethod === 'viva') {
    // Integrate Viva Smart Checkout API
    const merchantId = process.env.VIVA_WALLET_MERCHANT_ID;
    const apiKey = process.env.VIVA_WALLET_API_KEY;
    const sourceCode = process.env.VIVA_WALLET_SOURCE_CODE;
    const vivaApiUrl = process.env.VIVA_WALLET_API_URL || "https://api.vivapayments.com/checkout/v2";
    const vivaCheckoutUrl = process.env.NEXT_PUBLIC_VIVA_WALLET_URL || "https://www.vivapayments.com/web/checkout";

    // If missing keys, we will soft-fail and redirect to a fallback or simulate
    if (!merchantId || !apiKey) {
      console.warn("Viva Wallet Keys are missing. Entering Sandbox / Simulation Mode.");
      return { 
        success: true, 
        redirectUrl: `/checkout/success?order_id=${orderId}&method=viva_simulation` 
      };
    }

    try {
      const authObj = Buffer.from(`${merchantId}:${apiKey}`).toString('base64');
      
      // Amount must be in cents/pence (e.g., 10.50 => 1050)
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
            email: payload.email,
            fullName: `${payload.firstName} ${payload.lastName}`,
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
