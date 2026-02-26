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
        r.source_url,
        r.created_at,
        r.updated_at
      FROM recipes r
      WHERE r.user_id = ?
    `;
    const params: (string | number)[] = [user.id];

    if (search) {
      query += ` AND (r.name LIKE ? OR r.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY r.created_at DESC';

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit, 10));
    }

    const recipes = db.prepare(query).all(...params) as any[];

    const result = recipes.map((recipe) => ({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
    }));

    return NextResponse.json(result);
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
    const { name, description, ingredients, instructions, prep_time, cook_time, source_url } = body;

    if (!name || !instructions) {
      return NextResponse.json(
        { message: 'Name and instructions are required' },
        { status: 400 }
      );
    }

    const result = db
      .prepare(`
        INSERT INTO recipes (user_id, name, description, ingredients, instructions, prep_time, cook_time, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        user.id,
        name,
        description || '',
        JSON.stringify(ingredients || []),
        instructions,
        prep_time || 0,
        cook_time || 0,
        source_url || null
      );

    const recipeId = result.lastInsertRowid as number;
    const recipe = db
      .prepare('SELECT * FROM recipes WHERE id = ?')
      .get(recipeId) as any;

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
    });
  } catch (error: any) {
    console.error('Create recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
