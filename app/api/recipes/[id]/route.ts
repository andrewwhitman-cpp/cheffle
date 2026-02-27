import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { parseServingsToNumber } from '@/lib/servings-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const recipeId = parseInt(params.id, 10);
    const recipe = (await db.get('SELECT * FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id)) as any;

    if (!recipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
    });
  } catch (error: any) {
    console.error('Get recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const recipeId = parseInt(params.id, 10);
    const existingRecipe = await db.get('SELECT id FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id);

    if (!existingRecipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, ingredients, instructions, prep_time, cook_time, source_url, skill_level_adjusted, servings } = body;

    if (!name || !instructions) {
      return NextResponse.json(
        { message: 'Name and instructions are required' },
        { status: 400 }
      );
    }

    const validSkillLevels = ['new_to_cooking', 'comfortable_with_cooking', 'experienced_cook'];
    const skillLevelAdjusted =
      skill_level_adjusted != null && validSkillLevels.includes(String(skill_level_adjusted))
        ? String(skill_level_adjusted)
        : undefined;

    const servingsNum = parseServingsToNumber(servings);

    await db.run(
      `UPDATE recipes 
      SET name = ?, description = ?, ingredients = ?, instructions = ?, 
          prep_time = ?, cook_time = ?, servings = ?, source_url = ?, 
          skill_level_adjusted = COALESCE(?, skill_level_adjusted),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      name,
      description || '',
      JSON.stringify(ingredients || []),
      instructions,
      prep_time || 0,
      cook_time || 0,
      servingsNum ?? null,
      source_url ?? null,
      skillLevelAdjusted ?? null,
      recipeId,
      user.id
    );

    const recipe = (await db.get('SELECT * FROM recipes WHERE id = ?', recipeId)) as any;

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
    });
  } catch (error: any) {
    console.error('Update recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const recipeId = parseInt(params.id, 10);
    const existingRecipe = await db.get('SELECT id FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id);

    if (!existingRecipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    await db.run('DELETE FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id);

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error: any) {
    console.error('Delete recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
