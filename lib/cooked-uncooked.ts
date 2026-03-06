/**
 * Convert cooked ingredient quantities to uncooked for shopping.
 * People buy rice, pasta, etc. uncooked; recipes often specify cooked amounts.
 */

/** Volume expansion: 1 unit uncooked → N units cooked. Uncooked = cooked / N. */
const COOKED_EXPANSION: { pattern: RegExp; ratio: number }[] = [
  { pattern: /\b(cooked\s+)?rice\b/i, ratio: 3 },
  { pattern: /\b(cooked\s+)?pasta\b/i, ratio: 2 },
  { pattern: /\b(cooked\s+)?quinoa\b/i, ratio: 3 },
  { pattern: /\b(cooked\s+)?lentils?\b/i, ratio: 2.5 },
  { pattern: /\b(cooked\s+)?couscous\b/i, ratio: 2 },
  { pattern: /\b(cooked\s+)?barley\b/i, ratio: 3.5 },
  { pattern: /\b(cooked\s+)?(rolled\s+)?oats?\b/i, ratio: 2 },
  { pattern: /\b(cooked\s+)?(dried\s+)?beans?\b/i, ratio: 2.5 },
  { pattern: /\b(cooked\s+)?bulgur\b/i, ratio: 2.5 },
  { pattern: /\b(cooked\s+)?farro\b/i, ratio: 2.5 },
];

/** Density of uncooked grains (g/ml) for volume-to-weight. */
const UNCOOKED_DENSITY: Record<string, number> = {
  rice: 0.85,
  pasta: 0.45,
  quinoa: 0.78,
  lentils: 0.85,
  couscous: 0.65,
  barley: 0.62,
  oats: 0.35,
  beans: 0.75,
  bulgur: 0.7,
  farro: 0.75,
};

function getUncookedDensity(name: string): number {
  const n = String(name || '').toLowerCase().trim();
  for (const key of Object.keys(UNCOOKED_DENSITY)) {
    if (n.includes(key)) return UNCOOKED_DENSITY[key];
  }
  return 0.85;
}

/**
 * Get expansion ratio if this is a cooked ingredient sold uncooked. Returns null if not applicable.
 */
export function getCookedToUncookedRatio(name: string): number | null {
  const n = String(name || '').toLowerCase().trim();
  if (!n || !n.includes('cooked')) return null;
  for (const { pattern, ratio } of COOKED_EXPANSION) {
    if (pattern.test(n)) return ratio;
  }
  return null;
}

/**
 * Convert cooked quantity (ml) to uncooked quantity (ml). Returns null if not a cooked ingredient.
 */
export function convertCookedVolumeToUncooked(ml: number, name: string): number | null {
  const ratio = getCookedToUncookedRatio(name);
  if (ratio == null) return null;
  return ml / ratio;
}

/**
 * Shopping list name for cooked ingredients: strip "cooked" and use base name.
 */
export function toUncookedShoppingName(name: string): string {
  let s = String(name || '').trim();
  if (!s) return '';
  s = s.replace(/\bcooked\s+/gi, '');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Canonical name for aggregation: "cooked rice" and "rice" both become "rice".
 */
export function getCanonicalGroceryName(name: string): string {
  if (getCookedToUncookedRatio(name) != null) {
    return toUncookedShoppingName(name);
  }
  return name;
}

/**
 * If ingredient is cooked and sold uncooked, return { quantityBase: uncooked_ml, name: uncooked_name }.
 * quantityBase is in ml (volume). For volume category, we convert cooked ml to uncooked ml.
 * Then shopping-units will convert uncooked ml to weight using uncooked density.
 */
export function toUncookedForShopping(
  quantityBase: number,
  category: string,
  name: string
): { quantityBase: number; name: string } | null {
  if (category !== 'volume') return null;
  const uncookedMl = convertCookedVolumeToUncooked(quantityBase, name);
  if (uncookedMl == null) return null;
  return {
    quantityBase: uncookedMl,
    name: toUncookedShoppingName(name),
  };
}

/**
 * Get density for uncooked grains (used when we've converted cooked→uncooked).
 */
export function getUncookedDensityForShopping(name: string): number {
  return getUncookedDensity(name);
}
