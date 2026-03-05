import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { getUnitMergeKey } from '@/lib/units';
import { parseQuantityToNumberOrZero } from '@/lib/ingredient-parser';

export async function POST(
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
      'SELECT id, user_id FROM shopping_lists WHERE id = ? AND user_id = ?',
      listId,
      user.id
    )) as { id: number; user_id: number } | undefined;

    if (!list) {
      return NextResponse.json(
        { message: 'Shopping list not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { purchasedOnly = true } = body as { purchasedOnly?: boolean };

    const items = (await db.all(
      'SELECT id, name, quantity, unit FROM shopping_list_items WHERE shopping_list_id = ?',
      listId
    )) as { id: number; name: string; quantity: number; unit: string }[];

    const toAdd = purchasedOnly
      ? (await db.all(
          'SELECT id, name, quantity, unit FROM shopping_list_items WHERE shopping_list_id = ? AND purchased = 1',
          listId
        )) as { id: number; name: string; quantity: number; unit: string }[]
      : items;

    const existingItems = (await db.all(
      'SELECT id, name, quantity, unit FROM inventory WHERE user_id = ?',
      user.id
    )) as { id: number; name: string; quantity: number; unit: string }[];

    const added: { name: string; quantity: number; unit: string }[] = [];

    for (const item of toAdd) {
      const name = String(item.name || '').trim();
      if (!name) continue;

      const quantity = parseQuantityToNumberOrZero(item.quantity);
      const unit = String(item.unit || '').trim();
      const incomingMergeKey = getUnitMergeKey(unit);

      const existing = existingItems.find(
        (e) =>
          e.name.toLowerCase() === name.toLowerCase() &&
          getUnitMergeKey(e.unit) === incomingMergeKey
      );

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        await db.run(
          'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          newQuantity,
          existing.id,
          user.id
        );
        const idx = existingItems.findIndex((e) => e.id === existing.id);
        if (idx >= 0) existingItems[idx].quantity = newQuantity;
      } else {
        await db.run(
          'INSERT INTO inventory (user_id, name, quantity, unit) VALUES (?, ?, ?, ?)',
          user.id,
          name,
          quantity,
          unit
        );
        const row = (await db.get(
          'SELECT id, name, quantity, unit FROM inventory WHERE user_id = ? ORDER BY id DESC LIMIT 1',
          user.id
        )) as { id: number; name: string; quantity: number; unit: string };
        existingItems.push(row);
      }
      added.push({ name, quantity, unit });

      await db.run('DELETE FROM shopping_list_items WHERE id = ?', item.id);
    }

    const remainingItems = (await db.all(
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

    const listRow = (await db.get(
      'SELECT id, user_id, name, created_at FROM shopping_lists WHERE id = ?',
      listId
    )) as { id: number; user_id: number; name: string; created_at: string };

    return NextResponse.json({
      added,
      list: {
        ...listRow,
        items: remainingItems.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
        })),
      },
    });
  } catch (error: unknown) {
    console.error('Add to inventory error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to add to inventory' },
      { status: 500 }
    );
  }
}
