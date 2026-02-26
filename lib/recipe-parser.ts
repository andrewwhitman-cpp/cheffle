/**
 * Recipe parser: JSON-LD extraction and HTML cleaning for AI fallback.
 */

import { parseIngredientString } from './ingredient-parser';

/**
 * Decode common HTML entities in extracted text.
 */
function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#034;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&');
}

export interface ParsedRecipe {
  name: string;
  description: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings?: string;
}

interface SchemaRecipe {
  '@type'?: string;
  name?: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<{ '@type'?: string; text?: string } | string>;
  prepTime?: string;
  cookTime?: string;
  cookTimeTotal?: string;
  totalTime?: string;
  recipeYield?: string | number;
}

/**
 * Parse ISO 8601 duration (e.g. PT15M, PT1H30M) to minutes.
 */
function parseIsoDuration(iso?: string): number {
  if (!iso || typeof iso !== 'string') return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

/**
 * Extract Recipe from JSON-LD script tags in HTML.
 */
export function extractRecipeFromJsonLd(html: string): ParsedRecipe | null {
  const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!match) return null;

  for (const script of match) {
    const contentMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!contentMatch) continue;

    try {
      const json = JSON.parse(contentMatch[1].trim());
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        const recipe = findRecipeInGraph(item);
        if (recipe) return normalizeSchemaRecipe(recipe);
      }
    } catch {
      continue;
    }
  }

  return null;
}

function findRecipeInGraph(obj: unknown): SchemaRecipe | null {
  if (!obj || typeof obj !== 'object') return null;

  const schema = obj as SchemaRecipe & { '@graph'?: unknown[] };
  if (schema['@type'] === 'Recipe') return schema as SchemaRecipe;
  if (Array.isArray(schema['@graph'])) {
    for (const node of schema['@graph']) {
      const found = findRecipeInGraph(node);
      if (found) return found;
    }
  }

  return null;
}

function normalizeSchemaRecipe(recipe: SchemaRecipe): ParsedRecipe {
  const ingredients: Array<{ name: string; quantity: string; unit: string }> = [];
  const rawIngredients = recipe.recipeIngredient || [];
  for (const ing of rawIngredients) {
    if (typeof ing === 'string') {
      ingredients.push(parseIngredientString(ing));
    }
  }

  let instructions = '';
  const rawInstructions = recipe.recipeInstructions || [];
  if (Array.isArray(rawInstructions)) {
    const steps = rawInstructions.map((step) => {
      if (typeof step === 'string') return step;
      if (step && typeof step === 'object' && 'text' in step) return (step as { text?: string }).text || '';
      return '';
    }).filter(Boolean);
    instructions = steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
  }

  const prepTime = parseIsoDuration(recipe.prepTime);
  const cookTime = parseIsoDuration(recipe.cookTime || recipe.cookTimeTotal || recipe.totalTime);

  return {
    name: decodeHtmlEntities(recipe.name || 'Untitled Recipe'),
    description: decodeHtmlEntities(recipe.description || ''),
    ingredients: ingredients.length ? ingredients.map((ing) => ({
      ...ing,
      name: decodeHtmlEntities(ing.name),
    })) : [{ name: decodeHtmlEntities(recipe.recipeIngredient?.join(', ') || ''), quantity: '', unit: '' }],
    instructions: decodeHtmlEntities(instructions || 'No instructions found.'),
    prep_time: prepTime,
    cook_time: cookTime,
    servings: recipe.recipeYield ? String(recipe.recipeYield) : undefined,
  };
}

/**
 * Clean HTML for AI extraction: strip scripts, styles, limit length.
 */
export function cleanHtmlForAi(html: string, maxLength = 50000): string {
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + '...[truncated]';
  }

  return cleaned;
}
