/**
 * Parse ingredient strings into { name, quantity, unit }.
 * Handles formats like "2 cups flour", "1 tsp salt", "1/4 cup sugar", "to taste".
 */

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

  // Match leading number or fraction
  const numMatch = trimmed.match(/^(\d+\/\d+|\d+\.?\d*)\s*/);
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
 * Parse a quantity string to a number. Returns null for non-numeric (e.g. "to taste").
 */
export function parseQuantityToNumber(q: string): number | null {
  const trimmed = String(q || '').trim();
  if (!trimmed) return null;
  if (/^to\s+taste$/i.test(trimmed)) return null;

  // Simple integer or decimal
  const simple = trimmed.match(/^(\d+\.?\d*)$/);
  if (simple) return parseFloat(simple[1]);

  // Fraction: 1/2, 3/4, etc.
  const frac = trimmed.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);

  // Mixed: 1 1/2, 2 3/4
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    return whole + num / den;
  }

  // Range: 1-2, 1 to 2 - return midpoint for single-value scaling
  const range = trimmed.match(/^(\d+\.?\d*)\s*[-–—to]+\s*(\d+\.?\d*)$/i);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;

  return null;
}

function parseQuantityRange(q: string): [number, number] | null {
  const range = String(q || '').trim().match(/^(\d+\.?\d*)\s*[-–—to]+\s*(\d+\.?\d*)$/i);
  if (range) return [parseFloat(range[1]), parseFloat(range[2])];
  const num = parseQuantityToNumber(q);
  return num !== null ? [num, num] : null;
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
 * Scale an ingredient's quantity by a multiplier. Leaves "to taste" and empty quantities unchanged.
 */
export function scaleIngredient(
  ing: { name: string; quantity: string; unit: string },
  multiplier: number
): { name: string; quantity: string; unit: string } {
  if (multiplier === 1) return { ...ing };
  const range = parseQuantityRange(ing.quantity);
  if (range === null) return { ...ing };
  const [a, b] = range;
  if (a === b) {
    return { ...ing, quantity: formatScaledQuantity(a * multiplier) };
  }
  return {
    ...ing,
    quantity: `${formatScaledQuantity(a * multiplier)}–${formatScaledQuantity(b * multiplier)}`,
  };
}
