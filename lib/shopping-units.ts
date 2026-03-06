/**
 * Convert recipe units to grocery package units (net weight oz/g, volume ml/fl oz).
 * Uses density for spices, flour, sugar, salt. Rounds up for shopping.
 */

import type { UnitCategory } from './unit-conversion';
import {
  convertVolumeToWeightForShopping,
  isVolumeOnlyIngredient,
} from './ingredient-density';
import {
  getPreferredWeightUnit,
  getPreferredVolumeUnit,
  type UnitPreference,
} from './unit-preferences';
import { convertFromBaseUnit } from './unit-conversion';

const FRESH_HERB_PATTERNS = /\b(fresh (cilantro|dill|parsley|basil|mint|rosemary|thyme|oregano)|cilantro|dill|parsley|green onion|scallion|chives)\b/i;
const BUNCH_CAPACITY_ML = 120;

/**
 * Convert aggregated quantity to grocery shopping units.
 * Returns null when no conversion applies (use original recipe unit).
 */
export function toShoppingUnit(
  name: string,
  quantityBase: number,
  category: UnitCategory,
  recipeUnit: string,
  unitPreference: UnitPreference | string | null | undefined = 'metric'
): { quantity: number; unit: string } | null {
  if (category === 'count' || category === 'unknown') return null;

  const weightUnit = getPreferredWeightUnit(unitPreference);
  const volumeUnit = getPreferredVolumeUnit(unitPreference);

  if (category === 'volume') {
    if (FRESH_HERB_PATTERNS.test(String(name || '').toLowerCase())) {
      const qty = Math.ceil(quantityBase / BUNCH_CAPACITY_ML);
      return {
        quantity: Math.max(1, qty),
        unit: qty === 1 ? 'bunch' : 'bunches',
      };
    }
    if (isVolumeOnlyIngredient(name)) {
      const converted = convertFromBaseUnit(quantityBase, volumeUnit, 'volume');
      if (converted == null) return null;
      return {
        quantity: Math.ceil(converted),
        unit: volumeUnit,
      };
    }
    // Default to weight: asparagus, rice, cheese, honey, etc. are sold by weight
    const weightG = convertVolumeToWeightForShopping(quantityBase, name);
    const converted = convertFromBaseUnit(weightG, weightUnit, 'weight');
    if (converted == null) return null;
    return {
      quantity: Math.ceil(converted),
      unit: weightUnit,
    };
  }

  if (category === 'weight') {
    const converted = convertFromBaseUnit(quantityBase, weightUnit, 'weight');
    if (converted == null) return null;
    return {
      quantity: Math.ceil(converted),
      unit: weightUnit,
    };
  }

  return null;
}
