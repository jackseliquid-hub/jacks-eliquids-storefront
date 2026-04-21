import { supabase } from './supabase';

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface SeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
}

export interface GlobalSeo {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  defaultOgImage?: string;
}

export interface Variation {
  id: string;
  sku: string;
  price: string | null;
  attributes: Record<string, string>;
  inStock: boolean;
  stockQty?: number | null;  // null = not tracked, number = quantity
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: string;
  salePrice?: string;
  costPrice?: string;
  weight: number;
  shippingClass?: string;
  trackStock?: boolean;
  stockQty?: number | null;  // For simple (non-variation) products
  image: string;
  gallery?: string[];
  description: string;
  longDescription: string;
  category: string;
  tags?: string[];
  brand?: string;
  supplierId?: string;
  attributes: Record<string, string[]>;
  variations: Variation[];
  status?: 'published' | 'draft';
  seo?: SeoMeta;
  updatedAt?: string;
  relatedProducts?: string[];
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  image?: string;
  status: 'published' | 'draft';
  category?: string;
  tags?: string[];
  publishedAt?: string;
  createdAt?: string;
  seo?: SeoMeta;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: 'published' | 'draft';
  createdAt?: string;
  updatedAt?: string;
  seo?: SeoMeta;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  createdAt?: number;
  seo?: SeoMeta;
  tags?: string[];
  logo_url?: string | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  tags?: string[];
  image_url?: string | null;
}

// ─── Row mappers (snake_case DB → camelCase TypeScript) ──────────────────────

function mapVariation(v: Record<string, unknown>): Variation {
  return {
    id:         v.id as string,
    sku:        (v.sku as string) || '',
    price:      (v.price as string) || null,
    attributes: (v.attributes as Record<string, string>) || {},
    inStock:    v.in_stock !== undefined ? (v.in_stock as boolean) : true,
    stockQty:   v.stock_qty !== undefined && v.stock_qty !== null ? (v.stock_qty as number) : null,
  };
}

function mapProduct(row: Record<string, unknown>, variations: Variation[] = []): Product {
  return {
    id:            row.id as string,
    slug:          row.slug as string,
    name:          row.name as string,
    sku:           (row.sku as string) || '',
    price:         (row.price as string) || '0.00',
    salePrice:     (row.sale_price as string) || undefined,
    costPrice:     (row.cost_price as string) || undefined,
    weight:        (row.weight as number) || 0,
    shippingClass: (row.shipping_class as string) || undefined,
    trackStock:    (row.track_stock as boolean) || false,
    stockQty:      row.stock_qty !== undefined && row.stock_qty !== null ? (row.stock_qty as number) : null,
    image:         (row.image as string) || '',
    gallery:       (row.gallery as string[]) || [],
    description:   (row.description as string) || '',
    longDescription: (row.long_description as string) || '',
    category:      (row.category as string) || '',
    tags:          (row.tags as string[]) || [],
    brand:         (row.brand as string) || undefined,
    supplierId:    (row.supplier_id as string) || undefined,
    attributes:    (row.attributes as Record<string, string[]>) || {},
    variations,
    status:        (row.status as 'published' | 'draft') || 'draft',
    seo:           (row.seo as SeoMeta) || {},
    updatedAt:     row.updated_at ? String(row.updated_at) : undefined,
    relatedProducts: (row.related_products as string[]) || [],
  };
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  try {
    // Fetch products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    if (!products || products.length === 0) return [];

    // Fetch all variations — paginate due to Supabase 1000-row cap
    const productIds = products.map(p => p.id);
    let allVariations: any[] = [];
    let varPage = 0;
    const varPageSize = 1000;
    while (true) {
      const from = varPage * varPageSize;
      const to = from + varPageSize - 1;
      const { data: varBatch } = await supabase
        .from('product_variations')
        .select('*')
        .in('product_id', productIds)
        .range(from, to);

      if (!varBatch || varBatch.length === 0) break;
      allVariations = allVariations.concat(varBatch);
      if (varBatch.length < varPageSize) break;
      varPage++;
    }

    // Group variations by product_id
    const variationsByProduct: Record<string, Variation[]> = {};
    for (const v of allVariations) {
      if (!variationsByProduct[v.product_id]) variationsByProduct[v.product_id] = [];
      variationsByProduct[v.product_id].push(mapVariation(v));
    }

    return products.map(p => mapProduct(p, variationsByProduct[p.id] || []));
  } catch (err) {
    console.error('Supabase getAllProducts:', err);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) return undefined;

    const { data: variations } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', id);

    return mapProduct(product, (variations || []).map(mapVariation));
  } catch (err) {
    console.error('Supabase getProductById:', err);
    return undefined;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !product) return undefined;

    const { data: variations } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', product.id);

    return mapProduct(product, (variations || []).map(mapVariation));
  } catch (err) {
    console.error('Supabase getProductBySlug:', err);
    return undefined;
  }
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  // Map camelCase fields back to snake_case for the DB
  const dbData: Record<string, unknown> = {};
  if (data.slug           !== undefined) dbData.slug            = data.slug;
  if (data.name           !== undefined) dbData.name            = data.name;
  if (data.sku            !== undefined) dbData.sku             = data.sku;
  if (data.price          !== undefined) dbData.price           = data.price;
  if (data.salePrice      !== undefined) dbData.sale_price      = data.salePrice;
  if (data.costPrice      !== undefined) dbData.cost_price      = data.costPrice;
  if (data.weight         !== undefined) dbData.weight          = data.weight;
  if (data.shippingClass  !== undefined) dbData.shipping_class  = data.shippingClass;
  if (data.trackStock     !== undefined) dbData.track_stock     = data.trackStock;
  if (data.stockQty       !== undefined) dbData.stock_qty       = data.stockQty;
  if (data.image          !== undefined) dbData.image           = data.image;
  if (data.gallery        !== undefined) dbData.gallery         = data.gallery;
  if (data.description    !== undefined) dbData.description     = data.description;
  if (data.longDescription !== undefined) dbData.long_description = data.longDescription;
  if (data.category       !== undefined) dbData.category        = data.category;
  if (data.tags           !== undefined) dbData.tags            = data.tags;
  if (data.brand          !== undefined) dbData.brand           = data.brand;
  if (data.supplierId     !== undefined) dbData.supplier_id     = data.supplierId;
  if (data.attributes     !== undefined) dbData.attributes      = data.attributes;
  if (data.status         !== undefined) dbData.status          = data.status;
  if (data.seo            !== undefined) dbData.seo             = data.seo;
  if (data.relatedProducts !== undefined) dbData.related_products = data.relatedProducts;
  dbData.updated_at = Date.now();

  const { error: productError } = await supabase
    .from('products')
    .update(dbData)
    .eq('id', id);

  if (productError) throw productError;

  // If variations are included, replace them
  if (data.variations !== undefined) {
    // Get existing variation IDs
    const { data: existingVars } = await supabase
      .from('product_variations')
      .select('id')
      .eq('product_id', id);
    const existingIds = (existingVars || []).map((v: any) => v.id);

    if (data.variations.length > 0) {
      const varRows = data.variations.map(v => ({
        id:         v.id,
        product_id: id,
        sku:        v.sku || null,
        price:      v.price || null,
        attributes: v.attributes || {},
        in_stock:   v.inStock !== undefined ? v.inStock : true,
        stock_qty:  v.stockQty !== undefined ? v.stockQty : null,
      }));
      const { error: varError } = await supabase
        .from('product_variations')
        .upsert(varRows, { onConflict: 'id' });
      if (varError) throw varError;

      // Delete variations that were removed
      const newIds = data.variations.map(v => v.id);
      const removedIds = existingIds.filter(eid => !newIds.includes(eid));
      if (removedIds.length > 0) {
        await supabase.from('product_variations').delete().in('id', removedIds);
      }
    } else {
      // All variations removed
      if (existingIds.length > 0) {
        await supabase.from('product_variations').delete().eq('product_id', id);
      }
    }
  }
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => row.name);
  } catch (err) {
    console.error('Supabase getCategories:', err);
    return [];
  }
}

export async function getCategoriesWithTags(): Promise<CategoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, tags, image_url')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      tags: row.tags || [],
      image_url: row.image_url || null,
    }));
  } catch (err) {
    console.error('Supabase getCategoriesWithTags:', err);
    return [];
  }
}

export async function updateCategoryTags(id: string, tags: string[]): Promise<void> {
  const { error } = await supabase.from('categories').update({ tags }).eq('id', id);
  if (error) throw error;
}

export async function updateCategoryImage(id: string, image_url: string | null): Promise<void> {
  const { error } = await supabase.from('categories').update({ image_url }).eq('id', id);
  if (error) throw error;
}

export async function saveCategories(categories: string[]): Promise<void> {
  // In Supabase we store categories as individual rows — upsert each
  const rows = categories.map(name => ({
    id:   name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
  }));
  const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<TaxonomyItem[]> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
      id:        row.id,
      name:      row.name,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Supabase getTags:', err);
    return [];
  }
}

export async function addTag(name: string): Promise<void> {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { error } = await supabase
    .from('tags')
    .upsert({ id, name, created_at: Date.now() }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<TaxonomyItem[]> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
      id:        row.id,
      name:      row.name,
      createdAt: row.created_at,
      tags:      row.tags || [],
      logo_url:  row.logo_url || null,
    }));
  } catch (err) {
    console.error('Supabase getBrands:', err);
    return [];
  }
}

export async function addBrand(name: string): Promise<void> {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { error } = await supabase
    .from('brands')
    .upsert({ id, name, created_at: Date.now() }, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateBrandTags(id: string, tags: string[]): Promise<void> {
  const { error } = await supabase.from('brands').update({ tags }).eq('id', id);
  if (error) throw error;
}

export async function updateBrandLogo(id: string, logo_url: string | null): Promise<void> {
  const { error } = await supabase.from('brands').update({ logo_url }).eq('id', id);
  if (error) throw error;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw error;
}

// ─── Blogs ───────────────────────────────────────────────────────────────────

function mapBlog(row: Record<string, unknown>): Blog {
  return {
    id:          row.id as string,
    slug:        row.slug as string,
    title:       row.title as string,
    content:     (row.content as string) || '',
    author:      (row.author as string) || '',
    image:       (row.image as string) || undefined,
    status:      (row.status as 'published' | 'draft') || 'draft',
    category:    (row.category as string) || undefined,
    tags:        (row.tags as string[]) || [],
    publishedAt: (row.published_at as string) || undefined,
    createdAt:   row.created_at ? String(row.created_at) : undefined,
    seo:         (row.seo as SeoMeta) || {},
  };
}

export async function getAllBlogs(): Promise<Blog[]> {
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapBlog);
  } catch (err) {
    console.error('Supabase getAllBlogs:', err);
    return [];
  }
}

export async function getBlogById(id: string): Promise<Blog | undefined> {
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return mapBlog(data);
  } catch (err) {
    console.error('Supabase getBlogById:', err);
    return undefined;
  }
}

export async function getBlogBySlug(slug: string): Promise<Blog | undefined> {
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return undefined;
    return mapBlog(data);
  } catch (err) {
    console.error('Supabase getBlogBySlug:', err);
    return undefined;
  }
}

export async function updateBlog(id: string, data: Partial<Blog>): Promise<void> {
  const dbData: Record<string, unknown> = {};
  if (data.slug        !== undefined) dbData.slug         = data.slug;
  if (data.title       !== undefined) dbData.title        = data.title;
  if (data.content     !== undefined) dbData.content      = data.content;
  if (data.author      !== undefined) dbData.author       = data.author;
  if (data.image       !== undefined) dbData.image        = data.image;
  if (data.status      !== undefined) dbData.status       = data.status;
  if (data.category    !== undefined) dbData.category     = data.category;
  if (data.tags        !== undefined) dbData.tags         = data.tags;
  if (data.publishedAt !== undefined) dbData.published_at = data.publishedAt;
  if (data.seo         !== undefined) dbData.seo          = data.seo;
  if (data.createdAt   !== undefined) {
    // Handle both ISO strings and epoch numbers
    const ts = typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : Number(data.createdAt);
    dbData.created_at = isNaN(ts) ? Date.now() : ts;
  }

  const { error } = await supabase.from('blogs').upsert({ id, ...dbData }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteBlog(id: string): Promise<void> {
  const { error } = await supabase.from('blogs').delete().eq('id', id);
  if (error) throw error;
}

// ─── Global SEO ──────────────────────────────────────────────────────────────

export async function getGlobalSeo(): Promise<GlobalSeo | undefined> {
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'seo')
      .single();

    if (error || !data) return undefined;
    return data.value as GlobalSeo;
  } catch (err) {
    console.error('Supabase getGlobalSeo:', err);
    return undefined;
  }
}

export async function setGlobalSeo(data: GlobalSeo): Promise<void> {
  const { error } = await supabase
    .from('global_settings')
    .upsert({ key: 'seo', value: data }, { onConflict: 'key' });
  if (error) throw error;
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function mapPage(row: Record<string, unknown>): Page {
  return {
    id:        row.id as string,
    slug:      row.slug as string,
    title:     row.title as string,
    content:   (row.content as string) || '',
    status:    (row.status as 'published' | 'draft') || 'draft',
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    seo:       (row.seo as SeoMeta) || {},
  };
}

export async function getAllPages(): Promise<Page[]> {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapPage);
  } catch (err) {
    console.error('Supabase getAllPages:', err);
    return [];
  }
}

export async function getPageById(id: string): Promise<Page | undefined> {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return mapPage(data);
  } catch (err) {
    console.error('Supabase getPageById:', err);
    return undefined;
  }
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return undefined;
    return mapPage(data);
  } catch (err) {
    console.error('Supabase getPageBySlug:', err);
    return undefined;
  }
}

export async function updatePage(id: string, data: Partial<Page>): Promise<void> {
  const dbData: Record<string, unknown> = { updated_at: Date.now() };
  if (data.slug    !== undefined) dbData.slug    = data.slug;
  if (data.title   !== undefined) dbData.title   = data.title;
  if (data.content !== undefined) dbData.content = data.content;
  if (data.status  !== undefined) dbData.status  = data.status;
  if (data.seo     !== undefined) dbData.seo     = data.seo;

  const { error } = await supabase.from('pages').upsert({ id, ...dbData }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from('pages').delete().eq('id', id);
  if (error) throw error;
}

// ─── Compatibility Links ────────────────────────────────────────────────────

export interface CompatibilityLink {
  id: string;
  sourceProductId: string;
  sourceProductName: string;
  targetProductId: string;
  targetProductName: string;
  targetProductSlug: string;
  linkText: string;
  createdAt: string;
}

export async function getCompatibilityLinks(): Promise<CompatibilityLink[]> {
  const { data, error } = await supabase
    .from('product_compatibility_links')
    .select(`
      id,
      link_text,
      created_at,
      source:products!source_product_id(id, name, slug),
      target:products!target_product_id(id, name, slug)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    sourceProductId: row.source?.id || '',
    sourceProductName: row.source?.name || 'Deleted product',
    targetProductId: row.target?.id || '',
    targetProductName: row.target?.name || 'Deleted product',
    targetProductSlug: row.target?.slug || '',
    linkText: row.link_text,
    createdAt: row.created_at,
  }));
}

export async function getCompatibilityLinksForProduct(productId: string): Promise<{ targetSlug: string; linkText: string }[]> {
  const { data, error } = await supabase
    .from('product_compatibility_links')
    .select(`
      link_text,
      target:products!target_product_id(slug)
    `)
    .eq('source_product_id', productId);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    targetSlug: row.target?.slug || '',
    linkText: row.link_text,
  })).filter(l => l.targetSlug);
}

export async function addCompatibilityLink(sourceProductId: string, targetProductId: string, linkText: string): Promise<void> {
  const { error } = await supabase.from('product_compatibility_links').insert({
    source_product_id: sourceProductId,
    target_product_id: targetProductId,
    link_text: linkText,
  });
  if (error) throw error;
}

export async function updateCompatibilityLink(id: string, linkText: string): Promise<void> {
  const { error } = await supabase
    .from('product_compatibility_links')
    .update({ link_text: linkText })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCompatibilityLink(id: string): Promise<void> {
  const { error } = await supabase.from('product_compatibility_links').delete().eq('id', id);
  if (error) throw error;
}
