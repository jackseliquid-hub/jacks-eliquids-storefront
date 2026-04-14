import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// One-time fix: decode HTML entities (&amp; → &, etc.) across all products and variations
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  function decode(str: string): string {
    if (!str) return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  }

  let productsFixed = 0;
  let variationsFixed = 0;

  // ── Fix Products ──────────────────────────────────────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, category, brand')
    .range(0, 9999);

  for (const p of (products || [])) {
    const updates: Record<string, string> = {};
    if (p.name && decode(p.name) !== p.name) updates.name = decode(p.name);
    if (p.description && decode(p.description) !== p.description) updates.description = decode(p.description);
    if (p.category && decode(p.category) !== p.category) updates.category = decode(p.category);
    if (p.brand && decode(p.brand) !== p.brand) updates.brand = decode(p.brand);

    if (Object.keys(updates).length > 0) {
      await supabase.from('products').update(updates).eq('id', p.id);
      productsFixed++;
    }
  }

  // ── Fix Variation Attributes ──────────────────────────────────────
  const { data: variations } = await supabase
    .from('product_variations')
    .select('id, attributes')
    .range(0, 49999);

  for (const v of (variations || [])) {
    if (!v.attributes || typeof v.attributes !== 'object') continue;

    let changed = false;
    const fixed: Record<string, string> = {};
    for (const [key, val] of Object.entries(v.attributes as Record<string, string>)) {
      const dk = decode(key);
      const dv = decode(String(val));
      if (dk !== key || dv !== String(val)) changed = true;
      fixed[dk] = dv;
    }

    if (changed) {
      await supabase.from('product_variations').update({ attributes: fixed }).eq('id', v.id);
      variationsFixed++;
    }
  }

  return NextResponse.json({
    success: true,
    productsFixed,
    variationsFixed,
    message: `Decoded HTML entities in ${productsFixed} products and ${variationsFixed} variations.`,
  });
}
