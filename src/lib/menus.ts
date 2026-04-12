import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  label: string;
  url: string | null;
  type: 'link' | 'mega' | 'heading';
  open_in_new_tab: boolean;
  sort_order: number;
  image_url: string | null;
  children?: MenuItem[];
}

export interface Menu {
  id: string;
  slug: string;
  name: string;
}

// ─── Fetch ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all menus (for admin list page).
 */
export async function getAllMenus(): Promise<Menu[]> {
  const { data } = await supabase
    .from('menus')
    .select('*')
    .order('created_at', { ascending: true });
  return (data || []) as Menu[];
}

/**
 * Fetch a single menu with its items (flat array).
 */
export async function getMenuWithItems(menuId: string): Promise<{ menu: Menu; items: MenuItem[] } | null> {
  const [{ data: menu }, { data: items }] = await Promise.all([
    supabase.from('menus').select('*').eq('id', menuId).single(),
    supabase.from('menu_items').select('*').eq('menu_id', menuId).order('sort_order', { ascending: true }),
  ]);
  if (!menu) return null;
  return { menu: menu as Menu, items: (items || []) as MenuItem[] };
}

/**
 * Fetch a menu by slug and return items as a nested tree.
 * Used by the storefront header/footer for rendering.
 */
export async function getMenuBySlug(slug: string): Promise<MenuItem[]> {
  const { data: menu } = await supabase
    .from('menus')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!menu) return [];

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_id', menu.id)
    .order('sort_order', { ascending: true });

  if (!items) return [];
  return buildTree(items as MenuItem[]);
}

/**
 * Convert flat array of items into a nested tree using parent_id.
 */
export function buildTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];

  // First pass — init all with empty children
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  // Second pass — nest children under parents
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
