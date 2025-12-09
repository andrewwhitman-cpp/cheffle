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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get all meal plans in the date range
    const mealPlans = db
      .prepare(`
        SELECT mp.recipe_id
        FROM meal_plans mp
        WHERE mp.user_id = ? AND mp.date >= ? AND mp.date <= ?
      `)
      .all(user.id, startDate, endDate) as Array<{ recipe_id: number }>;

    const recipeIds = mealPlans.map((mp) => mp.recipe_id);
    if (recipeIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get all ingredients from these recipes
    const placeholders = recipeIds.map(() => '?').join(',');
    const recipes = db
      .prepare(`SELECT ingredients FROM recipes WHERE id IN (${placeholders})`)
      .all(...recipeIds) as Array<{ ingredients: string }>;

    // Aggregate ingredients
    const ingredientMap = new Map<string, { quantity: number; unit: string }>();

    recipes.forEach((recipe) => {
      const ingredients = JSON.parse(recipe.ingredients || '[]') as Array<{
        name: string;
        quantity: string;
        unit: string;
      }>;

      ingredients.forEach((ing) => {
        const key = `${ing.name.toLowerCase()}_${ing.unit.toLowerCase()}`;
        const quantity = parseFloat(ing.quantity) || 0;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.quantity += quantity;
        } else {
          ingredientMap.set(key, {
            quantity,
            unit: ing.unit,
          });
        }
      });
    });

    // Convert to array format
    const ingredientList = Array.from(ingredientMap.entries()).map(([key, value]) => {
      const [name] = key.split('_');
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: value.quantity,
        unit: value.unit,
      };
    });

    return NextResponse.json(ingredientList);
  } catch (error: any) {
    console.error('Get ingredient list error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to generate ingredient list' },
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
    const { ingredients, startDate, endDate } = body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json(
        { message: 'Ingredients array is required' },
        { status: 400 }
      );
    }

    // Save ingredient list
    const result = db
      .prepare(`
        INSERT INTO ingredient_lists (user_id, ingredients, start_date, end_date)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        user.id,
        JSON.stringify(ingredients),
        startDate || null,
        endDate || null
      );

    return NextResponse.json({
      id: result.lastInsertRowid,
      message: 'Ingredient list saved successfully',
    });
  } catch (error: any) {
    console.error('Save ingredient list error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to save ingredient list' },
      { status: 500 }
    );
  }
}
