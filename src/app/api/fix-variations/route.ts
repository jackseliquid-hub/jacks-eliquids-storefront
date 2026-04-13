import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEMPORARY: Cleanup pass — fixes variations that still have "/" in their
 * attribute keys, AND rebuilds the parent product attributes from the
 * fixed variation data. Handles the partially-fixed state from the
 * first timed-out run.
 *
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

    // 2. Find variations that still have "/" in an attribute key
    const varUpdates: { id: string; productId: string; attrs: Record<string, string> }[] = [];
    const affectedProductIds = new Set<string>();

    for (const v of allVars) {
      const vAttrs = v.attributes as Record<string, string> | null;
      if (!vAttrs) continue;

      const compositeKey = Object.keys(vAttrs).find(k => k.includes('/'));
      if (!compositeKey) continue;

      const parts = compositeKey.split('/').map((s: string) => s.trim());
      if (parts.length !== 2) continue;

      const combinedVal = vAttrs[compositeKey];
      const match = combinedVal?.match(/^(.+?)\s+(\d+mg)$/i);

      const newVAttrs: Record<string, string> = {};
      for (const [k, val] of Object.entries(vAttrs)) {
        if (k !== compositeKey) newVAttrs[k] = val as string;
      }

      if (match) {
        newVAttrs[parts[0]] = match[1].trim();
        newVAttrs[parts[1]] = match[2];
      } else {
        newVAttrs[parts[0]] = combinedVal;
      }

      varUpdates.push({ id: v.id, productId: v.product_id, attrs: newVAttrs });
      affectedProductIds.add(v.product_id);
    }

    // 3. Batch update variations
    for (let i = 0; i < varUpdates.length; i += BATCH) {
      const chunk = varUpdates.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, attrs }) =>
        supabase.from('product_variations').update({ attributes: attrs }).eq('id', id)
      ));
    }

    // 4. Now rebuild product-level attributes from the FIXED variation data
    // This catches partially-fixed products where product attrs were updated
    // but variations weren't (so product might be missing "Strength")
    const productFixes: { id: string; attrs: Record<string, string[]> }[] = [];
    const fixedSkus: string[] = [];

    for (const productId of affectedProductIds) {
      // Get current product attributes
      const { data: prodData } = await supabase
        .from('products')
        .select('id, sku, attributes')
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
