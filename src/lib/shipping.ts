import { CartItem } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  sort_order: number;
}

export interface ShippingMethod {
  id: string;
  zone_id: string | null;
  title: string;
  enabled: boolean;
  sort_order: number;
  ll_max_weight: number;
  ll_tier_1_weight: number | null;
  ll_cost_1: number | null;
  ll_tier_2_weight: number | null;
  ll_cost_2: number | null;
  ll_tier_3_weight: number | null;
  ll_cost_3: number | null;
  ll_cost_4: number | null;
  parcel_tier_1_weight: number;
  parcel_cost_1: number;
  parcel_cost_heavy: number;
}

export interface ShippingQuote {
  methodId: string;
  methodTitle: string;
  packageType: 'large-letter' | 'small-parcel';
  totalWeight: number;
  shippingCost: number;
  label: string;             // e.g. "Royal Mail Tracked (Small Parcel)"
  formattedCost: string;     // e.g. "£3.95"
}

/**
 * Legacy ShippingConfig — kept for backward compatibility with checkout/actions.ts
 */
export interface ShippingConfig {
  large_letter_max_weight: number;
  ll_tier_1_weight: number;
  ll_cost_1: number;
  ll_tier_2_weight: number;
  ll_cost_2: number;
  ll_tier_3_weight: number;
  ll_cost_3: number;
  ll_cost_4: number;
  parcel_tier_1_weight: number;
  parcel_cost_1: number;
  parcel_cost_heavy: number;
}

// ─── Fetch ──────────────────────────────────────────────────────────────────────

/**
 * Fetch ALL shipping methods from the database (for the admin page).
 */
export async function getShippingMethods(): Promise<ShippingMethod[]> {
  const { data, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as ShippingMethod[];
}

/**
 * Fetch all zones with their methods nested inside.
 */
export async function getShippingZonesWithMethods(): Promise<Array<ShippingZone & { methods: ShippingMethod[] }>> {
  const [{ data: zones }, { data: methods }] = await Promise.all([
    supabase.from('shipping_zones').select('*').order('sort_order', { ascending: true }),
    supabase.from('shipping_methods').select('*').order('sort_order', { ascending: true }),
  ]);
  if (!zones) return [];
  return (zones as ShippingZone[]).map(zone => ({
    ...zone,
    methods: ((methods || []) as ShippingMethod[]).filter(m => m.zone_id === zone.id),
  }));
}

/**
 * Fetch only ENABLED shipping methods (for the checkout).
 */
export async function getEnabledShippingMethods(): Promise<ShippingMethod[]> {
  const { data, error } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as ShippingMethod[];
}

/**
 * Fetch enabled shipping methods for a specific country.
 * Matches the zone whose countries array contains the given country string.
 * Falls back to the first zone if no match (covers legacy UK-only setup).
 */
export async function getEnabledShippingMethodsForCountry(country: string): Promise<ShippingMethod[]> {
  // Find a zone matching this country
  const { data: zones } = await supabase
    .from('shipping_zones')
    .select('id, countries')
    .order('sort_order', { ascending: true });

  if (!zones || zones.length === 0) {
    // No zones yet — fall back to all enabled methods
    return getEnabledShippingMethods();
  }

  // Match country (case-insensitive substring)
  const countryLower = country.toLowerCase();
  let matchedZone = (zones as ShippingZone[]).find(z =>
    z.countries.some(c => c.toLowerCase().includes(countryLower) || countryLower.includes(c.toLowerCase()))
  );

  // Fall back to first zone
  if (!matchedZone) matchedZone = zones[0] as ShippingZone;

  const { data: methods } = await supabase
    .from('shipping_methods')
    .select('*')
    .eq('zone_id', matchedZone.id)
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  return (methods || []) as ShippingMethod[];
}

/**
 * Legacy function — kept so existing checkout/actions.ts doesn't break.
 * Returns a dummy ShippingConfig that triggers fallback to default values.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  // Not used for the new multi-method checkout — returns defaults
  return {
    large_letter_max_weight: 750,
    ll_tier_1_weight: 100,
    ll_cost_1: 1.75,
    ll_tier_2_weight: 250,
    ll_cost_2: 2.50,
    ll_tier_3_weight: 500,
    ll_cost_3: 2.80,
    ll_cost_4: 2.95,
    parcel_tier_1_weight: 2000,
    parcel_cost_1: 4.69,
    parcel_cost_heavy: 7.99,
  };
}

// ─── Calculation ────────────────────────────────────────────────────────────────

/**
 * Work out total cart weight and whether any item forces "small-parcel" class.
 */
export function analyseCart(cartItems: CartItem[]): { totalWeight: number; hasSmallParcel: boolean } {
  let totalWeight = 0;
  let hasSmallParcel = false;

  for (const item of cartItems) {
    if (item.weight && !isNaN(item.weight)) {
      totalWeight += item.weight * item.quantity;
    }
    // Check for small parcel class — handle all formats:
    // "Small Parcel", "small-parcel", "small_parcel", etc.
    const sc = (item.shippingClass || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (sc === 'smallparcel') {
      hasSmallParcel = true;
    }
  }

  return { totalWeight, hasSmallParcel };
}

/**
 * Calculate the cost for one shipping method given a cart analysis.
 * Mirrors the WooCommerce PHP plugin logic exactly.
 */
export function calculateMethodQuote(
  method: ShippingMethod,
  totalWeight: number,
  hasSmallParcel: boolean
): ShippingQuote {
  // Determine package type
  const isParcel = hasSmallParcel || totalWeight > method.ll_max_weight;
  const packageType: 'large-letter' | 'small-parcel' = isParcel ? 'small-parcel' : 'large-letter';

  let shippingCost = 0;

  if (packageType === 'small-parcel') {
    if (totalWeight <= (method.parcel_tier_1_weight ?? 2000)) {
      shippingCost = method.parcel_cost_1 ?? 4.69;
    } else {
      shippingCost = method.parcel_cost_heavy ?? 7.99;
    }
  } else {
    // Large letter — walk through tiers
    const t1w = method.ll_tier_1_weight;
    const t2w = method.ll_tier_2_weight;
    const t3w = method.ll_tier_3_weight;

    if (t1w !== null && totalWeight <= t1w && method.ll_cost_1 !== null) {
      shippingCost = method.ll_cost_1;
    } else if (t2w !== null && totalWeight <= t2w && method.ll_cost_2 !== null) {
      shippingCost = method.ll_cost_2;
    } else if (t3w !== null && totalWeight <= t3w && method.ll_cost_3 !== null) {
      shippingCost = method.ll_cost_3;
    } else if (method.ll_cost_4 !== null) {
      shippingCost = method.ll_cost_4;
    } else if (method.ll_cost_1 !== null) {
      // Fallback — use tier 1 cost
      shippingCost = method.ll_cost_1;
    }
  }

  const typeLabel = packageType === 'small-parcel' ? 'Small Parcel' : 'Large Letter';
  const label = `${method.title} (${typeLabel})`;

  return {
    methodId: method.id,
    methodTitle: method.title,
    packageType,
    totalWeight,
    shippingCost,
    label,
    formattedCost: `£${shippingCost.toFixed(2)}`,
  };
}

/**
 * Calculate quotes for ALL enabled methods at once.
 * Returns an array — one entry per method.
 */
export function calculateAllQuotes(
  methods: ShippingMethod[],
  cartItems: CartItem[]
): ShippingQuote[] {
  const { totalWeight, hasSmallParcel } = analyseCart(cartItems);
  return methods.map(m => calculateMethodQuote(m, totalWeight, hasSmallParcel));
}

/**
 * Legacy single-quote function — kept for backward compat with checkout/actions.ts.
 */
export function calculateShippingQuote(
  cartItems: CartItem[],
  config: ShippingConfig
): { packageType: string; totalWeight: number; shippingName: string; shippingCost: number; formattedCost: string } {
  const { totalWeight, hasSmallParcel } = analyseCart(cartItems);

  const isParcel = hasSmallParcel || totalWeight > config.large_letter_max_weight;
  const packageType = isParcel ? 'small-parcel' : 'large-letter';

  let shippingCost = 0;
  let shippingName = 'Standard Shipping';

  if (packageType === 'small-parcel') {
    shippingName += ' (Small Parcel)';
    shippingCost = totalWeight <= config.parcel_tier_1_weight ? config.parcel_cost_1 : config.parcel_cost_heavy;
  } else {
    shippingName += ' (Large Letter)';
    if (totalWeight <= config.ll_tier_1_weight)      shippingCost = config.ll_cost_1;
    else if (totalWeight <= config.ll_tier_2_weight) shippingCost = config.ll_cost_2;
    else if (totalWeight <= config.ll_tier_3_weight) shippingCost = config.ll_cost_3;
    else                                              shippingCost = config.ll_cost_4;
  }

  return { packageType, totalWeight, shippingName, shippingCost, formattedCost: `£${shippingCost.toFixed(2)}` };
}
