import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(
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
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const recipeId = parseInt(params.id, 10);
    const existingRecipe = db
      .prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipeId, user.id);

    if (!existingRecipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, ingredients, instructions, prep_time, cook_time, source_url } = body;

    if (!name || !instructions) {
      return NextResponse.json(
        { message: 'Name and instructions are required' },
        { status: 400 }
      );
    }

    db.prepare(`
      UPDATE recipes 
      SET name = ?, description = ?, ingredients = ?, instructions = ?, 
          prep_time = ?, cook_time = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      description || '',
      JSON.stringify(ingredients || []),
      instructions,
      prep_time || 0,
      cook_time || 0,
      source_url ?? null,
      recipeId,
      user.id
    );

    const recipe = db
      .prepare('SELECT * FROM recipes WHERE id = ?')
      .get(recipeId) as any;

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
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const recipeId = parseInt(params.id, 10);
    const existingRecipe = db
      .prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipeId, user.id);

    if (!existingRecipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').run(recipeId, user.id);

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error: any) {
    console.error('Delete recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
