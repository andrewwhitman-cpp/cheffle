import OpenAI from 'openai';
import { EQUIPMENT_OPTIONS, APPLIANCE_OPTIONS } from './kitchen-context';

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: key });
}

const VALID_DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'nut-free', 'egg-free', 'soy-free', 'shellfish-free',
  'keto', 'paleo', 'low-carb', 'sugar-free',
];

const VALID_EQUIPMENT: Set<string> = new Set([
  ...EQUIPMENT_OPTIONS.map((o) => o.value),
  ...APPLIANCE_OPTIONS.map((o) => o.value),
]);

export interface RecipeMetadata {
  dietary_tags: string[];
  equipment_required: string[];
}

export async function extractRecipeMetadata(
  name: string,
  ingredients: Array<{ name: string; quantity: string; unit: string }>
): Promise<RecipeMetadata> {
  try {
    const openai = getOpenAIClient();
    const ingredientList = ingredients.map((i) =>
      `${i.quantity} ${i.unit} ${i.name}`.trim()
    ).join(', ');

    const equipmentValues = Array.from(VALID_EQUIPMENT).join(', ');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this recipe and return JSON only. Two fields:
1. "dietary_tags": array of applicable tags from: ${VALID_DIETARY_TAGS.join(', ')}. Only include tags that truly apply. Empty array if none.
2. "equipment_required": array of kitchen equipment needed from: ${equipmentValues}. Only list equipment beyond basic (knife, cutting board, bowl, pot, pan, spatula). Empty array if only basic tools needed.

Return ONLY valid JSON, no other text.`,
        },
        {
          role: 'user',
          content: `Recipe: ${name}\nIngredients: ${ingredientList}`,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return { dietary_tags: [], equipment_required: [] };

    let jsonStr = content;
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();

    const parsed = JSON.parse(jsonStr) as {
      dietary_tags?: string[];
      equipment_required?: string[];
    };

    const dietaryTags = (parsed.dietary_tags || []).filter((t) =>
      VALID_DIETARY_TAGS.includes(t)
    );
    const equipmentRequired = (parsed.equipment_required || []).filter((e) =>
      VALID_EQUIPMENT.has(e)
    );

    return { dietary_tags: dietaryTags, equipment_required: equipmentRequired };
  } catch (err) {
    console.error('Failed to extract recipe metadata:', err);
    return { dietary_tags: [], equipment_required: [] };
  }
}
