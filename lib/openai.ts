import OpenAI from 'openai';
import type { ParsedRecipe } from './recipe-parser';
import { decodeHtmlEntities } from './recipe-display';
import { parseIngredientString } from './ingredient-parser';

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
}

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extractor. Extract the recipe from the following HTML content. Return ONLY valid JSON with this exact structure, no other text:
{
  "name": "Recipe name",
  "description": "Brief description or empty string",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": "Numbered step-by-step instructions as a single string",
  "prepTime": number in minutes or 0,
  "cookTime": number in minutes or 0,
  "servings": "optional serving string or empty"
}

Rules:
- Extract only the main recipe, not related content
- ingredients: array of strings, each a full ingredient line (e.g. "2 cups flour")
- instructions: CRITICAL - format as numbered steps with each step on its own line. Use exactly: "1. First step.\\n\\n2. Second step.\\n\\n3. Third step." (double newline between steps, no duplicate numbers like "1. 1.")
- Use plain apostrophes (') not HTML entities
- prepTime and cookTime: integers in minutes, use 0 if unknown
- If no recipe is found, return {"name": "Unknown", "description": "", "ingredients": [], "instructions": "No recipe found.", "prepTime": 0, "cookTime": 0, "servings": ""}`;

export async function extractRecipeWithAi(html: string): Promise<ParsedRecipe> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: RECIPE_EXTRACTION_PROMPT },
      { role: 'user', content: html },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    jsonStr = codeBlock[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as {
    name?: string;
    description?: string;
    ingredients?: string[];
    instructions?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: string;
  };

  const ingredients = (parsed.ingredients || []).map((ing) =>
    typeof ing === 'string' ? parseIngredientString(ing) : { name: String(ing), quantity: '', unit: '' }
  );

  return {
    name: decodeHtmlEntities(parsed.name || 'Untitled Recipe'),
    description: decodeHtmlEntities(parsed.description || ''),
    ingredients: ingredients.length ? ingredients.map((ing) => ({
      ...ing,
      name: decodeHtmlEntities(ing.name),
    })) : [{ name: '', quantity: '', unit: '' }],
    instructions: decodeHtmlEntities(parsed.instructions || 'No instructions found.'),
    prep_time: Math.max(0, parseInt(String(parsed.prepTime), 10) || 0),
    cook_time: Math.max(0, parseInt(String(parsed.cookTime), 10) || 0),
    servings: parsed.servings,
  };
}
