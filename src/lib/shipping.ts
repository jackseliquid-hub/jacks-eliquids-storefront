import { CartItem } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

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

const DEFAULT_CONFIG: ShippingConfig = {
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
  parcel_cost_heavy: 7.99
};

/**
 * Fetch dynamic shipping config from Supabase `global_settings` table.
 * Falls back to default hardcoded config built from the Woo Plugin if not found.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'shipping_config')
      .single();

    if (error || !data) {
      return DEFAULT_CONFIG;
    }

    return data.value as ShippingConfig;
  } catch (err) {
    return DEFAULT_CONFIG;
  }
}

/**
 * Calculates the shipping cost exactly mirroring the WooCommerce algorithm.
 */
export function calculateShippingQuote(cartItems: CartItem[], config: ShippingConfig) {
  let totalWeight = 0;
  let hasSmallParcel = false;

  const parcelClassSlug = 'small-parcel';

  // 1. Group the whole cart. Find the total weight and if any specific item triggers the small-parcel class.
  for (const item of cartItems) {
    // If the cart item has weight stored, multiply by qty
    if (item.weight && !isNaN(item.weight)) {
      totalWeight += item.weight * item.quantity;
    }

    if (item.shippingClass === parcelClassSlug) {
      hasSmallParcel = true;
    }
  }

  // 2. Base package type logic
  let packageType = 'large-letter';
  if (hasSmallParcel || totalWeight > config.large_letter_max_weight) {
    packageType = 'small-parcel';
  }

  let shippingCost = 0.00;
  let shippingName = "Standard Shipping";

  // 3. Price brackets
  if (packageType === 'small-parcel') {
    shippingName += " (Small Parcel)";
    
    if (totalWeight <= config.parcel_tier_1_weight) {
      shippingCost = config.parcel_cost_1;
    } else {
      shippingCost = config.parcel_cost_heavy;
    }
  } else {
    shippingName += " (Large Letter)";
    
    if (totalWeight <= config.ll_tier_1_weight) {
      shippingCost = config.ll_cost_1;
    } else if (totalWeight <= config.ll_tier_2_weight) {
      shippingCost = config.ll_cost_2;
    } else if (totalWeight <= config.ll_tier_3_weight) {
      shippingCost = config.ll_cost_3;
    } else {
      shippingCost = config.ll_cost_4;
    }
  }

  return {
    packageType,
    totalWeight,
    shippingName,
    shippingCost,
    formattedCost: `£${shippingCost.toFixed(2)}`
  };
}
