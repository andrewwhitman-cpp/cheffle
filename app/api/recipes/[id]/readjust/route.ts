import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { extractRecipeFromJsonLd, cleanHtmlForAi } from '@/lib/recipe-parser';
import { extractRecipeWithAi } from '@/lib/openai';
import { normalizeInstructions } from '@/lib/recipe-display';
import { adjustRecipeForSkillLevel } from '@/lib/recipe-adjustment';
import type { SkillLevel } from '@/lib/skill-levels';

const VALID_LEVELS: SkillLevel[] = ['new_to_cooking', 'comfortable_with_cooking', 'experienced_cook'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const recipeId = parseInt(params.id, 10);
    const recipe = db
      .prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipeId, user.id) as any;

    if (!recipe) {
      return NextResponse.json({ message: 'Recipe not found' }, { status: 404 });
    }

    const body = await request.json();
    const { skill_level } = body;

    if (skill_level === null || skill_level === undefined || skill_level === '') {
      // Revert to original: re-fetch from source_url
      if (!recipe.source_url) {
        return NextResponse.json(
          { message: 'Cannot revert - recipe was not imported from a URL' },
          { status: 400 }
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const fetchResponse = await fetch(recipe.source_url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Cheffle/1.0; +https://github.com/cheffle)',
        },
      });

      clearTimeout(timeout);

      if (!fetchResponse.ok) {
        return NextResponse.json(
          { message: `Failed to fetch original recipe: ${fetchResponse.status}` },
          { status: 400 }
        );
      }

      const html = await fetchResponse.text();
      let parsed: {
        name: string;
        description: string;
        ingredients: Array<{ name: string; quantity: string; unit: string }>;
        instructions: string;
        prep_time: number;
        cook_time: number;
      };

      const jsonLdRecipe = extractRecipeFromJsonLd(html);
      if (jsonLdRecipe && jsonLdRecipe.name && jsonLdRecipe.instructions) {
        parsed = {
          ...jsonLdRecipe,
          instructions: normalizeInstructions(jsonLdRecipe.instructions) || jsonLdRecipe.instructions,
        };
      } else {
        const aiRecipe = await extractRecipeWithAi(cleanHtmlForAi(html));
        parsed = {
          ...aiRecipe,
          instructions: normalizeInstructions(aiRecipe.instructions) || aiRecipe.instructions,
        };
      }

      const ingredients = JSON.stringify(parsed.ingredients || []);

      db.prepare(`
        UPDATE recipes
        SET name = ?, description = ?, ingredients = ?, instructions = ?,
            prep_time = ?, cook_time = ?, skill_level_adjusted = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        parsed.name,
        parsed.description || '',
        ingredients,
        parsed.instructions,
        parsed.prep_time || 0,
        parsed.cook_time || 0,
        recipeId,
        user.id
      );
    } else if (VALID_LEVELS.includes(skill_level)) {
      // Adjust to new skill level
      const ingredients = JSON.parse(recipe.ingredients || '[]') as Array<{ name: string; quantity: string; unit: string }>;
      const currentRecipe = {
        name: recipe.name,
        description: recipe.description || '',
        ingredients,
        instructions: recipe.instructions || '',
        prep_time: recipe.prep_time || 0,
        cook_time: recipe.cook_time || 0,
      };

      let kitchenContext = null;
      const profile = db.prepare('SELECT kitchen_context FROM users WHERE id = ?').get(user.id) as {
        kitchen_context: string | null;
      } | undefined;
      if (profile?.kitchen_context) {
        try {
          kitchenContext = JSON.parse(profile.kitchen_context);
        } catch {
          kitchenContext = null;
        }
      }

      const adjusted = await adjustRecipeForSkillLevel(currentRecipe, skill_level as SkillLevel, kitchenContext);

      db.prepare(`
        UPDATE recipes
        SET name = ?, description = ?, ingredients = ?, instructions = ?,
            prep_time = ?, cook_time = ?, skill_level_adjusted = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        adjusted.name,
        adjusted.description,
        JSON.stringify(adjusted.ingredients),
        adjusted.instructions,
        adjusted.prep_time,
        adjusted.cook_time,
        skill_level,
        recipeId,
        user.id
      );
    } else {
      return NextResponse.json({ message: 'Invalid skill level' }, { status: 400 });
    }

    const updated = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId) as any;
    return NextResponse.json({
      ...updated,
      ingredients: JSON.parse(updated.ingredients || '[]'),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ message: 'Request timed out' }, { status: 408 });
    }
    console.error('Readjust recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to adjust recipe' },
      { status: 500 }
    );
  }
}
