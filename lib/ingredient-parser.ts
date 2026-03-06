/**
 * Parse ingredient strings into { name, quantity, unit }.
 * Handles formats like "2 cups flour", "1 tsp salt", "1/4 cup sugar", "to taste".
 */

export type Quantity =
  | { type: 'numeric'; value: number; range?: [number, number] }
  | { type: 'fuzzy'; raw: string };

/** Fuzzy quantity patterns (case-insensitive) - undefined/variable quantity */
const FUZZY_PATTERNS = [
  /^to\s+taste$/i,
  /^as\s+(needed|desired)$/i,
  /^optional$/i,
  /^for\s+garnish$/i,
  /^some$/i,
  /^a\s+few$/i,
  /^a\s+pinch$/i,
  /^a\s+dash$/i,
];

/** Fuzzy phrases that may appear in ingredient name */
const FUZZY_NAME_PHRASES = /\b(to taste|as needed|as desired|optional|for garnish|some|a few|a pinch|a dash)\b/i;

export function isNumericQuantity(q: Quantity): q is { type: 'numeric'; value: number; range?: [number, number] } {
  return q.type === 'numeric';
}

export function isFuzzyQuantity(q: Quantity): q is { type: 'fuzzy'; raw: string } {
  return q.type === 'fuzzy';
}

/**
 * Parse a quantity string into a typed Quantity.
 * Numeric: integers, decimals, fractions, mixed, ranges.
 * Fuzzy: to taste, as needed, optional, etc.
 */
export function parseQuantity(q: string): Quantity {
  const trimmed = String(q || '').trim();
  if (!trimmed) return { type: 'fuzzy', raw: '' };

  for (const pat of FUZZY_PATTERNS) {
    if (pat.test(trimmed)) return { type: 'fuzzy', raw: trimmed };
  }

  // Simple integer or decimal
  const simple = trimmed.match(/^(\d+\.?\d*)$/);
  if (simple) return { type: 'numeric', value: parseFloat(simple[1]) };

  // Fraction: 1/2, 3/4, etc.
  const frac = trimmed.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const val = parseInt(frac[1], 10) / parseInt(frac[2], 10);
    return { type: 'numeric', value: val };
  }

  // Mixed: 1 1/2, 2 3/4
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    const val = whole + num / den;
    return { type: 'numeric', value: val };
  }

  // Range: 1-2, 1 to 2
  const range = trimmed.match(/^(\d+\.?\d*)\s*[-–—to]+\s*(\d+\.?\d*)$/i);
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    return { type: 'numeric', value: (a + b) / 2, range: [a, b] };
  }

  return { type: 'fuzzy', raw: trimmed };
}

/**
 * Check if an ingredient is fuzzy (undefined/variable quantity).
 * Returns true only for to taste, as needed, optional, etc.
 * Count units with numeric quantity (e.g. "2 cloves") are NOT fuzzy.
 */
export function isFuzzyIngredient(ing: { name: string; quantity: string; unit: string }): boolean {
  const q = parseQuantity(String(ing.quantity || '').trim());
  if (q.type === 'fuzzy') return true;
  const name = String(ing.name || '').trim();
  return FUZZY_NAME_PHRASES.test(name);
}

/**
 * Parse per-unit weight (oz) from ingredient name when unit is embedded, e.g. "(4-6 ounce) salmon filets".
 * Returns average oz per item for ranges, or single value. Returns null if not found.
 */
export function parsePerUnitWeightOzFromName(name: string): number | null {
  const s = String(name || '').trim();
  const rangeMatch = s.match(/\((\d+\.?\d*)\s*[-–—to]+\s*(\d+\.?\d*)\s*(?:ounce|oz)s?\)/i);
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1]);
    const b = parseFloat(rangeMatch[2]);
    return (a + b) / 2;
  }
  const singleMatch = s.match(/\((\d+\.?\d*)\s*(?:ounce|oz)s?\)/i);
  if (singleMatch) {
    return parseFloat(singleMatch[1]);
  }
  return null;
}

/**
 * Convert a recipe ingredient name to natural shopping list format.
 * Strips preparation details (diced, chopped, etc.), parentheticals, and form adjectives.
 * Example: "avocados, diced" -> "avocados"; "crumbled feta cheese" -> "feta cheese"
 */
export function toShoppingListName(name: string): string {
  let s = String(name || '').trim();
  if (!s) return '';

  // Remove parentheticals: (4-6 ounce), (optional), etc.
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Remove trailing prep phrases after comma: ", diced", ", cut into bite-size chunks", etc.
  s = s.replace(/\s*,\s*.*$/, '');

  // Remove leading form adjectives: crumbled, grated, shredded, etc.
  s = s.replace(/^(crumbled|grated|shredded|diced|chopped|minced|sliced)\s+/i, '');

  return s.replace(/\s+/g, ' ').trim();
}

const UNITS = [
  'cup', 'cups', 'cu', 'tbsp', 'tablespoon', 'tablespoons', 'table', 'tables',
  'tsp', 'teaspoon', 'teaspoons', 'teasp', 'teasps',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds',
  'g', 'gram', 'grams', 'kg', 'ml', 'cl',
  'pinch', 'dash', 'can', 'cans', 'clove', 'cloves',
  'slice', 'slices', 'piece', 'pieces', 'stalk', 'stalks', 'bunch', 'sprig', 'sprigs',
  'taste',  // "to taste"
];

export function parseIngredientString(str: string): { name: string; quantity: string; unit: string } {
  const trimmed = str.trim();
  if (!trimmed) return { name: '', quantity: '', unit: '' };

  // "to taste" or similar
  if (/^to\s+taste$/i.test(trimmed)) {
    return { quantity: '', unit: '', name: 'to taste' };
  }

  // Match leading quantity: range (1-2, 1 to 2) first, then fraction, then simple number
  const numMatch = trimmed.match(/^(\d+\.?\d*\s*[-–—to]+\s*\d+\.?\d*|\d+\/\d+|\d+\.?\d*)\s*/);
  if (numMatch) {
    const quantity = numMatch[1].trim();
    const rest = trimmed.slice(numMatch[0].length);

    for (const unit of UNITS) {
      const re = new RegExp(`^(${unit}s?)\\s+(.+)$`, 'i');
      const m = rest.match(re);
      if (m) {
        return { quantity, unit: m[1], name: m[2].trim() };
      }
    }
    return { quantity, unit: '', name: rest.trim() };
  }

  return { name: trimmed, quantity: '', unit: '' };
}

/**
 * Normalize an ingredient that might be a string or object with combined quantity/unit.
 */
export function normalizeIngredient(
  ing: string | { name?: string; quantity?: string; unit?: string }
): { name: string; quantity: string; unit: string } {
  if (typeof ing === 'string') {
    return parseIngredientString(ing);
  }
  const obj = ing as { name?: string; quantity?: string; unit?: string };
  const name = String(obj.name || '').trim();
  let quantity = String(obj.quantity || '').trim();
  let unit = String(obj.unit || '').trim();

  // If quantity contains "2 pounds" but unit is empty, parse it
  if (quantity && !unit && /^(\d+\/\d+|\d+\.?\d*)\s+\w+/.test(quantity)) {
    const parsed = parseIngredientString(`${quantity} ${name}`);
    return parsed;
  }

  // "to taste" etc. in quantity -> move to name
  if (quantity && !unit && /^to\s+taste$/i.test(quantity)) {
    return { name: name ? `${name} (to taste)` : 'to taste', quantity: '', unit: '' };
  }

  return { name, quantity, unit };
}

/**
 * Parse a quantity string to a number. Returns null for fuzzy (e.g. "to taste").
 */
export function parseQuantityToNumber(q: string): number | null {
  const parsed = parseQuantity(String(q || '').trim());
  return parsed.type === 'numeric' ? parsed.value : null;
}

/**
 * Parse quantity for API input (inventory, shopping list). Handles number or string.
 * Returns 0 for invalid/fuzzy.
 */
export function parseQuantityToNumberOrZero(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = parseQuantityToNumber(String(value ?? ''));
  return n ?? 0;
}

function parseQuantityRange(q: string): [number, number] | null {
  const parsed = parseQuantity(String(q || '').trim());
  if (parsed.type === 'numeric') {
    return parsed.range ?? [parsed.value, parsed.value];
  }
  return null;
}

/** Common fractions for readable output */
const FRACTIONS: [number, string][] = [
  [1 / 8, '1/8'],
  [1 / 6, '1/6'],
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [3 / 8, '3/8'],
  [1 / 2, '1/2'],
  [5 / 8, '5/8'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
  [5 / 6, '5/6'],
  [7 / 8, '7/8'],
];

function formatScaledQuantity(value: number): string {
  if (Number.isInteger(value) && value >= 1 && value <= 100) return String(value);

  const whole = Math.floor(value);
  const frac = value - whole;

  if (frac < 0.01) return String(whole);
  if (frac > 0.99) return String(whole + 1);

  // Find closest common fraction
  let best = FRACTIONS[0];
  let bestDiff = Math.abs(frac - best[0]);
  for (const [num, str] of FRACTIONS) {
    const d = Math.abs(frac - num);
    if (d < bestDiff) {
      bestDiff = d;
      best = [num, str];
    }
  }

  if (whole === 0) return best[1];
  return `${whole} ${best[1]}`;
}

/**
 * Scale an ingredient's quantity by a multiplier.
 * Leaves fuzzy ingredients (to taste, as needed, etc.) unchanged.
 * Scales numeric quantities including count units (2 cloves -> 4 cloves).
 */
export function scaleIngredient(
  ing: { name: string; quantity: string; unit: string },
  multiplier: number
): { name: string; quantity: string; unit: string } {
  if (multiplier === 1) return { ...ing };
  if (isFuzzyIngredient(ing)) return { ...ing };
  const range = parseQuantityRange(ing.quantity);
  if (range === null) return { ...ing };
  const [a, b] = range;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (lo === hi) {
    return { ...ing, quantity: formatScaledQuantity(lo * multiplier) };
  }
  return {
    ...ing,
    quantity: `${formatScaledQuantity(lo * multiplier)}–${formatScaledQuantity(hi * multiplier)}`,
  };
}
