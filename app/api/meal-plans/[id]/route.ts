import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

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

    const mealPlanId = parseInt(params.id);
    const body = await request.json();
    const { date, recipe_id, meal_type } = body;

    if (!date || !recipe_id || !meal_type) {
      return NextResponse.json(
        { message: 'Date, recipe_id, and meal_type are required' },
        { status: 400 }
      );
    }

    // Check if meal plan exists and belongs to user
    const existing = db
      .prepare('SELECT id FROM meal_plans WHERE id = ? AND user_id = ?')
      .get(mealPlanId, user.id);

    if (!existing) {
      return NextResponse.json(
        { message: 'Meal plan not found' },
        { status: 404 }
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

    // Update meal plan
    db.prepare(`
      UPDATE meal_plans 
      SET date = ?, recipe_id = ?, meal_type = ?
      WHERE id = ? AND user_id = ?
    `).run(date, recipe_id, meal_type, mealPlanId, user.id);

    // Fetch updated meal plan
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
    console.error('Update meal plan error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update meal plan' },
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

    const mealPlanId = parseInt(params.id);

    // Check if meal plan exists and belongs to user
    const existing = db
      .prepare('SELECT id FROM meal_plans WHERE id = ? AND user_id = ?')
      .get(mealPlanId, user.id);

    if (!existing) {
      return NextResponse.json(
        { message: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Delete meal plan
    db.prepare('DELETE FROM meal_plans WHERE id = ? AND user_id = ?').run(mealPlanId, user.id);

    return NextResponse.json({ message: 'Meal plan deleted successfully' });
  } catch (error: any) {
    console.error('Delete meal plan error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete meal plan' },
      { status: 500 }
    );
  }
}
