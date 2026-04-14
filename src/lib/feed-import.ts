/**
 * EQ Wholesale XML Feed Import Engine
 *
 * Fetches the EQ Wholesale product feed, parses the XML, and syncs products
 * into the Supabase database. Handles parent/variation grouping, SKU matching,
 * change detection, and image processing (resize + WebP).
 */

import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeedItem {
  pid: string;
  name: string;
  vars_grouped: string;
  var_group: string;
  var: string;
  sku: string;
  parent_sku: string;
  qty: number;
  costprice_exvat: number;
  costprice_incvat: number;
  price: number;
  weight_g: number;
  weight_kg: number;
  size: string;
  img_url: string;
  desc_short: string;
  desc_long: string;
  cat_name: string;
  prod_type: 'simple' | 'variable' | 'variation';
  brand: string;
  // New split feed fields
  attr1_group?: string;
  attr1_value?: string;
  attr2_group?: string;
  attr2_value?: string;
  attr3_group?: string;
  attr3_value?: string;
  [key: string]: unknown; // for dynamic attr_Flavour, attr_Colour etc.
}

interface ParentProduct {
  pid: string;
  name: string;
  sku: string;
  costprice_exvat: number;
  weight_g: number;
  size: string;
  img_url: string;
  desc_long: string;
  cat_name: string;
  brand: string;
  prod_type: 'simple' | 'variable';
  var_group: string;        // e.g. "Colour", "Flavour/Strength"
  vars_grouped: string;     // comma-separated variant options
  variations: FeedVariation[];
}

interface FeedVariation {
  sku: string;
  var_name: string;         // Legacy: e.g. "Black", "03mg - Heisenberg"
  var_group: string;        // Legacy: e.g. "Colour", "Flavour/Strength"
  attributes: Record<string, string>;  // New: { Flavour: "Heisenberg", Strength: "03mg" }
  qty: number;
  costprice_exvat: number;
  weight_g: number;
}

interface ImportResult {
  productsAdded: number;
  productsUpdated: number;
  productsSkipped: number;
  variationsUpdated: number;
  addedSkus: string[];
  updatedSkus: string[];
  costChangeSkus: string[];    // product SKUs where cost price changed
  qtyChangeSkus: string[];     // product SKUs where stock qty changed
  updatedVarSkus: string[];
  newVarSkus: string[];
  /** Maps variation SKU → { parentName, parentSku, parentId } */
  varParentMap: Record<string, { parentName: string; parentSku: string; parentId: string }>;
  errors: { sku: string; error: string }[];
  dryRun: boolean;
  newSkus: string[];
}

// ─── HTML Entity Decoder ────────────────────────────────────────────────────

function decodeEntities(str: string): string {
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

// ─── Supabase Admin Client ──────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error('Missing Supabase env vars');
  return createClient(url, serviceKey);
}

// ─── XML Parsing ────────────────────────────────────────────────────────────

function parseFeedXml(xml: string): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    parseTagValue: true,
    processEntities: false,     // Feed has 1000+ HTML entities — we decode them ourselves
    isArray: (name) => name === 'itm', // Always treat itm as array
  });

  const parsed = parser.parse(xml);
  const items: FeedItem[] = parsed?.feed?.itm || [];
  return items;
}

// ─── Extract split attributes from new feed format ──────────────────────────
// New feed provides: <attr1_group>Flavour</attr1_group> <attr1_value>Heisenberg</attr1_value>
//                    <attr2_group>Strength</attr2_group> <attr2_value>03mg</attr2_value>
// We extract these into: { Flavour: "Heisenberg", Strength: "03mg" }

function extractSplitAttributes(item: FeedItem): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Try numbered attr groups: attr1_group/attr1_value, attr2_group/attr2_value, etc.
  for (let i = 1; i <= 5; i++) {
    const group = item[`attr${i}_group`];
    const value = item[`attr${i}_value`];
    if (group && value && String(value).trim()) {
      attrs[String(group)] = String(value);
    }
  }

  return attrs;
}

function groupProducts(items: FeedItem[]): Map<string, ParentProduct> {
  const parents = new Map<string, ParentProduct>();

  // First pass: collect parent products
  for (const item of items) {
    if (item.prod_type === 'simple' || item.prod_type === 'variable') {
      parents.set(item.sku, {
        pid: String(item.pid),
        name: String(item.name || ''),
        sku: String(item.sku || ''),
        costprice_exvat: Number(item.costprice_exvat) || 0,
        weight_g: Number(item.weight_g) || 0,
        size: String(item.size || ''),
        img_url: String(item.img_url || ''),
        desc_long: String(item.desc_long || ''),
        cat_name: String(item.cat_name || ''),
        brand: String(item.brand || ''),
        prod_type: item.prod_type as 'simple' | 'variable',
        var_group: String(item.var_group || ''),
        vars_grouped: String(item.vars_grouped || ''),
        variations: [],
      });
    }
  }

  // Second pass: attach variations to parents
  for (const item of items) {
    if (item.prod_type === 'variation' && item.parent_sku) {
      const parentSku = String(item.parent_sku);
      const parent = parents.get(parentSku);
      if (parent) {
        // Extract attributes from the new split feed format
        const attributes = extractSplitAttributes(item);

        parent.variations.push({
          sku: String(item.sku || ''),
          var_name: String(item.var || ''),
          var_group: String(item.var_group || ''),
          attributes,
          qty: Number(item.qty) || 0,
          costprice_exvat: Number(item.costprice_exvat) || 0,
          weight_g: Number(item.weight_g) || 0,
        });
      }
    }
  }

  return parents;
}

// ─── Image Processing ───────────────────────────────────────────────────────

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function processAndUploadImage(
  imageUrl: string,
  productName: string,
  supabase: any
): Promise<string | null> {
  try {
    // Fetch the source image
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // Dynamic import of sharp (only runs on Node.js)
    const sharp = (await import('sharp')).default;

    // Resize (longest side max 800px) and convert to WebP
    const processed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // Upload to Supabase Storage
    const fileName = `${slugifyName(productName)}.webp`;

    const { error } = await supabase.storage
      .from('media')
      .upload(fileName, processed, {
        contentType: 'image/webp',
        upsert: true, // Overwrite if same name exists
      });

    if (error) {
      console.error(`Image upload error for ${fileName}:`, error.message);
      return null;
    }

    // Return public URL
    const { data } = supabase.storage.from('media').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err: any) {
    console.error(`Image processing error: ${err.message}`);
    return null;
  }
}

// ─── Sanitise HTML description ──────────────────────────────────────────────

function sanitiseDescription(html: string): string {
  if (!html) return '';
  // Decode XML entities
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#xD;\n?/g, '\n')
    .replace(/&#xA0;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Strip wrapper divs from EQ
    .replace(/<div class="cygm_pd[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .trim();
}

// ─── Split combined variation names ─────────────────────────────────────────
// Feed gives: var_group="Flavour/Strength", var_name="Strawberry Ice 10mg"
//         or: var_group="Flavour/Strength", var_name="06mg - Attraction"
// We split into: { Flavour: "Strawberry Ice", Strength: "10mg" }

function splitVarName(varName: string, varGroup: string): Record<string, string> {
  const parts = varGroup.split('/').map(s => s.trim());
  if (parts.length !== 2 || !varName) return { [varGroup || 'Option']: varName };

  // Format 1: "06mg - Attraction" (strength first, dash separator)
  const matchFront = varName.match(/^(\d+mg)\s*[-–]\s*(.+)$/i);
  if (matchFront) {
    // parts[0] = "Flavour", parts[1] = "Strength"
    return { [parts[0]]: matchFront[2].trim(), [parts[1]]: matchFront[1] };
  }

  // Format 2: "Strawberry Ice 10mg" (strength last, space separator)
  const matchEnd = varName.match(/^(.+?)\s+(\d+mg)$/i);
  if (matchEnd) {
    return { [parts[0]]: matchEnd[1].trim(), [parts[1]]: matchEnd[2] };
  }

  // Fallback: can't split, keep combined
  return { [varGroup]: varName };
}

// ─── Build attributes from variations ───────────────────────────────────────

function buildAttributes(parent: ParentProduct): Record<string, string[]> {
  if (parent.prod_type === 'simple' || parent.variations.length === 0) return {};

  // New feed: variations already have pre-split attributes from extractSplitAttributes
  const firstVarAttrs = parent.variations[0]?.attributes || {};
  const hasSplitAttrs = Object.keys(firstVarAttrs).length > 0;

  if (hasSplitAttrs) {
    // Build product-level attributes from the variation-level split attributes
    const attrSets: Record<string, Set<string>> = {};
    for (const v of parent.variations) {
      for (const [key, val] of Object.entries(v.attributes)) {
        if (!attrSets[key]) attrSets[key] = new Set();
        attrSets[key].add(val);
      }
    }
    const result: Record<string, string[]> = {};
    for (const [key, valueSet] of Object.entries(attrSets)) {
      result[key] = [...valueSet];
    }
    return result;
  }

  // Legacy fallback: use old var_group + splitVarName
  const varGroup = parent.var_group || 'Option';
  const parts = varGroup.split('/').map(s => s.trim());
  const isComposite = parts.length === 2;

  if (!isComposite) {
    const values = parent.variations.map(v => v.var_name).filter(Boolean);
    const unique = [...new Set(values)];
    return unique.length > 0 ? { [varGroup]: unique } : {};
  }

  const attrA: Set<string> = new Set();
  const attrB: Set<string> = new Set();
  for (const v of parent.variations) {
    if (!v.var_name) continue;
    const split = splitVarName(v.var_name, varGroup);
    if (split[parts[0]]) attrA.add(split[parts[0]]);
    if (split[parts[1]]) attrB.add(split[parts[1]]);
  }
  const result: Record<string, string[]> = {};
  if (attrA.size > 0) result[parts[0]] = [...attrA];
  if (attrB.size > 0) result[parts[1]] = [...attrB];
  return result;
}

// ─── Auto-create categories and brands ──────────────────────────────────────

async function ensureCategoryExists(catName: string, supabase: any) {
  if (!catName) return;
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('name', catName)
    .maybeSingle();

  if (!data) {
    const id = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await supabase.from('categories').insert({ id, name: catName });
  }
}

async function ensureBrandExists(brandName: string, supabase: any) {
  if (!brandName) return;
  const { data } = await supabase
    .from('brands')
    .select('id')
    .eq('name', brandName)
    .maybeSingle();

  if (!data) {
    const id = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await supabase.from('brands').insert({ id, name: brandName });
  }
}

// ─── Generate unique slug ──────────────────────────────────────────────────

async function generateUniqueSlug(name: string, supabase: any): Promise<string> {
  const base = slugifyName(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!data) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

// ─── Main Import Function ───────────────────────────────────────────────────

export async function runFeedImport(feedUrl: string, dryRun = false): Promise<ImportResult> {
  const supabase = getAdminClient();
  const result: ImportResult = {
    productsAdded: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    variationsUpdated: 0,
    addedSkus: [],
    updatedSkus: [],
    costChangeSkus: [],
    qtyChangeSkus: [],
    updatedVarSkus: [],
    newVarSkus: [],
    varParentMap: {},
    errors: [],
    dryRun,
    newSkus: [],
  };

  // ── 1. Fetch and parse XML ─────────────────────────────────────────────
  console.log('[Feed Import] Fetching XML feed...');
  const response = await fetch(feedUrl);
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);

  const xml = await response.text();
  const items = parseFeedXml(xml);
  console.log(`[Feed Import] Parsed ${items.length} items from XML`);

  // ── 2. Group into parents + variations ─────────────────────────────────
  const parents = groupProducts(items);
  console.log(`[Feed Import] ${parents.size} unique parent products`);

  // ── 3. Load all existing product SKUs ──────────────────────────────────
  // Supabase defaults to 1000 rows — fetch all with explicit range
  const { data: existingProducts, count: productCount } = await supabase
    .from('products')
    .select('id, sku, name, cost_price, stock_qty, attributes', { count: 'exact' })
    .range(0, 9999);

  console.log(`[Feed Import] Loaded ${existingProducts?.length ?? 0} existing products (count: ${productCount})`);

  const existingMap = new Map<string, {
    id: string;
    name: string | null;
    cost_price: string | null;
    stock_qty: number | null;
    attributes: Record<string, string[]> | null;
  }>();

  for (const p of (existingProducts || [])) {
    if (p.sku) existingMap.set(p.sku, p);
  }

  // ── 4. Load all existing variation SKUs ────────────────────────────────
  const { data: existingVariations } = await supabase
    .from('product_variations')
    .select('id, sku, product_id, cost_price, stock_qty')
    .range(0, 49999);

  console.log(`[Feed Import] Loaded ${existingVariations?.length ?? 0} existing variations`);

  const existingVarMap = new Map<string, {
    id: string;
    product_id: string;
    cost_price: string | null;
    stock_qty: number | null;
  }>();

  for (const v of (existingVariations || [])) {
    if (v.sku) existingVarMap.set(v.sku, v);
  }

  // ── 5. Process each parent product ─────────────────────────────────────
  // Collect all DB operations, then execute in parallel batches
  const pendingProductUpdates: { id: string; data: Record<string, any> }[] = [];
  const pendingVarUpdates: { id: string; cost_price: string; stock_qty: number }[] = [];
  const pendingNewVars: any[] = [];
  const restockedVarIds: string[] = []; // variations going from 0 → >0

  for (const [sku, parent] of parents) {
    try {
      const existing = existingMap.get(sku);

      if (existing) {
        const feedCostPrice = parent.costprice_exvat.toFixed(2);
        const feedTotalQty = parent.prod_type === 'variable'
          ? parent.variations.reduce((sum, v) => sum + v.qty, 0)
          : Number((items.find(i => String(i.sku) === sku) as any)?.qty || 0);

        const currentCostPrice = existing.cost_price || '0.00';
        const currentStockQty = existing.stock_qty ?? 0;

        const feedAttributes = buildAttributes(parent);
        const currentAttributes = existing.attributes || {};
        const attrChanged = JSON.stringify(feedAttributes) !== JSON.stringify(currentAttributes);

        let varChanged = false;

        for (const fv of parent.variations) {
          const existingVar = existingVarMap.get(fv.sku);
          if (existingVar) {
            const fvCost = fv.costprice_exvat.toFixed(2);
            if (fvCost !== (existingVar.cost_price || '0.00') || fv.qty !== (existingVar.stock_qty ?? 0)) {
              varChanged = true;
              // Track restock: was 0, now > 0
              if ((existingVar.stock_qty ?? 0) === 0 && fv.qty > 0) {
                restockedVarIds.push(existingVar.id);
              }
              pendingVarUpdates.push({ id: existingVar.id, cost_price: fvCost, stock_qty: fv.qty });
              result.updatedVarSkus.push(fv.sku);
              result.varParentMap[fv.sku] = { parentName: existing.name || parent.name, parentSku: sku, parentId: existing.id };
            }
          } else {
            varChanged = true;
            const varId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const rawAttrs = Object.keys(fv.attributes).length > 0 ? fv.attributes : (fv.var_name ? splitVarName(fv.var_name, parent.var_group || 'Option') : {});
            const decodedAttrs: Record<string, string> = {};
            for (const [k, v] of Object.entries(rawAttrs)) {
              decodedAttrs[decodeEntities(k)] = decodeEntities(v);
            }
            pendingNewVars.push({
              id: varId,
              product_id: existing.id,
              sku: fv.sku,
              price: null,
              cost_price: fv.costprice_exvat.toFixed(2),
              stock_qty: fv.qty,
              in_stock: fv.qty > 0,
              attributes: decodedAttrs,
            });
            result.newVarSkus.push(fv.sku);
            result.varParentMap[fv.sku] = { parentName: existing.name || parent.name, parentSku: sku, parentId: existing.id };
          }
        }

        const parentCostChanged = feedCostPrice !== currentCostPrice;
        const parentQtyChanged = feedTotalQty !== currentStockQty;

        if (!parentCostChanged && !parentQtyChanged && !attrChanged && !varChanged) {
          result.productsSkipped++;
          continue;
        }

        const updateData: Record<string, any> = {};
        if (parentCostChanged) updateData.cost_price = feedCostPrice;
        if (parentQtyChanged) updateData.stock_qty = feedTotalQty;
        if (attrChanged) updateData.attributes = feedAttributes;

        if (Object.keys(updateData).length > 0) {
          pendingProductUpdates.push({ id: existing.id, data: updateData });
        }

        result.productsUpdated++;
        result.updatedSkus.push(sku);
        if (parentCostChanged) result.costChangeSkus.push(`${sku} — £${currentCostPrice} → £${feedCostPrice}`);
        if (parentQtyChanged) result.qtyChangeSkus.push(`${sku} — ${currentStockQty} → ${feedTotalQty}`);

      } else {
        result.productsAdded++;
        result.addedSkus.push(sku);
        result.newSkus.push(`${sku} — ${parent.name}`);

        if (dryRun) continue;

        const attributes = buildAttributes(parent);
        const slug = await generateUniqueSlug(parent.name, supabase);

        await ensureCategoryExists(parent.cat_name, supabase);
        await ensureBrandExists(parent.brand, supabase);

        let imageUrl: string | null = null;
        if (parent.img_url) {
          imageUrl = await processAndUploadImage(parent.img_url, parent.name, supabase);
        }

        const totalQty = parent.prod_type === 'variable'
          ? parent.variations.reduce((sum, v) => sum + v.qty, 0)
          : Number((items.find(i => String(i.sku) === sku) as any)?.qty || 0);

        const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            id: productId,
            name: decodeEntities(parent.name),
            slug,
            sku: parent.sku,
            price: '0.00',
            cost_price: parent.costprice_exvat.toFixed(2),
            weight: parent.weight_g,
            shipping_class: parent.size || null,
            track_stock: true,
            stock_qty: totalQty,
            image: imageUrl || '',
            description: sanitiseDescription(decodeEntities(parent.desc_long)),
            category: decodeEntities(parent.cat_name),
            brand: parent.brand ? decodeEntities(parent.brand) : null,
            supplier_id: 'eqwholesale',
            attributes,
            status: 'draft',
            tags: [],
            gallery: [],
            seo: {},
          });

        if (insertError) {
          result.errors.push({ sku, error: insertError.message });
          continue;
        }

        if (parent.prod_type === 'variable' && parent.variations.length > 0) {
          const varRows = parent.variations.map(fv => {
            const varId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              // Decode HTML entities in attribute values
              const rawAttrs = Object.keys(fv.attributes).length > 0 ? fv.attributes : (fv.var_name ? splitVarName(fv.var_name, parent.var_group || 'Option') : {});
              const decodedAttrs: Record<string, string> = {};
              for (const [k, v] of Object.entries(rawAttrs)) {
                decodedAttrs[decodeEntities(k)] = decodeEntities(v);
              }
              return {
                id: varId,
                product_id: productId,
                sku: fv.sku,
                price: null,
                cost_price: fv.costprice_exvat.toFixed(2),
                stock_qty: fv.qty,
                in_stock: fv.qty > 0,
                attributes: decodedAttrs,
              };
          });

          const { error: varError } = await supabase.from('product_variations').insert(varRows);
          if (varError) {
            result.errors.push({ sku, error: `Variations: ${varError.message}` });
          }
        }
      }
    } catch (err: any) {
      result.errors.push({ sku, error: err.message });
    }
  }

  // ── 6. Flush batched updates in parallel ──────────────────────────────
  if (!dryRun) {
    const BATCH = 25;

    console.log(`[Feed Import] Flushing ${pendingProductUpdates.length} product updates...`);
    for (let i = 0; i < pendingProductUpdates.length; i += BATCH) {
      const chunk = pendingProductUpdates.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, data }) =>
        supabase.from('products').update(data).eq('id', id)
      ));
    }

    console.log(`[Feed Import] Flushing ${pendingVarUpdates.length} variation updates...`);
    for (let i = 0; i < pendingVarUpdates.length; i += BATCH) {
      const chunk = pendingVarUpdates.slice(i, i + BATCH);
      await Promise.all(chunk.map(({ id, cost_price, stock_qty }) =>
        supabase.from('product_variations').update({
          cost_price, stock_qty, in_stock: stock_qty > 0,
        }).eq('id', id)
      ));
    }
    result.variationsUpdated += pendingVarUpdates.length;

    if (pendingNewVars.length > 0) {
      console.log(`[Feed Import] Inserting ${pendingNewVars.length} new variations...`);
      const { error: nvErr } = await supabase.from('product_variations').insert(pendingNewVars);
      if (nvErr) result.errors.push({ sku: 'BATCH_NEW_VARS', error: nvErr.message });
      result.variationsUpdated += pendingNewVars.length;
    }
  }

  // ─── Send back-in-stock notifications ─────────────────────────────────────
  if (restockedVarIds.length > 0) {
    console.log(`[Feed Import] ${restockedVarIds.length} variations restocked, checking notifications...`);
    try {
      const { data: notifications } = await supabase
        .from('stock_notifications')
        .select('id, email, name, variation_id, product_id')
        .in('variation_id', restockedVarIds)
        .eq('notified', false);

      if (notifications && notifications.length > 0) {
        console.log(`[Feed Import] Sending ${notifications.length} back-in-stock emails...`);

        // Get product + variation details for the email
        const productIds = [...new Set(notifications.map(n => n.product_id))];
        const { data: products } = await supabase
          .from('products')
          .select('id, name, slug, image')
          .in('id', productIds);
        const productMap = new Map((products || []).map(p => [p.id, p]));

        const varIds = [...new Set(notifications.map(n => n.variation_id))];
        const { data: vars } = await supabase
          .from('product_variations')
          .select('id, attributes')
          .in('id', varIds);
        const varMap = new Map((vars || []).map(v => [v.id, v]));

        if (process.env.RESEND_API_KEY) {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquids.co.uk';

          for (const notif of notifications) {
            const prod = productMap.get(notif.product_id);
            const vari = varMap.get(notif.variation_id);
            if (!prod) continue;

            const variantLabel = vari?.attributes
              ? Object.values(vari.attributes).join(' / ')
              : '';
            const productUrl = `${siteUrl}/product/${prod.slug}`;

            try {
              await resend.emails.send({
                from: 'Jack\'s E-Liquid <noreply@jackseliquids.co.uk>',
                to: notif.email,
                subject: `🔔 Back in Stock: ${prod.name}${variantLabel ? ` - ${variantLabel}` : ''}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
                    <h2 style="color: #1a1a1a;">Great news${notif.name ? `, ${notif.name}` : ''}! 🎉</h2>
                    <p style="color: #555; font-size: 1rem; line-height: 1.6;">
                      <strong>${prod.name}${variantLabel ? ` - ${variantLabel}` : ''}</strong> is back in stock!
                    </p>
                    ${prod.image ? `<img src="${prod.image}" alt="${prod.name}" style="max-width: 200px; border-radius: 12px; margin: 1rem 0;" />` : ''}
                    <a href="${productUrl}" style="display: inline-block; background: #008080; color: #fff; padding: 0.75rem 1.5rem; border-radius: 9999px; text-decoration: none; font-weight: 600; margin-top: 1rem;">
                      Shop Now →
                    </a>
                    <p style="color: #999; font-size: 0.8rem; margin-top: 2rem;">
                      You received this email because you signed up for a back-in-stock notification.
                    </p>
                  </div>
                `,
              });
            } catch (emailErr) {
              console.error(`[Feed Import] Failed to email ${notif.email}:`, emailErr);
            }
          }
        }

        // Mark all as notified
        const notifIds = notifications.map(n => n.id);
        await supabase
          .from('stock_notifications')
          .update({ notified: true })
          .in('id', notifIds);

        console.log(`[Feed Import] Sent ${notifications.length} back-in-stock notifications.`);
      }
    } catch (notifErr) {
      console.error('[Feed Import] Notification error (non-fatal):', notifErr);
    }
  }

  return result;
}
