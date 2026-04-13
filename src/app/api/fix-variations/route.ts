import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEMPORARY: Final cleanup — catches variations where the "/" was already
 * removed from the key but the VALUE still contains a combined
 * "Flavour + Strength" pattern like "Heisenberg 10mg".
 *
 * Also handles any remaining "/" keys.
 * DELETE THIS FILE after running once.
 */

export const maxDuration = 60;
export const runtime = 'nodejs';

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

      // Case A: Still has "/" in key (leftover from previous)
      const compositeKey = keys.find(k => k.includes('/'));
      if (compositeKey) {
        const parts = compositeKey.split('/').map((s: string) => s.trim());
        const combinedVal = vAttrs[compositeKey];
        const match = combinedVal?.match(/^(.+?)\s+(\d+mg)$/i);

        const newVAttrs: Record<string, string> = {};
        for (const [k, val] of Object.entries(vAttrs)) {
          if (k !== compositeKey) newVAttrs[k] = val as string;
        }
        if (match && parts.length === 2) {
          newVAttrs[parts[0]] = match[1].trim();
          newVAttrs[parts[1]] = match[2];
        } else if (parts.length === 2) {
          newVAttrs[parts[0]] = combinedVal;
        }

        varUpdates.push({ id: v.id, productId: v.product_id, attrs: newVAttrs });
        affectedProductIds.add(v.product_id);
        continue;
      }

      // Case B: Key is clean but VALUE still has combined pattern "Something 10mg"
      // AND there's no separate "Strength" key yet
      if (keys.length === 1 && !keys.includes('Strength')) {
        const key = keys[0];
        const val = vAttrs[key];
        const match = val?.match(/^(.+?)\s+(\d+mg)$/i);
        if (match) {
          const newVAttrs: Record<string, string> = {
            [key]: match[1].trim(),
            'Strength': match[2],
          };
          varUpdates.push({ id: v.id, productId: v.product_id, attrs: newVAttrs });
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

    // 4. Rebuild product-level attributes from the corrected variation data
    const productFixes: { id: string; attrs: Record<string, string[]> }[] = [];
    const fixedSkus: string[] = [];

    for (const productId of affectedProductIds) {
      const { data: prodData } = await supabase
        .from('products')
        .select('id, sku')
        .eq('id', productId)
        .single();

      if (!prodData) continue;

      // Get ALL variations for this product (now fixed)
      const { data: prodVars } = await supabase
        .from('product_variations')
        .select('attributes')
        .eq('product_id', productId);

      if (!prodVars || prodVars.length === 0) continue;

      // Rebuild product attributes from variations
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
      message: `Cleanup complete: fixed ${varUpdates.length} variations across ${productFixes.length} products.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
