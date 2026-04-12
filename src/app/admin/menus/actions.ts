'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

const supabase = createAdminClient();

// ─── Menu CRUD ──────────────────────────────────────────────────────────────────

export async function createMenu(name: string, slug: string): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from('menus').insert([{ name, slug }]).select('id').single();
  if (error) return { error: error.message };
  revalidatePath('/admin/menus');
  return { id: data.id };
}

export async function updateMenu(id: string, name: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('menus').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/menus');
  return {};
}

export async function deleteMenu(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/menus');
  return {};
}

// ─── Menu Items ─────────────────────────────────────────────────────────────────

interface SaveItem {
  id?: string;
  menu_id: string;
  parent_id: string | null;
  label: string;
  url: string | null;
  type: 'link' | 'mega' | 'heading';
  open_in_new_tab: boolean;
  sort_order: number;
  image_url: string | null;
}

/**
 * Bulk save all menu items — deletes removed items, upserts the rest.
 * This is the core "Save Menu" action called by the builder.
 */
export async function saveMenuItems(menuId: string, items: SaveItem[]): Promise<{ error?: string }> {
  // 1) Get existing IDs
  const { data: existing } = await supabase
    .from('menu_items')
    .select('id')
    .eq('menu_id', menuId);
  const existingIds = new Set((existing || []).map(e => e.id));

  // 2) Work out which IDs to delete (in old set but not in new set)
  const newIds = new Set(items.filter(i => i.id).map(i => i.id));
  const toDelete = [...existingIds].filter(id => !newIds.has(id));

  // 3) Delete removed items
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('menu_items').delete().in('id', toDelete);
    if (delErr) return { error: delErr.message };
  }

  // 4) Upsert remaining items
  if (items.length > 0) {
    const rows = items.map(item => ({
      ...item,
      menu_id: menuId,
      id: item.id || undefined,   // let DB generate if new
    }));
    const { error: upsertErr } = await supabase
      .from('menu_items')
      .upsert(rows, { onConflict: 'id' });
    if (upsertErr) return { error: upsertErr.message };
  }

  revalidatePath('/admin/menus');
  revalidatePath('/');   // bust storefront cache
  return {};
}

export async function deleteMenuItem(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}
