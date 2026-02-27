/**
 * Parse servings string to a numeric value for storage and scaling.
 * Handles "4", "4-6", "6 servings", "Makes 12 cookies", etc.
 */
export function parseServingsToNumber(
  str: string | number | null | undefined
): number | null {
  if (str == null) return null;
  if (typeof str === 'number') {
    const n = Math.round(str);
    return n > 0 ? n : null;
  }
  const s = String(str).trim();
  if (!s) return null;

  // Match first number or range (e.g. "4", "4-6", "6 servings")
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    const mid = Math.round((low + high) / 2);
    return mid > 0 ? mid : null;
  }

  const numMatch = s.match(/\d+(?:\.\d+)?/);
  if (numMatch) {
    const n = Math.round(parseFloat(numMatch[0]));
    return n > 0 ? n : null;
  }
  return null;
}

/**
 * Scale servings by multiplier. Returns rounded integer or null.
 */
export function scaleServingsDisplay(
  servings: number | null | undefined,
  scale: number
): number | null {
  if (servings == null || servings <= 0) return null;
  const scaled = Math.round(servings * scale);
  return scaled > 0 ? scaled : null;
}
