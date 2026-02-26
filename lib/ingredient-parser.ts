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
