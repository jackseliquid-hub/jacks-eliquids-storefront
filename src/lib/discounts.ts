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
// (Pure calculation — no DB calls, works identically to the old version)

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
  rules: DiscountRule[]
): { price: number; formattedPrice: string; appliedRule: DiscountRule | null; appliedRange: DiscountRange | null } {
  const basePrice = parseFloat(basePriceStr.replace(/[^0-9.]/g, ''));
  if (isNaN(basePrice)) return { price: 0, formattedPrice: basePriceStr, appliedRule: null, appliedRange: null };

  let bestPrice = basePrice;
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
          let calculatedPrice = basePrice;

          if (range.type === 'percent') {
            calculatedPrice = basePrice * (1 - range.value / 100);
          } else if (range.type === 'fixed') {
            calculatedPrice = range.value;
          }

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
