import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let query = `
      SELECT id, user_id, plan_date, meal_type, recipe_id, created_at, updated_at
      FROM meal_plans
      WHERE user_id = ?
    `;
    const params: (string | number)[] = [user.id];

    if (start) {
      query += ` AND plan_date >= ?`;
      params.push(start);
    }
    if (end) {
      query += ` AND plan_date <= ?`;
      params.push(end);
    }

    query += ' ORDER BY plan_date ASC, CASE meal_type WHEN \'breakfast\' THEN 1 WHEN \'lunch\' THEN 2 WHEN \'dinner\' THEN 3 END';

    const entries = (await db.all(query, ...params)) as {
      id: number;
      user_id: number;
      plan_date: string;
      meal_type: string;
      recipe_id: number | null;
      created_at: string;
      updated_at: string;
    }[];

    return NextResponse.json(entries);
  } catch (error: unknown) {
    console.error('Get meal plans error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch meal plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan_date, meal_type, recipe_id } = body;

    if (!plan_date || !meal_type) {
      return NextResponse.json(
        { message: 'plan_date and meal_type are required' },
        { status: 400 }
      );
    }

    if (!MEAL_TYPES.includes(meal_type)) {
      return NextResponse.json(
        { message: 'meal_type must be breakfast, lunch, or dinner' },
        { status: 400 }
      );
    }

    const recipeId = recipe_id != null ? parseInt(String(recipe_id), 10) : null;
    if (recipeId != null) {
      const recipe = await db.get('SELECT id FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id);
      if (!recipe) {
        return NextResponse.json(
          { message: 'Recipe not found' },
          { status: 404 }
        );
      }
    }

    const existing = (await db.get(
      'SELECT id FROM meal_plans WHERE user_id = ? AND plan_date = ? AND meal_type = ?',
      user.id,
      plan_date,
      meal_type
    )) as { id: number } | undefined;

    if (existing) {
      await db.run(
        'UPDATE meal_plans SET recipe_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        recipeId,
        existing.id,
        user.id
      );
      const row = (await db.get('SELECT id, user_id, plan_date, meal_type, recipe_id, created_at, updated_at FROM meal_plans WHERE id = ?', existing.id)) as {
        id: number;
        user_id: number;
        plan_date: string;
        meal_type: string;
        recipe_id: number | null;
        created_at: string;
        updated_at: string;
      };
      return NextResponse.json(row);
    }

    const result = await db.run(
      'INSERT INTO meal_plans (user_id, plan_date, meal_type, recipe_id) VALUES (?, ?, ?, ?)',
      user.id,
      plan_date,
      meal_type,
      recipeId
    );

    const row = (await db.get('SELECT id, user_id, plan_date, meal_type, recipe_id, created_at, updated_at FROM meal_plans WHERE id = ?', result.lastInsertRowid)) as {
      id: number;
      user_id: number;
      plan_date: string;
      meal_type: string;
      recipe_id: number | null;
      created_at: string;
      updated_at: string;
    };
    return NextResponse.json(row);
  } catch (error: unknown) {
    console.error('Create/update meal plan error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save meal plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const plan_date = searchParams.get('plan_date');
    const meal_type = searchParams.get('meal_type');

    if (id) {
      const result = await db.run('DELETE FROM meal_plans WHERE id = ? AND user_id = ?', parseInt(id, 10), user.id);
      if (result.changes === 0) {
        return NextResponse.json(
          { message: 'Meal plan entry not found' },
          { status: 404 }
        );
      }
    } else if (plan_date && meal_type) {
      const result = await db.run(
        'DELETE FROM meal_plans WHERE user_id = ? AND plan_date = ? AND meal_type = ?',
        user.id,
        plan_date,
        meal_type
      );
      if (result.changes === 0) {
        return NextResponse.json(
          { message: 'Meal plan entry not found' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { message: 'id or (plan_date and meal_type) required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete meal plan error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete meal plan' },
      { status: 500 }
    );
  }
}
