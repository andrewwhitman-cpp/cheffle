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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = `
      SELECT 
        mp.id,
        mp.date,
        mp.meal_type,
        mp.recipe_id,
        r.id as recipe_id,
        r.name as recipe_name
      FROM meal_plans mp
      INNER JOIN recipes r ON mp.recipe_id = r.id
      WHERE mp.user_id = ?
    `;
    const params: any[] = [user.id];

    if (startDate) {
      query += ' AND mp.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND mp.date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY mp.date ASC, mp.meal_type ASC';

    const mealPlans = db.prepare(query).all(...params) as any[];

    const formattedMealPlans = mealPlans.map((mp) => ({
      id: mp.id,
      date: mp.date,
      meal_type: mp.meal_type,
      recipe: {
        id: mp.recipe_id,
        name: mp.recipe_name,
      },
    }));

    return NextResponse.json(formattedMealPlans);
  } catch (error: any) {
    console.error('Get meal plans error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch meal plans' },
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
    const { date, recipe_id, meal_type } = body;

    if (!date || !recipe_id || !meal_type) {
      return NextResponse.json(
        { message: 'Date, recipe_id, and meal_type are required' },
        { status: 400 }
      );
    }

    // Verify recipe exists and belongs to user
    const recipe = db
      .prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?')
      .get(recipe_id, user.id);

    if (!recipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Insert meal plan
    const result = db
      .prepare(`
        INSERT INTO meal_plans (user_id, date, recipe_id, meal_type)
        VALUES (?, ?, ?, ?)
      `)
      .run(user.id, date, recipe_id, meal_type);

    const mealPlanId = result.lastInsertRowid as number;

    // Fetch the created meal plan with recipe details
    const mealPlan = db
      .prepare(`
        SELECT 
          mp.id,
          mp.date,
          mp.meal_type,
          mp.recipe_id,
          r.id as recipe_id,
          r.name as recipe_name
        FROM meal_plans mp
        INNER JOIN recipes r ON mp.recipe_id = r.id
        WHERE mp.id = ?
      `)
      .get(mealPlanId) as any;

    return NextResponse.json({
      id: mealPlan.id,
      date: mealPlan.date,
      meal_type: mealPlan.meal_type,
      recipe: {
        id: mealPlan.recipe_id,
        name: mealPlan.recipe_name,
      },
    });
  } catch (error: any) {
    console.error('Create meal plan error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create meal plan' },
      { status: 500 }
    );
  }
}
