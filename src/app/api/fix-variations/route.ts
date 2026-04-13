import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEMPORARY: Final cleanup — handles ALL variation formats:
 *   "06mg - Attraction"  → Flavour: "Attraction", Strength: "06mg"
 *   "Strawberry Ice 10mg" → Flavour: "Strawberry Ice", Strength: "10mg"
 *   "Flavour/Strength" keys still with "/"
 *
 * DELETE THIS FILE after running once.
 */

export const maxDuration = 60;
export const runtime = 'nodejs';

// Try to split a value into flavour + strength
function trySplit(val: string): { flavour: string; strength: string } | null {
  if (!val) return null;

  // Format 1: "06mg - Attraction" (strength at front with dash)
  const m1 = val.match(/^(\d+mg)\s*[-–]\s*(.+)$/i);
  if (m1) return { strength: m1[1], flavour: m1[2].trim() };

  // Format 2: "Strawberry Ice 10mg" (strength at end)
  const m2 = val.match(/^(.+?)\s+(\d+mg)$/i);
  if (m2) return { strength: m2[2], flavour: m2[1].trim() };

  return null;
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey);
    const BATCH = 25;

    // 1. Fetch ALL variations
    let allVars: any[] = [];
    for (let page = 0; ; page++) {
      const { data } = await supabase
        .from('product_variations')
        .select('id, product_id, attributes')
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      allVars = allVars.concat(data);
      if (data.length < 1000) break;
    }

    // 2. Find variations needing fix
    const varUpdates: { id: string; productId: string; attrs: Record<string, string> }[] = [];
    const affectedProductIds = new Set<string>();

    for (const v of allVars) {
      const vAttrs = v.attributes as Record<string, string> | null;
      if (!vAttrs) continue;
      const keys = Object.keys(vAttrs);

      // Case A: Still has "/" in key
      const compositeKey = keys.find(k => k.includes('/'));
      if (compositeKey) {
        const parts = compositeKey.split('/').map((s: string) => s.trim());
        const combinedVal = vAttrs[compositeKey];

        const newVAttrs: Record<string, string> = {};
        for (const [k, val] of Object.entries(vAttrs)) {
          if (k !== compositeKey) newVAttrs[k] = val as string;
        }

        const split = trySplit(combinedVal);
        if (split && parts.length === 2) {
          newVAttrs[parts[0]] = split.flavour;
          newVAttrs[parts[1]] = split.strength;
        } else if (parts.length === 2) {
          newVAttrs[parts[0]] = combinedVal;
        }

        varUpdates.push({ id: v.id, productId: v.product_id, attrs: newVAttrs });
        affectedProductIds.add(v.product_id);
        continue;
      }

      // Case B: Single key, no "Strength" key, and value looks combined
      if (keys.length === 1 && !keys.includes('Strength')) {
        const key = keys[0];
        const val = vAttrs[key];
        const split = trySplit(val);
        if (split) {
          varUpdates.push({
            id: v.id,
            productId: v.product_id,
            attrs: { [key]: split.flavour, 'Strength': split.strength },
          });
          affectedProductIds.add(v.product_id);
        }
      }
    }

    // 3. Batch update variations
    for (let i = 0; i < varUpdates.length; i += BATCH) {
      const chunk = varUpdates.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, attrs }) =>
        supabase.from('product_variations').update({ attributes: attrs }).eq('id', id)
      ));
    }

    // 4. Rebuild product-level attributes from corrected variation data
    const productFixes: { id: string; attrs: Record<string, string[]> }[] = [];
    const fixedSkus: string[] = [];

    for (const productId of affectedProductIds) {
      const { data: prodData } = await supabase
        .from('products')
        .select('id, sku')
        .eq('id', productId)
        .single();
      if (!prodData) continue;

      const { data: prodVars } = await supabase
        .from('product_variations')
        .select('attributes')
        .eq('product_id', productId);
      if (!prodVars || prodVars.length === 0) continue;

      const attrSets: Record<string, Set<string>> = {};
      for (const pv of prodVars) {
        const pvAttrs = pv.attributes as Record<string, string> | null;
        if (!pvAttrs) continue;
        for (const [key, val] of Object.entries(pvAttrs)) {
          if (!attrSets[key]) attrSets[key] = new Set();
          attrSets[key].add(val);
        }
      }

      const newProductAttrs: Record<string, string[]> = {};
      for (const [key, valueSet] of Object.entries(attrSets)) {
        newProductAttrs[key] = [...valueSet];
      }

      productFixes.push({ id: productId, attrs: newProductAttrs });
      fixedSkus.push(prodData.sku || productId);
    }

    // 5. Batch update products
    for (let i = 0; i < productFixes.length; i += BATCH) {
      const chunk = productFixes.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, attrs }) =>
        supabase.from('products').update({ attributes: attrs }).eq('id', id)
      ));
    }

    return NextResponse.json({
      success: true,
      fixedVariations: varUpdates.length,
      fixedProducts: productFixes.length,
      fixedSkus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
