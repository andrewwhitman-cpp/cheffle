import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tagFilter = searchParams.get('tags');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    let query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.ingredients,
        r.instructions,
        r.prep_time,
        r.cook_time,
        r.created_at,
        r.updated_at
      FROM recipes r
      WHERE r.user_id = ?
    `;
    const params: any[] = [user.id];

    if (tagFilter) {
      const tagIds = tagFilter.split(',').map(Number);
      query += ` AND r.id IN (
        SELECT DISTINCT recipe_id 
        FROM recipe_tags 
        WHERE tag_id IN (${tagIds.map(() => '?').join(',')})
      )`;
      params.push(...tagIds);
    }

    if (search) {
      query += ` AND (r.name LIKE ? OR r.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY r.created_at DESC';

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
    }

    const recipes = db.prepare(query).all(...params) as any[];

    // Get tags for each recipe
    const recipesWithTags = recipes.map((recipe) => {
      const tags = db
        .prepare(`
          SELECT t.id, t.name, t.color
          FROM tags t
          INNER JOIN recipe_tags rt ON t.id = rt.tag_id
          WHERE rt.recipe_id = ?
        `)
        .all(recipe.id) as Array<{ id: number; name: string; color?: string }>;

      return {
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients || '[]'),
        tags,
      };
    });

    return NextResponse.json(recipesWithTags);
  } catch (error: any) {
    console.error('Get recipes error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
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

    // Insert recipe
    const result = db
      .prepare(`
        INSERT INTO recipes (user_id, name, description, ingredients, instructions, prep_time, cook_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        user.id,
        name,
        description || '',
        JSON.stringify(ingredients || []),
        instructions,
        prep_time || 0,
        cook_time || 0
      );

    const recipeId = result.lastInsertRowid as number;

    // Add tags if provided
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

    // Fetch the created recipe with tags
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
    console.error('Create recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
