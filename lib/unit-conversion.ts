/**
 * Unit conversion for ingredients.
 * Supports volume (cups, tbsp, tsp, ml) and weight (oz, lb, g, kg).
 * Cross-type conversion (volume ↔ weight) requires density and is not implemented.
 *
 * US volume factors preserve exact relationships: 1 fl oz = 2 tbsp, 1 cup = 8 fl oz.
 * Source: NIST (1 US fl oz = 29.5735295625 ml, 1 US tbsp = 14.78676478125 ml).
 */
export type UnitCategory = 'volume' | 'weight' | 'count' | 'unknown';

const ML_PER_FL_OZ = 29.5735295625;
const ML_PER_TBSP = 14.78676478125; // 1/2 fl oz exactly
const ML_PER_TSP = 4.92892159375;   // 1/6 fl oz
const ML_PER_CUP = 236.5882365;     // 8 fl oz

const VOLUME_TO_ML: Record<string, number> = {
  cup: ML_PER_CUP,
  cups: ML_PER_CUP,
  tbsp: ML_PER_TBSP,
  tablespoon: ML_PER_TBSP,
  tablespoons: ML_PER_TBSP,
  tsp: ML_PER_TSP,
  teaspoon: ML_PER_TSP,
  teaspoons: ML_PER_TSP,
  ml: 1,
  'fl oz': ML_PER_FL_OZ,
  'fluid ounce': ML_PER_FL_OZ,
  'fluid ounces': ML_PER_FL_OZ,
  // Purchase units (default capacities for inventory consumption)
  jar: 60,
  jars: 60,
  bottle: 500,
  bottles: 500,
  bunch: 120,
  bunches: 120,
  container: 1000,
  containers: 1000,
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

/** Snap to nearest integer when within epsilon (fixes floating-point artifacts). */
function snapIfNearInteger(x: number, epsilon = 1e-10): number {
  const rounded = Math.round(x);
  return Math.abs(x - rounded) < epsilon ? rounded : x;
}

/**
 * Convert from base unit (ml or g) to target unit.
 * Snaps to integer when result is within floating-point epsilon of a whole number.
 */
export function convertFromBaseUnit(value: number, targetUnit: string, category: UnitCategory): number | null {
  const u = normalizeUnit(targetUnit);
  if (!u) return null;

  let result: number | null = null;
  if (category === 'volume') {
    const factor = VOLUME_TO_ML[u];
    if (factor != null) result = value / factor;
  } else if (category === 'weight') {
    const factor = WEIGHT_TO_G[u];
    if (factor != null) result = value / factor;
  }

  return result != null ? snapIfNearInteger(result) : null;
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
