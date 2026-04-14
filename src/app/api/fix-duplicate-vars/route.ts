import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// One-time fix: remove duplicate variations (keep the original, delete duplicates)
// Also decode HTML entities in remaining variations
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

  // Load ALL variations
  const { data: allVars, error } = await supabase
    .from('product_variations')
    .select('id, sku, product_id, cost_price, stock_qty, price, in_stock, attributes')
    .order('id', { ascending: true })
    .range(0, 49999);

  if (error || !allVars) {
    return NextResponse.json({ success: false, error: error?.message || 'No data' });
  }

  // Group by SKU — keep the FIRST occurrence (original), mark the rest as duplicates
  const skuFirstSeen = new Map<string, string>(); // sku → first ID
  const duplicateIds: string[] = [];

  for (const v of allVars) {
    if (!v.sku || v.sku.trim() === '') continue;

    if (skuFirstSeen.has(v.sku)) {
      // This is a duplicate — mark for deletion
      duplicateIds.push(v.id);
    } else {
      skuFirstSeen.set(v.sku, v.id);
    }
  }

  // Delete duplicates in batches of 100
  let deleted = 0;
  for (let i = 0; i < duplicateIds.length; i += 100) {
    const batch = duplicateIds.slice(i, i + 100);
    const { error: delError } = await supabase
      .from('product_variations')
      .delete()
      .in('id', batch);

    if (delError) {
      console.error(`Delete batch error: ${delError.message}`);
    } else {
      deleted += batch.length;
    }
  }

  // Now decode HTML entities in remaining variations
  const { data: remaining } = await supabase
    .from('product_variations')
    .select('id, attributes')
    .range(0, 49999);

  let entitiesFixed = 0;
  for (const v of (remaining || [])) {
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
      entitiesFixed++;
    }
  }

  return NextResponse.json({
    success: true,
    totalVariations: allVars.length,
    duplicatesFound: duplicateIds.length,
    duplicatesDeleted: deleted,
    entitiesFixed,
    message: `Removed ${deleted} duplicate variations. Fixed entities in ${entitiesFixed} variations.`,
  });
}
