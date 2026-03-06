/**
 * Ingredient density (g/ml) for volume-to-weight conversion.
 * Used when recipe uses volume (tsp, tbsp, cup) and inventory/shopping uses weight (oz, g).
 */

/** Density in g/ml. Default for produce/cheese/solid ingredients. */
const DEFAULT_SPICE_DENSITY = 0.45;
const DEFAULT_FLOUR_DENSITY = 0.53;
const DEFAULT_SUGAR_DENSITY = 0.85;
const DEFAULT_SALT_DENSITY = 1.2;
const DEFAULT_COCOA_DENSITY = 0.35;
const DEFAULT_BAKING_POWDER_DENSITY = 0.9;
const DEFAULT_PRODUCE_DENSITY = 0.55;
const DEFAULT_CHEESE_DENSITY = 0.5;
const DEFAULT_RICE_COOKED_DENSITY = 0.9;
const DEFAULT_HONEY_DENSITY = 1.4;

const FLOUR_PATTERNS = /\b(flour|all-purpose|bread flour|cake flour|whole wheat flour|almond flour)\b/i;
const SUGAR_PATTERNS = /\b(sugar|brown sugar|powdered sugar|confectioners sugar)\b/i;
const SALT_PATTERNS = /\b(salt|sea salt|kosher salt)\b/i;
const COCOA_PATTERNS = /\b(cocoa|cacao|baking cocoa)\b/i;
const BAKING_PATTERNS = /\b(baking powder|baking soda|bicarbonate)\b/i;
const SPICE_PATTERNS = /\b(pepper|powder|chili|chile|cumin|paprika|cinnamon|nutmeg|oregano|basil|thyme|ginger|turmeric|cardamom|cloves|allspice|bay leaf|sage|marjoram|tarragon|dill|mustard powder|garlic powder|onion powder)\b/i;
const HONEY_PATTERNS = /\b(honey)\b/i;
const RICE_PATTERNS = /\b(rice|cooked rice)\b/i;
const CHEESE_PATTERNS = /\b(cheese|feta|parmesan|cheddar|mozzarella|ricotta)\b/i;
const PRODUCE_PATTERNS = /\b(asparagus|broccoli|carrot|carrots|celery|mushroom|mushrooms|zucchini|spinach|kale|lettuce|onion|onions|bell pepper|green pepper|red pepper|peppers|tomato|tomatoes|potato|potatoes|corn|peas|green beans)\b/i;

/**
 * Get density (g/ml) for an ingredient. Used to convert recipe volume to weight.
 */
export function getDensity(name: string): number {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return DEFAULT_PRODUCE_DENSITY;

  if (FLOUR_PATTERNS.test(n)) return DEFAULT_FLOUR_DENSITY;
  if (SUGAR_PATTERNS.test(n)) return DEFAULT_SUGAR_DENSITY;
  if (SALT_PATTERNS.test(n)) return DEFAULT_SALT_DENSITY;
  if (COCOA_PATTERNS.test(n)) return DEFAULT_COCOA_DENSITY;
  if (BAKING_PATTERNS.test(n)) return DEFAULT_BAKING_POWDER_DENSITY;
  if (SPICE_PATTERNS.test(n)) return DEFAULT_SPICE_DENSITY;
  if (HONEY_PATTERNS.test(n)) return DEFAULT_HONEY_DENSITY;
  if (RICE_PATTERNS.test(n)) return DEFAULT_RICE_COOKED_DENSITY;
  if (CHEESE_PATTERNS.test(n)) return DEFAULT_CHEESE_DENSITY;
  if (PRODUCE_PATTERNS.test(n)) return DEFAULT_PRODUCE_DENSITY;

  return DEFAULT_PRODUCE_DENSITY;
}

/**
 * Density for shopping (uncooked grains). Use when converting cooked→uncooked for shopping list.
 */
export function getDensityForShopping(name: string): number {
  const n = String(name || '').toLowerCase().trim();
  if (/\b(rice|pasta|quinoa|lentils?|couscous|barley|oats?|beans?|bulgur|farro)\b/i.test(n) && !n.includes('cooked')) {
    if (/\brice\b/i.test(n)) return 0.85;
    if (/\bpasta\b/i.test(n)) return 0.45;
    if (/\bquinoa\b/i.test(n)) return 0.78;
    if (/\blentils?\b/i.test(n)) return 0.85;
    if (/\bcouscous\b/i.test(n)) return 0.65;
    if (/\bbarley\b/i.test(n)) return 0.62;
    if (/\boats?\b/i.test(n)) return 0.35;
    if (/\bbeans?\b/i.test(n)) return 0.75;
    if (/\bbulgur\b/i.test(n)) return 0.7;
    if (/\bfarro\b/i.test(n)) return 0.75;
  }
  return getDensity(name);
}

/**
 * Convert volume (ml) to weight (g) using ingredient density.
 */
export function convertVolumeToWeight(ml: number, ingredientName: string): number {
  return ml * getDensity(ingredientName);
}

/**
 * Convert volume (ml) to weight (g) for shopping - uses uncooked density for grains.
 */
export function convertVolumeToWeightForShopping(ml: number, ingredientName: string): number {
  return ml * getDensityForShopping(ingredientName);
}

/**
 * Convert weight (g) to volume (ml) using ingredient density.
 */
export function convertWeightToVolume(g: number, ingredientName: string): number {
  const density = getDensity(ingredientName);
  return density > 0 ? g / density : 0;
}

/**
 * True if this ingredient is typically measured by volume in recipes but sold by weight.
 */
export function isVolumeToWeightIngredient(name: string): boolean {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return false;
  return (
    FLOUR_PATTERNS.test(n) ||
    SUGAR_PATTERNS.test(n) ||
    SALT_PATTERNS.test(n) ||
    COCOA_PATTERNS.test(n) ||
    BAKING_PATTERNS.test(n) ||
    SPICE_PATTERNS.test(n)
  );
}

/** Liquids sold by volume (bottles, cartons) - keep as ml/fl oz, don't convert to weight. */
const VOLUME_ONLY_PATTERNS = /\b(oil|olive oil|vegetable oil|sesame oil|canola oil|avocado oil|coconut oil|milk|cream|half-and-half|half and half|vinegar|soy sauce|tamari|broth|stock|water)\b/i;

/**
 * True if this ingredient is sold by volume (oils, milk, vinegar) - keep as fl oz/ml.
 */
export function isVolumeOnlyIngredient(name: string): boolean {
  return VOLUME_ONLY_PATTERNS.test(String(name || '').toLowerCase().trim());
}
