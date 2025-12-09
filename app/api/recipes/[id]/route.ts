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

    const recipeId = parseInt(params.id);
    const recipe = db
      .prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipeId, user.id) as any;

    if (!recipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Get tags
    const tags = db
      .prepare(`
        SELECT t.id, t.name, t.color
        FROM tags t
        INNER JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE rt.recipe_id = ?
      `)
      .all(recipeId) as Array<{ id: number; name: string; color?: string }>;

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
      tags,
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

    const recipeId = parseInt(params.id);

    // Check if recipe exists and belongs to user
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
    const { name, description, ingredients, instructions, prep_time, cook_time, tagIds } = body;

    if (!name || !instructions) {
      return NextResponse.json(
        { message: 'Name and instructions are required' },
        { status: 400 }
      );
    }

    // Update recipe
    db.prepare(`
      UPDATE recipes 
      SET name = ?, description = ?, ingredients = ?, instructions = ?, 
          prep_time = ?, cook_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      description || '',
      JSON.stringify(ingredients || []),
      instructions,
      prep_time || 0,
      cook_time || 0,
      recipeId,
      user.id
    );

    // Update tags
    db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(recipeId);

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const insertTag = db.prepare(
        'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)'
      );
      const insertTags = db.transaction((tags: number[]) => {
        for (const tagId of tags) {
          try {
            insertTag.run(recipeId, tagId);
          } catch (error) {
            // Ignore duplicate tag errors
          }
        }
      });
      insertTags(tagIds);
    }

    // Fetch updated recipe with tags
    const recipe = db
      .prepare('SELECT * FROM recipes WHERE id = ?')
      .get(recipeId) as any;

    const tags = db
      .prepare(`
        SELECT t.id, t.name, t.color
        FROM tags t
        INNER JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE rt.recipe_id = ?
      `)
      .all(recipeId) as Array<{ id: number; name: string; color?: string }>;

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
      tags,
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

    const recipeId = parseInt(params.id);

    // Check if recipe exists and belongs to user
    const existingRecipe = db
      .prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipeId, user.id);

    if (!existingRecipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Delete recipe (tags will be deleted automatically due to CASCADE)
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
