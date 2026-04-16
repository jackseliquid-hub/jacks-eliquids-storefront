'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { CartItem } from '@/context/CartContext';
import { ShippingQuote } from '@/lib/shipping';

import { calculateBestPrice, getDiscountRules } from '@/lib/discounts';
import { sendOrderConfirmationEmail, sendAdminOrderAlert } from '@/lib/email';

interface CheckoutPayload {
  paymentMethod: 'viva' | 'bacs';
  cartItems: CartItem[];
  selectedShipping: ShippingQuote;
  shipToDifferent: boolean;
  billingAddress: any;
  shippingAddress: any | null;
  discountCode: string | null;
  couponDiscount: number;
  customerNotes: string | null;
}

export async function processOrder(payload: CheckoutPayload) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient(); // bypasses RLS — needed for guest checkout
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

  const shippingQuote = payload.selectedShipping;
  const couponDiscount = payload.couponDiscount || 0;

  // Server-side re-validate discount code if provided
  if (payload.discountCode) {
    const { data: discountRow } = await adminSupabase
      .from('discount_codes')
      .select('*')
      .ilike('code', payload.discountCode)
      .single();

    if (!discountRow || !discountRow.enabled) {
      return { error: 'Discount code is no longer valid.' };
    }
    const now = new Date();
    if (discountRow.expires_at && new Date(discountRow.expires_at) < now) {
      return { error: 'Discount code has expired.' };
    }
    if (discountRow.max_uses !== null && discountRow.used_count >= discountRow.max_uses) {
      return { error: 'Discount code has reached its usage limit.' };
    }

    // Increment used_count
    await adminSupabase
      .from('discount_codes')
      .update({ used_count: (discountRow.used_count || 0) + 1 })
      .eq('id', discountRow.id);
  }

  const finalTotal = subtotal + shippingQuote.shippingCost - couponDiscount;

  const { data: { user } } = await supabase.auth.getUser();
  let customerId = null;
  if (user) {
    customerId = user.id;

    // Automatically update the user's saved account profile with their latest checkout addresses
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

  // Build order notes
  const notesParts: string[] = [];
  notesParts.push(`Payment Method: ${payload.paymentMethod}`);
  if (payload.discountCode) notesParts.push(`Coupon: ${payload.discountCode} (-£${couponDiscount.toFixed(2)})`);
  if (payload.customerNotes) notesParts.push(`Customer Notes: ${payload.customerNotes}`);

  // Use admin client so guests (unauthenticated) can also place orders — RLS would block them
  const { data: orderParams, error: orderError } = await adminSupabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'pending',
      subtotal: subtotal,
      shipping_cost: shippingQuote.shippingCost,
      discount_total: discountTotal + couponDiscount,
      total: finalTotal,
      billing_address: payload.billingAddress,
      shipping_address: finalShippingAddress,
      notes: notesParts.join('\n')
    })
    .select('id, order_number')
    .single();

  if (orderError || !orderParams) {
    console.error("Order Insert Error", orderError);
    return { error: 'Failed to generate order ID.' };
  }

  const orderId = orderParams.id;
  const orderNumberStr = orderParams.order_number ? orderParams.order_number.toString() : orderId.substring(0, 8).toUpperCase();

  const itemsToInsert = validOrderItems.map(i => ({
    ...i,
    order_id: orderId
  }));
  
  const { error: itemsError } = await adminSupabase
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("Order Items Insert Error", itemsError);
    return { error: 'Failed to record cart items to database.' };
  }

  // Fetch product data using ADMIN client (bypasses RLS — guaranteed to get all fields)
  const productIds = Array.from(new Set(validOrderItems.map(i => i.product_id)));
  const { data: productDataRows, error: prodFetchErr } = await adminSupabase
    .from('products')
    .select('id, image, price, sale_price')
    .in('id', productIds);

  const productDataMap: Record<string, { image?: string; price?: string; sale_price?: string }> = {};
  (productDataRows || []).forEach((p: any) => {
    productDataMap[p.id] = { image: p.image, price: p.price, sale_price: p.sale_price };
  });

  // Also fetch variant prices for items that are variations
  const variantIds = validOrderItems.filter(i => i.variation_id).map(i => i.variation_id);
  let variantPriceMap: Record<string, string> = {};
  if (variantIds.length > 0) {
    const { data: variantRows } = await adminSupabase
      .from('product_variations')
      .select('id, price')
      .in('id', variantIds);
    (variantRows || []).forEach((v: any) => {
      if (v.price) variantPriceMap[v.id] = v.price;
    });
  }

  // Calculate savings: get the FULL RRP from DB, compare with what customer actually paid
  let productSavings = 0;

  // Helper: strip currency symbols (prices are stored as "£4.99" not "4.99")
  const parsePrice = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));

  validOrderItems.forEach(item => {
    const prod = productDataMap[item.product_id];
    if (!prod) return;

    // Collect all known prices for this item and take the MAX as the full RRP
    const prices: number[] = [];
    if (prod.price) prices.push(parsePrice(prod.price));
    if (prod.sale_price) prices.push(parsePrice(prod.sale_price));
    if (item.variation_id && variantPriceMap[item.variation_id]) {
      prices.push(parsePrice(variantPriceMap[item.variation_id]));
    }

    const validPrices = prices.filter(p => !isNaN(p) && p > 0);
    if (validPrices.length === 0) return;

    const fullRrp = Math.max(...validPrices);
    const paidPerUnit = Number(item.discounted_price) || Number(item.unit_price) || 0;


    if (fullRrp > paidPerUnit) {
      productSavings += (fullRrp - paidPerUnit) * item.quantity;
    }
  });


  const totalSavings = productSavings + couponDiscount;

  const savingsBreakdown = {
    saleSavings: 0,
    bulkSavings: 0,
    productSavings: Math.round(productSavings * 100) / 100,
    couponSavings: Math.round(couponDiscount * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    couponCode: payload.discountCode || undefined,
  };

  const itemsWithImages = validOrderItems.map(i => ({
    ...i,
    image_url: productDataMap[i.product_id]?.image || undefined
  }));

  if (payload.paymentMethod === 'bacs') {
    
    // Dispatch BACS "On Hold" Confirmation Email
    await sendOrderConfirmationEmail({
      emailTo: payload.billingAddress.email,
      orderNumber: orderNumberStr,
      firstName: payload.billingAddress.first_name,
      paymentMethod: 'bacs',
      subtotal: subtotal,
      shipping: shippingQuote.shippingCost,
      discount: couponDiscount,
      total: finalTotal,
      items: itemsWithImages,
      billingAddress: payload.billingAddress,
      shippingAddress: finalShippingAddress,
      couponCode: payload.discountCode || undefined,
      savings: savingsBreakdown
    });

    await sendAdminOrderAlert({
      emailTo: 'jackseliquid@gmail.com', // Not used physically by Admin Alert but required by interface
      orderId: orderId,
      orderNumber: orderNumberStr,
      firstName: payload.billingAddress.first_name,
      paymentMethod: 'bacs',
      subtotal: subtotal,
      shipping: shippingQuote.shippingCost,
      discount: couponDiscount,
      total: finalTotal,
      items: itemsWithImages,
      billingAddress: payload.billingAddress,
      shippingAddress: finalShippingAddress,
      couponCode: payload.discountCode || undefined,
      savings: savingsBreakdown
    });

    return { 
      success: true, 
      redirectUrl: `/checkout/success?order_id=${orderId}&order_number=${orderNumberStr}&method=bacs` 
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
      
      // Sandbox Mode: Manually dispatch the "Processing" and Admin emails immediately
      await sendOrderConfirmationEmail({
        emailTo: payload.billingAddress.email,
        orderNumber: orderNumberStr,
        firstName: payload.billingAddress.first_name,
        paymentMethod: 'viva',
        subtotal: subtotal,
        shipping: shippingQuote.shippingCost,
        discount: couponDiscount,
        total: finalTotal,
        items: itemsWithImages,
        billingAddress: payload.billingAddress,
        shippingAddress: finalShippingAddress,
        couponCode: payload.discountCode || undefined,
      savings: savingsBreakdown
      });

      await sendAdminOrderAlert({
        emailTo: 'jackseliquid@gmail.com',
        orderId: orderId,
        orderNumber: orderNumberStr,
        firstName: payload.billingAddress.first_name,
        paymentMethod: 'viva',
        subtotal: subtotal,
        shipping: shippingQuote.shippingCost,
        discount: couponDiscount,
        total: finalTotal,
        items: itemsWithImages,
        billingAddress: payload.billingAddress,
        shippingAddress: finalShippingAddress,
        couponCode: payload.discountCode || undefined,
      savings: savingsBreakdown
      });

      return { 
        success: true, 
        redirectUrl: `/checkout/success?order_id=${orderId}&order_number=${orderNumberStr}&method=viva_simulation` 
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
          customerTrns: `Jacks eLiquid Order #${orderNumberStr}`,
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
