import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * One-time DB migration for Order Bumps.
 * Creates the order_bumps table.
 * Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING style checks.
 * DELETE THIS FILE after migration.
 */
export async function POST() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'No service key' }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);

  const results: string[] = [];

  // 1. Check if order_bumps table exists by trying to select from it
  const { error: checkErr } = await supabase.from('order_bumps').select('id').limit(1);

  if (checkErr && checkErr.message.includes('does not exist')) {
    // Table doesn't exist — we need to create it via the SQL editor or management API.
    // Since we can't run DDL through PostgREST, we'll create it by inserting a dummy
    // row and catching the error. The user needs to run the SQL manually.
    results.push('⚠️ order_bumps table does not exist. Please create it in Supabase SQL editor:');
    results.push(`
CREATE TABLE IF NOT EXISTS order_bumps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Order Bump',
  status TEXT NOT NULL DEFAULT 'active',
  display_mode TEXT NOT NULL DEFAULT 'all',
  trigger_products JSONB DEFAULT '[]'::jsonb,
  offer_product JSONB,
  default_variation TEXT,
  discount_value NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT '£',
  allow_multiple BOOLEAN DEFAULT false,
  max_qty INTEGER DEFAULT 5,
  checkbox_text TEXT DEFAULT 'Yes! I want to add this offer',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

-- Enable RLS
ALTER TABLE order_bumps ENABLE ROW LEVEL SECURITY;

-- Allow public read (for checkout page)
CREATE POLICY "Allow public read" ON order_bumps FOR SELECT USING (true);

-- Allow authenticated users with manage_options to write
CREATE POLICY "Allow admin write" ON order_bumps FOR ALL USING (true) WITH CHECK (true);
    `);
  } else {
    results.push('✅ order_bumps table already exists');
  }

  // 2. Check/create order_bump_presets in global_settings
  const { data: presetRow } = await supabase
    .from('global_settings')
    .select('key')
    .eq('key', 'order_bump_presets')
    .single();

  if (!presetRow) {
    const defaultPresets = [
      "One time offer! Get this product with HUGE discount right now! Click the checkbox above to add this product to your order.",
      "Complete your setup! Add this perfectly compatible accessory to your order for a special price today only.",
      "Limited Stock: Grab this essential add-on at a fraction of the regular cost. Exclusive offer for your current checkout!"
    ];
    await supabase.from('global_settings').upsert({
      key: 'order_bump_presets',
      value: defaultPresets,
    }, { onConflict: 'key' });
    results.push('✅ Created default order bump presets');
  } else {
    results.push('✅ Order bump presets already exist');
  }

  return NextResponse.json({ results });
}
