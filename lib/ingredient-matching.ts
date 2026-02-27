/**
 * Fuzzy matching for ingredients.
 * Matches recipe ingredients to inventory items by name similarity.
 */

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface MatchResult {
  inventoryItem: InventoryItem;
  confidence: number;
}

const SIMILARITY_THRESHOLD = 0.5;

function normalizeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove parentheticals like "(optional)"
    .replace(/\s*,\s*.*$/, '') // Remove trailing ", chopped" etc.
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * Find the best matching inventory item for a recipe ingredient.
 * Returns null if no match above threshold.
 */
export function findBestInventoryMatch(
  recipeIngredient: RecipeIngredient,
  inventoryItems: InventoryItem[]
): MatchResult | null {
  const normRecipe = normalizeName(recipeIngredient.name);
  if (!normRecipe) return null;

  let best: MatchResult | null = null;

  for (const inv of inventoryItems) {
    const normInv = normalizeName(inv.name);
    if (!normInv) continue;

    let score = similarity(normRecipe, normInv);

    // Boost if one contains the other (e.g. "flour" in "all-purpose flour")
    if (normInv.includes(normRecipe) || normRecipe.includes(normInv)) {
      score = Math.max(score, 0.85);
    }

    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.confidence)) {
      best = { inventoryItem: inv, confidence: score };
    }
  }

  return best;
}
