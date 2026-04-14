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

  // Load ALL variations using pagination (Supabase caps at 1000 per query)
  let allVars: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('product_variations')
      .select('id, sku, product_id, cost_price, stock_qty, price, in_stock, attributes')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`Page ${page} error: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    allVars = allVars.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`[Fix Dupes] Loaded ${allVars.length} total variations across ${page + 1} pages`);

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
  let remaining: any[] = [];
  page = 0;
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data } = await supabase
      .from('product_variations')
      .select('id, attributes')
      .range(from, to);

    if (!data || data.length === 0) break;
    remaining = remaining.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  let entitiesFixed = 0;
  for (const v of remaining) {
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
    uniqueSkus: skuFirstSeen.size,
    duplicatesFound: duplicateIds.length,
    duplicatesDeleted: deleted,
    remainingAfterCleanup: remaining.length,
    entitiesFixed,
    message: `Removed ${deleted} duplicate variations. Fixed entities in ${entitiesFixed} variations.`,
  });
}
