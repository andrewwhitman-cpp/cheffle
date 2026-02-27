/**
 * Unit conversion for ingredients.
 * Supports volume (cups, tbsp, tsp, ml) and weight (oz, lb, g, kg).
 * Cross-type conversion (volume ↔ weight) requires density and is not implemented.
 */

export type UnitCategory = 'volume' | 'weight' | 'count' | 'unknown';

const VOLUME_TO_ML: Record<string, number> = {
  cup: 236.588,
  cups: 236.588,
  tbsp: 14.787,
  tablespoon: 14.787,
  tablespoons: 14.787,
  tsp: 4.929,
  teaspoon: 4.929,
  teaspoons: 4.929,
  ml: 1,
};

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
};

function normalizeUnit(unit: string): string {
  return String(unit || '').trim().toLowerCase();
}

export function getUnitCategory(unit: string): UnitCategory {
  const u = normalizeUnit(unit);
  if (!u) return 'unknown';
  if (u in VOLUME_TO_ML) return 'volume';
  if (u in WEIGHT_TO_G) return 'weight';
  if (['pinch', 'dash', 'can', 'cans', 'clove', 'cloves', 'slice', 'slices', 'piece', 'pieces', 'stalk', 'stalks', 'bunch', 'sprig', 'sprigs'].includes(u)) {
    return 'count';
  }
  return 'unknown';
}

/**
 * Convert quantity to base unit (ml for volume, g for weight).
 * Returns null if unit is unknown or not convertible.
 */
export function convertToBaseUnit(quantity: number, unit: string): { value: number; category: UnitCategory } | null {
  const u = normalizeUnit(unit);
  if (!u) return null;

  const volFactor = VOLUME_TO_ML[u];
  if (volFactor != null) {
    return { value: quantity * volFactor, category: 'volume' };
  }

  const weightFactor = WEIGHT_TO_G[u];
  if (weightFactor != null) {
    return { value: quantity * weightFactor, category: 'weight' };
  }

  return null;
}

/**
 * Convert from base unit (ml or g) to target unit.
 */
export function convertFromBaseUnit(value: number, targetUnit: string, category: UnitCategory): number | null {
  const u = normalizeUnit(targetUnit);
  if (!u) return null;

  if (category === 'volume') {
    const factor = VOLUME_TO_ML[u];
    if (factor != null) return value / factor;
  }

  if (category === 'weight') {
    const factor = WEIGHT_TO_G[u];
    if (factor != null) return value / factor;
  }

  return null;
}

/**
 * Convert quantity from one unit to another, if both are in the same category.
 */
export function convertToUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = convertToBaseUnit(quantity, fromUnit);
  if (!from) return null;

  const to = convertFromBaseUnit(from.value, toUnit, from.category);
  return to;
}

/**
 * Check if two units are compatible (same category).
 */
export function areUnitsCompatible(unitA: string, unitB: string): boolean {
  const catA = getUnitCategory(unitA);
  const catB = getUnitCategory(unitB);
  if (catA === 'unknown' || catB === 'unknown') return false;
  return catA === catB;
}

/**
 * Convert to target unit for display. Returns the value in target unit, or original if not convertible.
 */
export function formatQuantityInUnit(value: number, targetUnit: string, category: UnitCategory): string {
  const converted = convertFromBaseUnit(value, targetUnit, category);
  if (converted == null) return String(value);

  if (Number.isInteger(converted) && converted >= 0 && converted < 1000) {
    return String(converted);
  }
  const rounded = Math.round(converted * 100) / 100;
  return String(rounded);
}
