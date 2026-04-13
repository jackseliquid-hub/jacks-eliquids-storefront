import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEMPORARY: One-time fix to split combined variation attributes.
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

    // 1. Fetch ALL products
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name, sku, attributes')
      .range(0, 9999);

    if (pErr) throw new Error(pErr.message);

    // 2. Collect all updates first (no DB calls in this loop)
    const productUpdates: { id: string; attrs: Record<string, string[]> }[] = [];
    const productIdsToFix: string[] = [];
    const fixedSkus: string[] = [];

    for (const prod of (products || [])) {
      const attrs = prod.attributes as Record<string, string[]> | null;
      if (!attrs) continue;

      const compositeKey = Object.keys(attrs).find(k => k.includes('/'));
      if (!compositeKey) continue;

      const parts = compositeKey.split('/').map((s: string) => s.trim());
      if (parts.length !== 2) continue;

      const values = attrs[compositeKey] || [];
      const attrA = new Set<string>();
      const attrB = new Set<string>();

      for (const val of values) {
        const match = val.match(/^(.+?)\s+(\d+mg)$/i);
        if (match) {
          attrA.add(match[1].trim());
          attrB.add(match[2]);
        } else {
          attrA.add(val);
        }
      }

      const newAttrs: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(attrs)) {
        if (k !== compositeKey) newAttrs[k] = v as string[];
      }
      if (attrA.size > 0) newAttrs[parts[0]] = [...attrA];
      if (attrB.size > 0) newAttrs[parts[1]] = [...attrB];

      productUpdates.push({ id: prod.id, attrs: newAttrs });
      productIdsToFix.push(prod.id);
      fixedSkus.push(prod.sku || prod.id);
    }

    // 3. Batch update products (25 at a time in parallel)
    const BATCH = 25;
    for (let i = 0; i < productUpdates.length; i += BATCH) {
      const chunk = productUpdates.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, attrs }) =>
        supabase.from('products').update({ attributes: attrs }).eq('id', id)
      ));
    }

    // 4. Fetch ALL variations for the affected products
    let allVariations: any[] = [];
    // Fetch in chunks of 50 product IDs
    for (let i = 0; i < productIdsToFix.length; i += 50) {
      const idChunk = productIdsToFix.slice(i, i + 50);
      const { data: vars } = await supabase
        .from('product_variations')
        .select('id, product_id, attributes')
        .in('product_id', idChunk)
        .range(0, 9999);
      if (vars) allVariations = allVariations.concat(vars);
    }

    // 5. Collect variation updates
    const varUpdates: { id: string; attrs: Record<string, string> }[] = [];

    for (const v of allVariations) {
      const vAttrs = v.attributes as Record<string, string> | null;
      if (!vAttrs) continue;

      const vCompositeKey = Object.keys(vAttrs).find(k => k.includes('/'));
      if (!vCompositeKey) continue;

      const vParts = vCompositeKey.split('/').map((s: string) => s.trim());
      if (vParts.length !== 2) continue;

      const combinedVal = vAttrs[vCompositeKey];
      const match = combinedVal?.match(/^(.+?)\s+(\d+mg)$/i);

      const newVAttrs: Record<string, string> = {};
      for (const [k, val] of Object.entries(vAttrs)) {
        if (k !== vCompositeKey) newVAttrs[k] = val as string;
      }

      if (match) {
        newVAttrs[vParts[0]] = match[1].trim();
        newVAttrs[vParts[1]] = match[2];
      } else {
        newVAttrs[vParts[0]] = combinedVal;
      }

      varUpdates.push({ id: v.id, attrs: newVAttrs });
    }

    // 6. Batch update variations (25 at a time in parallel)
    for (let i = 0; i < varUpdates.length; i += BATCH) {
      const chunk = varUpdates.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, attrs }) =>
        supabase.from('product_variations').update({ attributes: attrs }).eq('id', id)
      ));
    }

    return NextResponse.json({
      success: true,
      fixedProducts: productUpdates.length,
      fixedVariations: varUpdates.length,
      fixedSkus,
      message: `Fixed ${productUpdates.length} products and ${varUpdates.length} variations.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
