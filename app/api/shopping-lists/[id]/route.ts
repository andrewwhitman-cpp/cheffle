import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const listId = parseInt(id, 10);
    if (Number.isNaN(listId)) {
      return NextResponse.json(
        { message: 'Invalid list ID' },
        { status: 400 }
      );
    }

    const list = (await db.get(
      'SELECT id, user_id, name, created_at FROM shopping_lists WHERE id = ? AND user_id = ?',
      listId,
      user.id
    )) as { id: number; user_id: number; name: string; created_at: string } | undefined;

    if (!list) {
      return NextResponse.json(
        { message: 'Shopping list not found' },
        { status: 404 }
      );
    }

    const items = (await db.all(
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
      items: items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
      })),
    });
  } catch (error: unknown) {
    console.error('Get shopping list error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const listId = parseInt(id, 10);
    if (Number.isNaN(listId)) {
      return NextResponse.json(
        { message: 'Invalid list ID' },
        { status: 400 }
      );
    }

    const existing = (await db.get(
      'SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?',
      listId,
      user.id
    )) as { id: number } | undefined;

    if (!existing) {
      return NextResponse.json(
        { message: 'Shopping list not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { items } = body as {
      items?: Array<{ id?: number; name: string; quantity: number; unit: string; purchased?: number }>;
    };

    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id != null) {
          await db.run(
            'UPDATE shopping_list_items SET name = ?, quantity = ?, unit = ?, purchased = ? WHERE id = ? AND shopping_list_id = ?',
            String(item.name || '').trim(),
            typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0,
            String(item.unit || '').trim(),
            item.purchased != null ? (item.purchased ? 1 : 0) : 0,
            item.id,
            listId
          );
        } else {
          const itemName = String(item.name || '').trim();
          if (!itemName) continue;
          await db.run(
            'INSERT INTO shopping_list_items (shopping_list_id, name, quantity, unit, purchased) VALUES (?, ?, ?, ?, ?)',
            listId,
            itemName,
            typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0,
            String(item.unit || '').trim(),
            item.purchased ? 1 : 0
          );
        }
      }
    }

    const list = (await db.get(
      'SELECT id, user_id, name, created_at FROM shopping_lists WHERE id = ?',
      listId
    )) as { id: number; user_id: number; name: string; created_at: string };

    const updatedItems = (await db.all(
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
      items: updatedItems.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
      })),
    });
  } catch (error: unknown) {
    console.error('Update shopping list error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update shopping list' },
      { status: 500 }
    );
  }
}
