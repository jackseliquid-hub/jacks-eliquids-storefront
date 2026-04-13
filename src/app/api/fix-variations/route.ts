import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEMPORARY: Purge all variations for non-JEL products.
 * This wipes variation data so the next import re-creates
 * them cleanly from the new products_split feed.
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

    // 1. Get all products, skip any with JEL in the SKU
    let allProducts: any[] = [];
    for (let page = 0; ; page++) {
      const { data } = await supabase
        .from('products')
        .select('id, sku')
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      allProducts = allProducts.concat(data);
      if (data.length < 1000) break;
    }

    // Filter: only purge non-JEL products
    const toPurge = allProducts.filter(p => {
      const sku = (p.sku || '').toUpperCase();
      return !sku.includes('JEL');
    });

    const purgedSkus: string[] = [];
    let totalDeleted = 0;
    const BATCH = 25;

    // 2. Delete variations in batches
    for (let i = 0; i < toPurge.length; i += BATCH) {
      const chunk = toPurge.slice(i, i + BATCH);
      const ids = chunk.map(p => p.id);

      const { count } = await supabase
        .from('product_variations')
        .delete({ count: 'exact' })
        .in('product_id', ids);

      totalDeleted += count || 0;
      chunk.forEach(p => purgedSkus.push(p.sku));
    }

    // 3. Clear product-level attributes so they rebuild from the import
    for (let i = 0; i < toPurge.length; i += BATCH) {
      const chunk = toPurge.slice(i, i + BATCH);
      const ids = chunk.map(p => p.id);
      await supabase
        .from('products')
        .update({ attributes: {} })
        .in('id', ids);
    }

    return NextResponse.json({
      success: true,
      purgedProducts: toPurge.length,
      deletedVariations: totalDeleted,
      skippedJEL: allProducts.length - toPurge.length,
      message: `Purged ${totalDeleted} variations from ${toPurge.length} products (skipped ${allProducts.length - toPurge.length} JEL products). Run the import now to recreate them.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
