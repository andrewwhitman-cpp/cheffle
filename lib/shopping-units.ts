/**
 * Convert recipe units to shopping/purchase units (jar, bottle, bunch, etc.).
 */

import type { UnitCategory } from './unit-conversion';

export type PurchaseCategory = 'spice' | 'oil' | 'condiment' | 'fresh_herb' | 'dairy_liquid';

interface PurchaseUnitConfig {
  unit: string;
  capacityMl: number;
  capacityG: number;
}

const PURCHASE_CONFIG: Record<PurchaseCategory, PurchaseUnitConfig> = {
  spice: { unit: 'jar', capacityMl: 60, capacityG: 60 },
  oil: { unit: 'bottle', capacityMl: 500, capacityG: 0 },
  condiment: { unit: 'bottle', capacityMl: 355, capacityG: 0 },
  fresh_herb: { unit: 'bunch', capacityMl: 120, capacityG: 0 },
  dairy_liquid: { unit: 'container', capacityMl: 1000, capacityG: 0 },
};

const SPICE_PATTERNS = /\b(pepper|powder|chili|chile|cumin|paprika|cinnamon|nutmeg|oregano|basil|thyme|ginger|turmeric|cardamom|cloves|allspice|bay leaf|sage|marjoram|tarragon|dill|mustard powder|garlic powder|onion powder)\b/i;
const OIL_PATTERNS = /\b(oil|olive oil|vegetable oil|sesame oil|canola oil|avocado oil|coconut oil)\b/i;
const CONDIMENT_PATTERNS = /\b(honey|soy sauce|tamari|vinegar|mustard|ketchup|hot sauce|sriracha|fish sauce|worcestershire)\b/i;
const FRESH_HERB_PATTERNS = /\b(fresh (cilantro|dill|parsley|basil|mint|rosemary|thyme|oregano)|cilantro|dill|parsley|green onion|scallion|chives)\b/i;
const DAIRY_LIQUID_PATTERNS = /\b(milk|cream|half-and-half|half and half)\b/i;

const SHOPPING_FRIENDLY_UNITS = new Set([
  'jar', 'jars', 'bottle', 'bottles', 'bunch', 'bunches', 'can', 'cans',
  'container', 'containers', 'bag', 'bags', 'box', 'boxes', 'package', 'packages',
]);

function normalizeUnit(unit: string): string {
  return String(unit || '').trim().toLowerCase();
}

/**
 * Get the purchase category for an ingredient name, or null if not a purchase-unit ingredient.
 */
export function getPurchaseCategory(name: string): PurchaseCategory | null {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return null;
  if (FRESH_HERB_PATTERNS.test(n)) return 'fresh_herb';
  if (SPICE_PATTERNS.test(n)) return 'spice';
  if (OIL_PATTERNS.test(n)) return 'oil';
  if (CONDIMENT_PATTERNS.test(n)) return 'condiment';
  if (DAIRY_LIQUID_PATTERNS.test(n)) return 'dairy_liquid';
  return null;
}

/**
 * Convert aggregated quantity to shopping/purchase units.
 * Returns null when no conversion applies (use original recipe unit).
 */
export function toShoppingUnit(
  name: string,
  quantityBase: number,
  category: UnitCategory,
  recipeUnit: string
): { quantity: number; unit: string } | null {
  const purchaseCat = getPurchaseCategory(name);
  if (!purchaseCat) return null;

  const u = normalizeUnit(recipeUnit);
  if (SHOPPING_FRIENDLY_UNITS.has(u)) return null;

  const config = PURCHASE_CONFIG[purchaseCat];
  if (!config) return null;

  if (category === 'count' || category === 'unknown') return null;

  let quantity: number;
  if (category === 'volume') {
    quantity = Math.ceil(quantityBase / config.capacityMl);
  } else if (category === 'weight' && config.capacityG > 0) {
    quantity = Math.ceil(quantityBase / config.capacityG);
  } else {
    return null;
  }

  if (quantity < 1) quantity = 1;

  const plural = config.unit === 'bunch' ? 'bunches' : config.unit + 's';
  return {
    quantity,
    unit: quantity === 1 ? config.unit : plural,
  };
}
