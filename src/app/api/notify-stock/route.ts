import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variationId, productId, email, name } = body;

    if (!variationId || !productId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields (variationId, productId, email)' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey);

    // Upsert to prevent duplicates (same email + same variation)
    const { error } = await supabase
      .from('stock_notifications')
      .upsert(
        {
          variation_id: variationId,
          product_id: productId,
          email: email.toLowerCase().trim(),
          name: name?.trim() || null,
          notified: false,
        },
        { onConflict: 'email,variation_id' }
      );

    if (error) {
      console.error('[notify-stock] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notify-stock] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
