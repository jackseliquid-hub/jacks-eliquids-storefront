import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEMPORARY: One-time fix to split combined variation attributes.
 * e.g. { "Flavour/Strength": "Strawberry Ice 10mg" }
 *   → { "Flavour": "Strawberry Ice", "Strength": "10mg" }
 *
 * DELETE THIS FILE after running once.
 */

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey);

    // 1. Fetch ALL products with their attributes
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name, sku, attributes')
      .range(0, 9999);

    if (pErr) throw new Error(pErr.message);

    let fixedProducts = 0;
    let fixedVariations = 0;
    const fixedSkus: string[] = [];

    for (const prod of (products || [])) {
      const attrs = prod.attributes as Record<string, string[]> | null;
      if (!attrs) continue;

      // Find any attribute key containing "/" (e.g. "Flavour/Strength")
      const compositeKey = Object.keys(attrs).find(k => k.includes('/'));
      if (!compositeKey) continue;

      const parts = compositeKey.split('/').map((s: string) => s.trim());
      if (parts.length !== 2) continue;

      // Split the combined values into separate attribute arrays
      const values = attrs[compositeKey] || [];
      const attrA = new Set<string>();
      const attrB = new Set<string>();

      for (const val of values) {
        const match = val.match(/^(.+?)\s+(\d+mg)$/i);
        if (match) {
          attrA.add(match[1].trim());
          attrB.add(match[2]);
        } else {
          // Can't split — keep in first attribute
          attrA.add(val);
        }
      }

      // Build new attributes (remove the combined key)
      const newAttrs: Record<string, string[]> = {};
      // Copy any other attributes that aren't the composite one
      for (const [k, v] of Object.entries(attrs)) {
        if (k !== compositeKey) newAttrs[k] = v as string[];
      }
      if (attrA.size > 0) newAttrs[parts[0]] = [...attrA];
      if (attrB.size > 0) newAttrs[parts[1]] = [...attrB];

      // Update the product
      await supabase.from('products').update({ attributes: newAttrs }).eq('id', prod.id);
      fixedProducts++;
      fixedSkus.push(prod.sku || prod.id);

      // 2. Now fix all variations of this product
      const { data: variations } = await supabase
        .from('product_variations')
        .select('id, attributes')
        .eq('product_id', prod.id);

      for (const v of (variations || [])) {
        const vAttrs = v.attributes as Record<string, string> | null;
        if (!vAttrs) continue;

        const vCompositeKey = Object.keys(vAttrs).find(k => k.includes('/'));
        if (!vCompositeKey) continue;

        const vParts = vCompositeKey.split('/').map((s: string) => s.trim());
        if (vParts.length !== 2) continue;

        const combinedVal = vAttrs[vCompositeKey];
        const match = combinedVal?.match(/^(.+?)\s+(\d+mg)$/i);

        let newVAttrs: Record<string, string> = {};
        // Copy non-composite attributes
        for (const [k, val] of Object.entries(vAttrs)) {
          if (k !== vCompositeKey) newVAttrs[k] = val as string;
        }

        if (match) {
          newVAttrs[vParts[0]] = match[1].trim();
          newVAttrs[vParts[1]] = match[2];
        } else {
          newVAttrs[vParts[0]] = combinedVal;
        }

        await supabase.from('product_variations').update({ attributes: newVAttrs }).eq('id', v.id);
        fixedVariations++;
      }
    }

    return NextResponse.json({
      success: true,
      fixedProducts,
      fixedVariations,
      fixedSkus,
      message: `Fixed ${fixedProducts} products and ${fixedVariations} variations. You can now delete this API route.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
