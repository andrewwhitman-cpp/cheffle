/**
 * Adjust recipes for user skill level. Uses AI to tailor instructions.
 */

import OpenAI from 'openai';
import type { ParsedRecipe } from './recipe-parser';
import { normalizeInstructions } from './recipe-display';
import { normalizeIngredient } from './ingredient-parser';
import type { SkillLevel } from './skill-levels';

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: key });
}

const SKILL_LEVEL_PROMPTS: Record<SkillLevel, string> = {
  new_to_cooking: `You are adjusting a recipe for someone NEW TO COOKING. They rarely cook and need extra guidance.

Apply ALL of these adjustments to the recipe:
1. **Prep steps**: Add explicit steps for cutting, chopping, and prepping ingredients BEFORE cooking. (e.g. "Dice the onion", "Mince the garlic", "Cut the chicken into cubes")
2. **Reorder instructions**: Put steps in the best order so everything finishes at the same time. Group prep work first, then cooking.
3. **Explain terms**: Briefly explain cooking terms in parentheses (e.g. "sauté (cook in a pan over medium heat with a little oil)", "dice (cut into small cubes)")
4. **Safety notes**: Add brief safety reminders where relevant (e.g. "Use oven mitts when handling hot pans", "Be careful with sharp knives")
5. **Equipment**: Add a note about suggested equipment at the start if helpful (e.g. "You'll need: a large skillet, cutting board, sharp knife")
6. **Timing help**: Include timing cues (e.g. "This step takes about 5 minutes", "Start the rice first—it takes 20 minutes")
7. **Alternatives**: Where practical, suggest simpler alternatives (e.g. "Or use pre-diced onions from the store")`,

  cook_occasionally: `You are adjusting a recipe for someone who COOKS OCCASIONALLY. They know basics but appreciate guidance.

Apply these adjustments:
1. **Prep steps**: Add prep steps for ingredients that need cutting/prepping before use. Keep them concise.
2. **Reorder instructions**: Ensure steps flow logically and things finish around the same time. Group prep before cooking.
3. **Explain terms**: Briefly explain less common terms only (e.g. "blanch", "temper")
4. **Timing hints**: Add timing cues for longer steps so they can plan`,

  cook_regularly: `You are adjusting a recipe for someone who COOKS REGULARLY. They're comfortable in the kitchen.

Apply light adjustments:
1. **Reorder if needed**: Ensure steps are in a logical order so components finish together. Only reorder if the original is confusing.
2. **Timing hints**: Add brief timing cues for steps that take a while`,

  very_experienced: `You are adjusting a recipe for someone VERY EXPERIENCED. They cook frequently and know techniques.

Apply minimal adjustments:
- Only ensure instructions are clear and well-ordered. Do not add extra explanations, prep steps, or safety notes.
- Keep the recipe concise.`,
};

export interface AdjustableRecipe {
  name: string;
  description: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string;
  prep_time: number;
  cook_time: number;
}

export async function adjustRecipeForSkillLevel(
  recipe: AdjustableRecipe,
  skillLevel: SkillLevel
): Promise<AdjustableRecipe> {
  const openai = getOpenAIClient();
  const levelPrompt = SKILL_LEVEL_PROMPTS[skillLevel];

  const recipeJson = JSON.stringify({
    name: recipe.name,
    description: recipe.description,
    ingredients: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    instructions: recipe.instructions,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${levelPrompt}

Return the adjusted recipe as JSON only. Use this exact format:
\`\`\`json
{
  "name": "Recipe name",
  "description": "Description",
  "ingredients": [{"name": "ingredient name", "quantity": "amount", "unit": "unit"}],
  "instructions": "Numbered steps. 1. First step.\\n\\n2. Second step.",
  "prep_time": 0,
  "cook_time": 0
}
\`\`\`

Rules:
- Keep the same ingredients and quantities unless the adjustment requires changes
- instructions: numbered steps with double newlines between them
- prep_time and cook_time: integers in minutes`,
      },
      {
        role: 'user',
        content: `Adjust this recipe:\n\n${recipeJson}`,
      },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('No response from OpenAI');

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content;
  const parsed = JSON.parse(jsonStr) as {
    name?: string;
    description?: string;
    ingredients?: Array<{ name?: string; quantity?: string; unit?: string }>;
    instructions?: string;
    prep_time?: number;
    cook_time?: number;
  };

  const ingredients = (parsed.ingredients || []).map((ing) => normalizeIngredient(ing));
  const instructions = normalizeInstructions(parsed.instructions || recipe.instructions) || parsed.instructions || recipe.instructions;

  return {
    name: parsed.name || recipe.name,
    description: parsed.description || recipe.description,
    ingredients: ingredients.length ? ingredients : recipe.ingredients,
    instructions,
    prep_time: Math.max(0, parseInt(String(parsed.prep_time), 10) || recipe.prep_time),
    cook_time: Math.max(0, parseInt(String(parsed.cook_time), 10) || recipe.cook_time),
  };
}
