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
  let productAttrsFixed = 0;
  let variationsFixed = 0;

  // ── Fix Products (text fields + attributes JSON) ─────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, category, brand, attributes')
    .range(0, 9999);

  for (const p of (products || [])) {
    const updates: Record<string, any> = {};

    // Decode text fields
    if (p.name && decode(p.name) !== p.name) updates.name = decode(p.name);
    if (p.description && decode(p.description) !== p.description) updates.description = decode(p.description);
    if (p.category && decode(p.category) !== p.category) updates.category = decode(p.category);
    if (p.brand && decode(p.brand) !== p.brand) updates.brand = decode(p.brand);

    // Decode product-level attributes JSON: { "Flavour": ["Lemon &amp; Lime", ...] }
    if (p.attributes && typeof p.attributes === 'object') {
      let attrChanged = false;
      const fixedAttrs: Record<string, string[]> = {};
      for (const [key, values] of Object.entries(p.attributes as Record<string, string[]>)) {
        const dk = decode(key);
        if (dk !== key) attrChanged = true;
        if (Array.isArray(values)) {
          const decoded = values.map((v: string) => {
            const dv = decode(String(v));
            if (dv !== String(v)) attrChanged = true;
            return dv;
          });
          fixedAttrs[dk] = decoded;
        } else {
          fixedAttrs[dk] = values;
        }
      }
      if (attrChanged) {
        updates.attributes = fixedAttrs;
        productAttrsFixed++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('products').update(updates).eq('id', p.id);
      productsFixed++;
    }
  }

  // ── Fix Variation Attributes ──────────────────────────────────────
  // Paginate since there can be many thousands
  let page = 0;
  const pageSize = 5000;
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data: variations } = await supabase
      .from('product_variations')
      .select('id, attributes')
      .range(from, to);

    if (!variations || variations.length === 0) break;

    for (const v of variations) {
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

    if (variations.length < pageSize) break;
    page++;
  }

  return NextResponse.json({
    success: true,
    productsFixed,
    productAttrsFixed,
    variationsFixed,
    message: `Decoded HTML entities in ${productsFixed} products (${productAttrsFixed} with attribute fixes) and ${variationsFixed} variations.`,
  });
}
