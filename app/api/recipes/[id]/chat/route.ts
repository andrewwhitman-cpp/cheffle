import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { normalizeIngredient } from '@/lib/ingredient-parser';
import { normalizeInstructions } from '@/lib/recipe-display';
import OpenAI from 'openai';

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RecipeForChat {
  name: string;
  description: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string;
  prep_time: number;
  cook_time: number;
  skill_level_adjusted?: string | null;
}

const BASE_SYSTEM_PROMPT = `You are Cheffle, a warm and friendly recipe assistant. You love helping people cook! The user is viewing a recipe and can ask you to modify it.

When the user asks for changes (e.g. "add rice", "remove garlic", "double the recipe", "make it vegetarian"):
1. Respond in a warm, conversational way—like a helpful friend in the kitchen. Use "I" and "you." Briefly explain what you changed and why it works.
2. Include the FULL modified recipe as JSON in your response. Use this exact format:

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

Rules for modifications:
- ingredients: array of objects with name, quantity, unit. Use "2 cups rice" not "rice" as name.
- instructions: numbered steps with double newlines between them. Add appropriate cooking steps (e.g. for rice: "Start the rice cooker first - rice typically takes 45-60 minutes. Add rice and water according to package directions.").
- prep_time and cook_time: integers in minutes.

If the user is just asking a question (not requesting changes), respond in a friendly, helpful way but do NOT include a recipe block. Keep your tone warm and encouraging.`;

const SKILL_LEVEL_INSTRUCTIONS: Record<string, string> = {
  new_to_cooking: `IMPORTANT - The user is a NEW COOK. When you modify the recipe, also apply these adjustments: add explicit prep steps (cutting, chopping), reorder steps for timing, explain cooking terms in parentheses, add brief safety notes, include timing cues, and suggest simpler alternatives where helpful.`,
  comfortable_with_cooking: `IMPORTANT - The user is a COMFORTABLE COOK. When you modify the recipe, also: add prep steps for ingredients, ensure logical step order, briefly explain less common terms, add timing hints for longer steps.`,
  experienced_cook: `IMPORTANT - The user is an EXPERIENCED COOK. Keep modifications concise. Only ensure instructions are clear and well-ordered.`,
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const recipeId = parseInt(params.id, 10);
    const recipe = db
      .prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipeId, user.id) as any;

    if (!recipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { message, history = [] } = body as { message: string; history?: ChatMessage[] };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Message is required' },
        { status: 400 }
      );
    }

    const ingredients = JSON.parse(recipe.ingredients || '[]') as Array<{ name: string; quantity: string; unit: string }>;
    const recipeContext: RecipeForChat = {
      name: recipe.name,
      description: recipe.description || '',
      ingredients,
      instructions: recipe.instructions || '',
      prep_time: recipe.prep_time || 0,
      cook_time: recipe.cook_time || 0,
    };

    const ingredientsStr = ingredients
      .map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim())
      .join('\n');

    const recipeBlock = `Current recipe:
Name: ${recipeContext.name}
Description: ${recipeContext.description}
Ingredients:
${ingredientsStr}

Instructions:
${recipeContext.instructions}

Prep: ${recipeContext.prep_time} min, Cook: ${recipeContext.cook_time} min`;

    const profile = db.prepare('SELECT skill_level FROM users WHERE id = ?').get(user.id) as { skill_level: string | null } | undefined;
    const skillLevel = profile?.skill_level;
    const skillInstruction = skillLevel && SKILL_LEVEL_INSTRUCTIONS[skillLevel]
      ? `\n\n${SKILL_LEVEL_INSTRUCTIONS[skillLevel]}`
      : '';
    const systemPrompt = BASE_SYSTEM_PROMPT + skillInstruction;

    const openai = getOpenAIClient();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${recipeBlock}\n\n---\nThe user will now send messages. Remember to include the full modified recipe as JSON when you make changes.` },
    ];

    if (history.length > 0) {
      const historyMessages = history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      messages.push(...historyMessages);
    }

    messages.push({ role: 'user', content: message });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    if (!content) {
      return NextResponse.json(
        { message: 'No response from AI' },
        { status: 500 }
      );
    }

    let modifiedRecipe: RecipeForChat | null = null;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim()) as {
          name?: string;
          description?: string;
          ingredients?: Array<{ name: string; quantity: string; unit: string }> | string[];
          instructions?: string;
          prep_time?: number;
          cook_time?: number;
        };

        const ings = parsed.ingredients || [];
        const normalizedIngredients = ings.map((ing) => normalizeIngredient(ing));

        const rawInstructions = parsed.instructions || recipeContext.instructions;
        modifiedRecipe = {
          name: parsed.name || recipeContext.name,
          description: parsed.description || recipeContext.description,
          ingredients: normalizedIngredients,
          instructions: normalizeInstructions(rawInstructions) || rawInstructions,
          prep_time: parsed.prep_time ?? recipeContext.prep_time,
          cook_time: parsed.cook_time ?? recipeContext.cook_time,
          skill_level_adjusted: skillLevel || recipe.skill_level_adjusted || null,
        };
      } catch {
        // Ignore parse errors
      }
    }

    const messageWithoutJson = jsonMatch
      ? content.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
      : content;

    return NextResponse.json({
      message: messageWithoutJson,
      modifiedRecipe,
    });
  } catch (error: any) {
    console.error('Recipe chat error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
