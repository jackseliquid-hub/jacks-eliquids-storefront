import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';

export type DiscountTargetType = 'product' | 'category' | 'tag';
export type DiscountRangeType = 'percent' | 'fixed';

export interface DiscountRange {
  id: string;
  min: number;
  max: number | null; // null means infinity
  type: DiscountRangeType;
  value: number;
  label: string;
}

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountTargetType;
  targetValues: string[]; // Product IDs, Category Names, or Tag Names
  ranges: DiscountRange[];
  createdAt: number;
}

// ─── FIRESTORE OPERATIONS ──────────────────────────────────────────────

export async function getDiscountRules(): Promise<DiscountRule[]> {
  try {
    const q = query(collection(db, 'discounts'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DiscountRule[];
  } catch (err) {
    console.error("Error fetching discounts:", err);
    return [];
  }
}

export async function saveDiscountRule(rule: DiscountRule): Promise<void> {
  try {
    await setDoc(doc(db, 'discounts', rule.id), rule);
  } catch (err) {
    console.error("Error saving discount rule:", err);
    throw err;
  }
}

export async function deleteDiscountRule(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'discounts', id));
  } catch (err) {
    console.error("Error deleting discount rule:", err);
    throw err;
  }
}

// ─── PRICING LOGIC ─────────────────────────────────────────────────────

// Minimum product representation needed to calculate discounts
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
    
    // Check if the product matches the rule's target type
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
          
          // Apply if this is the lowest price found so far
          if (calculatedPrice < bestPrice - 0.001) { // 0.001 epsilon for float comparison
            bestPrice = calculatedPrice;
            appliedRule = rule;
            appliedRange = range;
          }
        }
      }
    }
  }

  return {
    price: bestPrice,
    formattedPrice: `£${bestPrice.toFixed(2)}`,
    appliedRule,
    appliedRange
  };
}
