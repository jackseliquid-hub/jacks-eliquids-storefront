'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { ShippingMethod, ShippingZone } from '@/lib/shipping';

const supabase = createAdminClient();

export async function createShippingMethod(data: Omit<ShippingMethod, 'id'>): Promise<{ error?: string }> {
  const { error } = await supabase.from('shipping_methods').insert([{
    ...data,
    updated_at: new Date().toISOString(),
  }]);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}

export async function updateShippingMethod(id: string, data: Partial<ShippingMethod>): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('shipping_methods')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}

export async function deleteShippingMethod(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('shipping_methods').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}

export async function toggleShippingMethod(id: string, enabled: boolean): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('shipping_methods')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}

// ─── Zone Actions ────────────────────────────────────────────────────────────────

export async function createShippingZone(data: { name: string; countries: string[]; sort_order: number }): Promise<{ error?: string }> {
  const { error } = await supabase.from('shipping_zones').insert([data]);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}

export async function updateShippingZone(id: string, data: Partial<ShippingZone>): Promise<{ error?: string }> {
  const { error } = await supabase.from('shipping_zones').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}

export async function deleteShippingZone(id: string): Promise<{ error?: string }> {
  // Methods will have zone_id set to NULL (ON DELETE SET NULL)
  const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/shipping');
  return {};
}
