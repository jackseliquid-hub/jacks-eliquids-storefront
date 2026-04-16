import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal } = await request.json() as {
      code: string;
      subtotal: number;
    };

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the code (case-insensitive)
    const { data: discount, error } = await supabase
      .from('discount_codes')
      .select('*')
      .ilike('code', code.trim())
      .single();

    if (error || !discount) {
      return NextResponse.json({ error: 'Invalid discount code' }, { status: 404 });
    }

    // Check enabled
    if (!discount.enabled) {
      return NextResponse.json({ error: 'This code is no longer active' }, { status: 400 });
    }

    // Check dates
    const now = new Date();
    if (discount.starts_at && new Date(discount.starts_at) > now) {
      return NextResponse.json({ error: 'This code is not yet active' }, { status: 400 });
    }
    if (discount.expires_at && new Date(discount.expires_at) < now) {
      return NextResponse.json({ error: 'This code has expired' }, { status: 400 });
    }

    // Check usage limit
    if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
      return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 });
    }

    // Check minimum order
    if (discount.min_order !== null && subtotal < parseFloat(discount.min_order)) {
      return NextResponse.json(
        { error: `Minimum order of £${parseFloat(discount.min_order).toFixed(2)} required` },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = subtotal * (parseFloat(discount.value) / 100);
    } else {
      discountAmount = parseFloat(discount.value);
    }

    // Don't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    return NextResponse.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: parseFloat(discount.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      description: discount.type === 'percentage'
        ? `${parseFloat(discount.value)}% off`
        : `£${parseFloat(discount.value).toFixed(2)} off`,
    });
  } catch (err: any) {
    console.error('[Validate Discount]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
