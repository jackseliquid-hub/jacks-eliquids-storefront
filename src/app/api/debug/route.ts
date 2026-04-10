import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: order, error: orderError } = await supabase.from('orders').select('shipping_address, billing_address').order('created_at', { ascending: false }).limit(1);
    const { data: cust, error: custError } = await supabase.from('customers').select('shipping_address, billing_address, first_name').order('created_at', { ascending: false }).limit(1);
    
    return NextResponse.json({ 
      order: order?.[0] || null, 
      cust: cust?.[0] || null,
      errors: { orderError, custError }
    });
  } catch(e: any) {
    return NextResponse.json({ crash: e.message });
  }
}
