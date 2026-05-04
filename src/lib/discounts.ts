import { supabase } from './supabase';

export type DiscountTargetType = 'product' | 'category' | 'tag';
export type DiscountRangeType  = 'percent' | 'fixed';

export interface DiscountRange {
  id: string;
  min: number;
  max: number | null;
  type: DiscountRangeType;
  value: number;
  label: string;
}

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountTargetType;
  targetValues: string[];
  ranges: DiscountRange[];
  createdAt: number;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapRule(row: Record<string, unknown>): DiscountRule {
  return {
    id:           row.id as string,
    name:         row.name as string,
    type:         row.type as DiscountTargetType,
    targetValues: (row.target_values as string[]) || [],
    ranges:       (row.ranges as DiscountRange[]) || [],
    createdAt:    (row.created_at as number) || Date.now(),
  };
}

// ─── SUPABASE OPERATIONS ──────────────────────────────────────────────────────

export async function getDiscountRules(): Promise<DiscountRule[]> {
  try {
    const { data, error } = await supabase
      .from('discount_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRule);
  } catch (err) {
    console.error('Supabase getDiscountRules:', err);
    return [];
  }
}

export async function saveDiscountRule(rule: DiscountRule): Promise<void> {
  const { error } = await supabase
    .from('discount_rules')
    .upsert({
      id:            rule.id,
      name:          rule.name,
      type:          rule.type,
      target_values: rule.targetValues,
      ranges:        rule.ranges,
      created_at:    rule.createdAt,
    }, { onConflict: 'id' });

  if (error) {
    console.error('Supabase saveDiscountRule:', error);
    throw error;
  }
}

export async function deleteDiscountRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('discount_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase deleteDiscountRule:', error);
    throw error;
  }
}

// ─── PRICING LOGIC ─────────────────────────────────────────────────────────────
// v2.5 — "Best Deal Guarantee"
// The function now accepts an optional `activePrice` (the product's current
// native selling price, i.e. sale price if on sale, otherwise regular price).
// The engine will NEVER return a price higher than activePrice, preventing the
// old tug-of-war where bulk rules accidentally overrode a better native sale.

interface DiscountProduct {
  id: string;
  category?: string;
  tags?: string[];
  price?: string | null;
}

export function calculateBestPrice(
  basePriceStr: string,
  quantity: number,
  product: DiscountProduct,
  rules: DiscountRule[],
  activePriceStr?: string  // The product's current native selling price (sale price if on sale)
): { price: number; formattedPrice: string; appliedRule: DiscountRule | null; appliedRange: DiscountRange | null } {
  const basePrice = parseFloat(basePriceStr.replace(/[^0-9.]/g, ''));
  if (isNaN(basePrice)) return { price: 0, formattedPrice: basePriceStr, appliedRule: null, appliedRange: null };

  // Establish the "ceiling" — the best native price the customer can already get
  let activePrice = basePrice;
  if (activePriceStr) {
    const parsed = parseFloat(activePriceStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) activePrice = parsed;
  }

  let bestPrice = activePrice; // Start from the active native price, not basePrice
  let appliedRule: DiscountRule | null = null;
  let appliedRange: DiscountRange | null = null;

  for (const rule of rules) {
    let match = false;

    if (rule.type === 'product' && rule.targetValues.includes(product.id)) {
      match = true;
    } else if (rule.type === 'category' && product.category && rule.targetValues.includes(product.category)) {
      match = true;
    } else if (rule.type === 'tag' && product.tags && product.tags.some(t => rule.targetValues.includes(t))) {
      match = true;
    }

    if (match) {
      for (const range of rule.ranges) {
        const max = range.max === null ? Infinity : range.max;
        if (quantity >= range.min && quantity <= max) {
          let calculatedPrice: number;

          if (range.type === 'percent') {
            // Calculate percentage off from the BASE price (respects "calc from" setting)
            calculatedPrice = basePrice * (1 - range.value / 100);
          } else if (range.type === 'fixed') {
            calculatedPrice = range.value;
          } else {
            calculatedPrice = basePrice;
          }

          // BEST DEAL GUARANTEE: Only apply if genuinely cheaper than the native active price
          if (calculatedPrice < bestPrice - 0.001) {
            bestPrice    = calculatedPrice;
            appliedRule  = rule;
            appliedRange = range;
          }
        }
      }
    }
  }

  return {
    price:         bestPrice,
    formattedPrice: `£${bestPrice.toFixed(2)}`,
    appliedRule,
    appliedRange,
  };
}
