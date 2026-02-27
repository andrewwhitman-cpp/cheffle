import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

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
    const latest = searchParams.get('latest');

    const lists = (await db.all(
      'SELECT id, user_id, name, created_at FROM shopping_lists WHERE user_id = ? ORDER BY created_at DESC',
      user.id
    )) as { id: number; user_id: number; name: string; created_at: string }[];

    if (latest === 'true' && lists.length > 0) {
      const list = lists[0];
      const items = (await db.all(
        'SELECT id, shopping_list_id, name, quantity, unit, from_recipe_id, purchased, created_at FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY name ASC',
        list.id
      )) as {
        id: number;
        shopping_list_id: number;
        name: string;
        quantity: number;
        unit: string;
        from_recipe_id: number | null;
        purchased: number;
        created_at: string;
      }[];
      return NextResponse.json({
        ...list,
        items: items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
        })),
      });
    }

    return NextResponse.json(lists);
  } catch (error: unknown) {
    console.error('Get shopping lists error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch shopping lists' },
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
    const { name, items } = body as {
      name?: string;
      items: Array<{ name: string; quantity: number; unit: string; from_recipe_id?: number }>;
    };

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { message: 'items array is required' },
        { status: 400 }
      );
    }

    const listName = name || `Shopping list ${new Date().toLocaleDateString()}`;

    const result = await db.run(
      'INSERT INTO shopping_lists (user_id, name) VALUES (?, ?)',
      user.id,
      listName
    );

    const listId = result.lastInsertRowid;

    for (const item of items) {
      const itemName = String(item.name || '').trim();
      if (!itemName) continue;

      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
      const unit = String(item.unit || '').trim();
      const fromRecipeId = item.from_recipe_id != null ? item.from_recipe_id : null;

      await db.run(
        'INSERT INTO shopping_list_items (shopping_list_id, name, quantity, unit, from_recipe_id, purchased) VALUES (?, ?, ?, ?, ?, 0)',
        listId,
        itemName,
        qty,
        unit,
        fromRecipeId
      );
    }

    const list = (await db.get(
      'SELECT id, user_id, name, created_at FROM shopping_lists WHERE id = ?',
      listId
    )) as { id: number; user_id: number; name: string; created_at: string };

    const savedItems = (await db.all(
      'SELECT id, shopping_list_id, name, quantity, unit, from_recipe_id, purchased, created_at FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY name ASC',
      listId
    )) as {
      id: number;
      shopping_list_id: number;
      name: string;
      quantity: number;
      unit: string;
      from_recipe_id: number | null;
      purchased: number;
      created_at: string;
    }[];

    return NextResponse.json({
      ...list,
      items: savedItems.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
      })),
    });
  } catch (error: unknown) {
    console.error('Create shopping list error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create shopping list' },
      { status: 500 }
    );
  }
}
